export const STATUS_CAMPANHA = [
  "rascunho",
  "agendada",
  "em_andamento",
  "pausada",
  "concluida",
] as const;
export type StatusCampanha = (typeof STATUS_CAMPANHA)[number];

export const STATUS_CAMPANHA_LABEL: Record<StatusCampanha, string> = {
  rascunho: "Rascunho",
  agendada: "Agendada",
  em_andamento: "Em andamento",
  pausada: "Pausada",
  concluida: "Concluída",
};

export const STATUS_CAMPANHA_CONTATO = [
  "na_fila",
  "ligando",
  "atendida",
  "sem_resposta",
  "concluida",
  "falhou",
] as const;
export type StatusCampanhaContato = (typeof STATUS_CAMPANHA_CONTATO)[number];

export const STATUS_CAMPANHA_CONTATO_LABEL: Record<StatusCampanhaContato, string> = {
  na_fila: "Na fila",
  ligando: "Ligando",
  atendida: "Atendida",
  sem_resposta: "Sem resposta",
  concluida: "Concluída",
  falhou: "Falhou",
};

export function proximaAcao(
  status: StatusCampanha,
): "iniciar" | "pausar" | null {
  if (status === "em_andamento") return "pausar";
  if (status === "rascunho" || status === "agendada" || status === "pausada") return "iniciar";
  return null;
}

export function formatarDataHora(iso: string | null | undefined): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

export function extrairTags(tagsTexto: string | null | undefined): string[] {
  if (!tagsTexto) return [];
  return tagsTexto
    .split(/[,;]+/)
    .map((t) => t.trim())
    .filter(Boolean);
}
