// Extrai a mensagem de erro real de uma chamada supabase.functions.invoke.
// Quando a Edge Function responde com status não-2xx, o SDK devolve um
// FunctionsHttpError com o Response original em `context`. Esta função
// tenta ler o corpo JSON e devolver a descrição mais útil possível.

type AnyErr = { message?: string; context?: unknown };

export async function extrairErroEdge(
  err: AnyErr,
  fallback = "Erro inesperado",
): Promise<string> {
  if (!err) return fallback;
  const ctx = (err as { context?: Response }).context;
  if (ctx && typeof (ctx as Response).clone === "function") {
    try {
      const resp = (ctx as Response).clone();
      const text = await resp.text();
      if (text) {
        try {
          const data = JSON.parse(text);
          const partes = [
            data?.message,
            data?.error,
            data?.detail && typeof data.detail === "string" ? data.detail : null,
            data?.detail?.body,
            data?.details,
            data?.hint,
          ].filter(Boolean);
          if (partes.length > 0) return String(partes[0]);
          return text;
        } catch {
          return text;
        }
      }
    } catch {
      // ignora
    }
  }
  return err.message ?? fallback;
}

export function extrairErroResposta(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;
  const partes = [d.message, d.error, d.detail, d.details, d.hint].filter(
    (v) => typeof v === "string" && v.length > 0,
  ) as string[];
  return partes[0] ?? null;
}
