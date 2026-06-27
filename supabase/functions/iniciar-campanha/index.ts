// Edge Function: iniciar-campanha
// Recebe { campanha_id } e tenta acionar o servidor de voz.
// Se VOICE_BACKEND_URL e VOICE_BACKEND_SECRET não estiverem configuradas,
// não muda o status e retorna uma mensagem amigável.

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json(405, { error: "Método não permitido" });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_PUBLISHABLE_KEY =
    Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ??
    Deno.env.get("SUPABASE_ANON_KEY");
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    return json(500, { error: "Configuração do Supabase ausente" });
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader) {
    return json(401, { error: "Não autenticado" });
  }

  let body: { campanha_id?: string };
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "Corpo inválido" });
  }
  const campanha_id = body?.campanha_id;
  if (!campanha_id || typeof campanha_id !== "string") {
    return json(400, { error: "campanha_id é obrigatório" });
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

  if (errCamp) return json(500, { error: errCamp.message });
  if (!campanha) {
    return json(404, { error: "Campanha não encontrada" });
  }

  const { count, error: errCount } = await supabase
    .from("campanha_contatos")
    .select("id", { count: "exact", head: true })
    .eq("campanha_id", campanha_id)
    .eq("status", "na_fila");

  if (errCount) return json(500, { error: errCount.message });
  if (!count || count === 0) {
    return json(400, {
      started: false,
      message:
        "Esta campanha não tem contatos na fila. Adicione contatos antes de iniciar.",
    });
  }

  const VOICE_BACKEND_URL = Deno.env.get("VOICE_BACKEND_URL");
  const VOICE_BACKEND_SECRET = Deno.env.get("VOICE_BACKEND_SECRET");

  if (!VOICE_BACKEND_URL || !VOICE_BACKEND_SECRET) {
    return json(200, {
      started: false,
      message:
        "O servidor de voz ainda não está conectado. A campanha está pronta e os contatos estão na fila. As ligações começarão quando o servidor for ligado na fase final do projeto.",
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
        message: `Servidor de voz retornou ${resp.status}: ${text}`,
      });
    }
  } catch (e) {
    return json(200, {
      started: false,
      message: `Falha ao contatar o servidor de voz: ${(e as Error).message}`,
    });
  }

  const { error: errUpd } = await supabase
    .from("campanhas")
    .update({ status: "em_andamento" })
    .eq("id", campanha_id);
  if (errUpd) {
    return json(500, { error: errUpd.message });
  }

  return json(200, { started: true });
});
