export type Sentimento = "positivo" | "neutro" | "negativo";

export const SENTIMENTO_LABEL: Record<Sentimento, string> = {
  positivo: "Positivo",
  neutro: "Neutro",
  negativo: "Negativo",
};

export function sentimentoBadgeClass(s: Sentimento | null | undefined): string {
  if (s === "positivo")
    return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-transparent";
  if (s === "negativo")
    return "bg-red-500/15 text-red-700 dark:text-red-300 border-transparent";
  return "bg-muted text-muted-foreground border-transparent";
}

export function formatDuracao(segundos: number | null | undefined): string {
  if (segundos == null || isNaN(segundos)) return "—";
  const m = Math.floor(segundos / 60);
  const s = Math.floor(segundos % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

const dtf = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatDataHora(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return dtf.format(new Date(iso)).replace(",", "");
  } catch {
    return "—";
  }
}

export type FalaChat = { speaker: string; text: string; side: "left" | "right" };

export function parseTranscricaoChat(texto: string | null | undefined): FalaChat[] {
  if (!texto) return [];
  const linhas = texto.split(/\r?\n/);
  const falas: { speaker: string; text: string }[] = [];
  const re = /^\s*([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ0-9 _-]{0,40}):\s*(.*)$/;
  for (const linha of linhas) {
    const m = linha.match(re);
    if (m) {
      falas.push({ speaker: m[1].trim(), text: m[2] });
    } else if (falas.length > 0) {
      falas[falas.length - 1].text += "\n" + linha;
    } else if (linha.trim()) {
      falas.push({ speaker: "", text: linha });
    }
  }
  if (falas.length === 0) return [];
  const primeiro = falas.find((f) => f.speaker)?.speaker ?? "";
  return falas.map((f) => ({
    speaker: f.speaker,
    text: f.text.trim(),
    side: f.speaker === primeiro ? "right" : "left",
  }));
}

export const TRANSCRICAO_EXEMPLO = `Stefany: Olá, tudo bem? Aqui é a Stefany Coqueiro da Ford Manutenções. Estou ligando pra confirmar como foi seu atendimento ontem. Você tem um minutinho?
Cliente: Tenho sim, pode falar.
Stefany: Que ótimo! Você poderia me dar uma nota de 1 a 10 sobre o atendimento que recebeu ontem na manutenção do seu carro? Isso ajuda muito a gente.
Cliente: Pode ser nota 9. Foi bem rápido e o pessoal foi atencioso.
Stefany: Muito obrigada! Sua opinião é muito importante pra gente. Tenha um ótimo dia!
Cliente: Obrigado, tchau.`;
