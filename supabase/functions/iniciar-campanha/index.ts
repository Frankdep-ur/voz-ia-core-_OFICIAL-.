// Edge Function: iniciar-campanha
// Recebe { campanha_id }, reseta o estado da campanha (contatos -> na_fila,
// campanha -> rascunho) e tenta acionar o servidor de voz.
// Todas as respostas de erro incluem o detalhe real do erro.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

function pgErr(e: { message?: string; details?: string | null; hint?: string | null; code?: string | null }) {
  return {
    message: e?.message ?? "Erro desconhecido",
    details: e?.details ?? null,
    hint: e?.hint ?? null,
    code: e?.code ?? null,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json(405, { error: "Método não permitido", method: req.method });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_PUBLISHABLE_KEY =
    Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ??
    Deno.env.get("SUPABASE_ANON_KEY");
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    const faltando = [
      !SUPABASE_URL && "SUPABASE_URL",
      !SUPABASE_PUBLISHABLE_KEY && "SUPABASE_PUBLISHABLE_KEY/SUPABASE_ANON_KEY",
    ].filter(Boolean);
    return json(500, {
      error: "Configuração do Supabase ausente",
      faltando,
    });
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader) {
    return json(401, { error: "Não autenticado", detail: "Header Authorization ausente" });
  }

  let body: { campanha_id?: string };
  try {
    body = await req.json();
  } catch (e) {
    return json(400, {
      error: "Corpo inválido",
      detail: (e as Error).message,
    });
  }
  const campanha_id = body?.campanha_id;
  if (!campanha_id || typeof campanha_id !== "string") {
    return json(400, {
      error: "campanha_id é obrigatório",
      detail: `Recebido: ${JSON.stringify(body)}`,
    });
  }

  // Cliente como o usuário (RLS valida posse)
  const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: campanha, error: errCamp } = await supabase
    .from("campanhas")
    .select("id, status")
    .eq("id", campanha_id)
    .maybeSingle();

  if (errCamp) {
    return json(500, { error: "Falha ao carregar campanha", ...pgErr(errCamp) });
  }
  if (!campanha) {
    return json(404, { error: "Campanha não encontrada", campanha_id });
  }

  // Reset: voltar contatos para 'na_fila' e campanha para 'rascunho'
  const { error: errResetCC } = await supabase
    .from("campanha_contatos")
    .update({ status: "na_fila", tentativas: 0, atualizado_em: new Date().toISOString() })
    .eq("campanha_id", campanha_id);
  if (errResetCC) {
    return json(500, {
      error: "Falha ao resetar campanha_contatos",
      ...pgErr(errResetCC),
    });
  }

  const { error: errResetCamp } = await supabase
    .from("campanhas")
    .update({ status: "rascunho" })
    .eq("id", campanha_id);
  if (errResetCamp) {
    return json(500, {
      error: "Falha ao resetar status da campanha",
      ...pgErr(errResetCamp),
    });
  }

  const { count, error: errCount } = await supabase
    .from("campanha_contatos")
    .select("id", { count: "exact", head: true })
    .eq("campanha_id", campanha_id)
    .eq("status", "na_fila");

  if (errCount) {
    return json(500, { error: "Falha ao contar contatos na fila", ...pgErr(errCount) });
  }
  if (!count || count === 0) {
    return json(200, {
      started: false,
      message:
        "Esta campanha não tem contatos na fila. Adicione contatos antes de iniciar.",
    });
  }

  const VOICE_BACKEND_URL = Deno.env.get("VOICE_BACKEND_URL");
  const VOICE_BACKEND_SECRET = Deno.env.get("VOICE_BACKEND_SECRET");

  if (!VOICE_BACKEND_URL || !VOICE_BACKEND_SECRET) {
    const faltando = [
      !VOICE_BACKEND_URL && "VOICE_BACKEND_URL",
      !VOICE_BACKEND_SECRET && "VOICE_BACKEND_SECRET",
    ].filter(Boolean);
    return json(200, {
      started: false,
      message:
        "O servidor de voz ainda não está conectado. A campanha está pronta e os contatos estão na fila.",
      detail: { faltando },
    });
  }

  try {
    const resp = await fetch(`${VOICE_BACKEND_URL}/campanhas/iniciar`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${VOICE_BACKEND_SECRET}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ campanha_id }),
    });
    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      return json(200, {
        started: false,
        message: `Servidor de voz retornou ${resp.status} ${resp.statusText}`,
        detail: {
          status: resp.status,
          statusText: resp.statusText,
          body: text,
          url: `${VOICE_BACKEND_URL}/campanhas/iniciar`,
        },
      });
    }
  } catch (e) {
    const err = e as Error;
    return json(200, {
      started: false,
      message: `Falha ao contatar o servidor de voz: ${err.message}`,
      detail: { message: err.message, stack: err.stack ?? null },
    });
  }

  const { error: errUpd } = await supabase
    .from("campanhas")
    .update({ status: "em_andamento" })
    .eq("id", campanha_id);
  if (errUpd) {
    return json(500, {
      error: "Falha ao atualizar status para em_andamento",
      ...pgErr(errUpd),
    });
  }

  return json(200, { started: true });
});
