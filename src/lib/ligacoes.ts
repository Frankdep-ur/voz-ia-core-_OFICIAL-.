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

export function formatNota(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return "—";
  return n.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

export type LigacaoInsert = {
  user_id: string;
  contato_id: string;
  campanha_id: string;
  status: string;
  duracao_segundos: number | null;
  nota: number | null;
  sentimento: Sentimento | null;
  resultado: string | null;
  transcricao: string | null;
  gravacao_url: null;
  iniciada_em: string;
  finalizada_em: string | null;
};

function pick<T>(arr: T[], i: number): T {
  return arr[i % arr.length];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function resultadoParaNota(nota: number | null, status: string): string | null {
  if (status === "sem_resposta") return "Cliente não atendeu.";
  if (nota == null) return null;
  if (nota >= 9) return `Cliente deu nota ${nota}. Elogiou a rapidez e a atenção do atendimento.`;
  if (nota >= 8) return `Cliente deu nota ${nota}. Avaliação positiva, mencionou satisfação com o serviço.`;
  if (nota >= 6) return `Cliente deu nota ${nota}. Avaliação neutra, sem comentários adicionais.`;
  return `Cliente deu nota ${nota}. Reclamou da demora e disse que esperava mais.`;
}

export function gerarLoteExemplo(params: {
  userId: string;
  contatosIds: string[];
  campanhasIds: string[];
  quantidade?: number;
}): LigacaoInsert[] {
  const { userId, contatosIds, campanhasIds } = params;
  const quantidade = params.quantidade ?? 12;
  const agora = Date.now();
  const seteDias = 7 * 24 * 60 * 60 * 1000;
  const lote: LigacaoInsert[] = [];

  // forçar 2 negativas (nota 3-5)
  const indicesNegativos = new Set<number>([2, 7]);

  for (let i = 0; i < quantidade; i++) {
    const ts = new Date(agora - Math.floor(Math.random() * seteDias));
    const iniciada_em = ts.toISOString();
    const semResposta = Math.random() < 0.2;
    if (semResposta) {
      lote.push({
        user_id: userId,
        contato_id: pick(contatosIds, i),
        campanha_id: pick(campanhasIds, i),
        status: "sem_resposta",
        duracao_segundos: null,
        nota: null,
        sentimento: null,
        resultado: "Cliente não atendeu.",
        transcricao: null,
        gravacao_url: null,
        iniciada_em,
        finalizada_em: iniciada_em,
      });
      continue;
    }
    const nota = indicesNegativos.has(i) ? randomInt(3, 5) : randomInt(6, 10);
    let sentimento: Sentimento;
    if (nota >= 8) sentimento = "positivo";
    else if (nota >= 6) sentimento = "neutro";
    else sentimento = "negativo";
    const duracao = randomInt(25, 90);
    lote.push({
      user_id: userId,
      contato_id: pick(contatosIds, i),
      campanha_id: pick(campanhasIds, i),
      status: "atendida",
      duracao_segundos: duracao,
      nota,
      sentimento,
      resultado: resultadoParaNota(nota, "atendida"),
      transcricao: TRANSCRICAO_EXEMPLO,
      gravacao_url: null,
      iniciada_em,
      finalizada_em: new Date(ts.getTime() + duracao * 1000).toISOString(),
    });
  }
  return lote;
}
