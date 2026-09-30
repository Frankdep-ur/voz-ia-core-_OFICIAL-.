import {
  formatDataHora,
  formatDuracao,
  rotuloStatusLigacao,
  type Sentimento,
} from "./ligacoes";

export type LigacaoExport = {
  id: string;
  status: string | null;
  duracao_segundos: number | null;
  sentimento: Sentimento | null;
  nota: number | null;
  resultado: string | null;
  gravacao_url: string | null;
  iniciada_em: string | null;
  finalizada_em: string | null;
  contatos: { nome: string | null; telefone: string | null } | null;
  campanhas: { nome: string | null } | null;
};

export type GrupoExport = "atendidas" | "convertidas" | "sem_sucesso" | "filtradas" | "todas";

export const GRUPO_LABEL: Record<GrupoExport, string> = {
  atendidas: "Atendidas",
  convertidas: "Convertidas",
  sem_sucesso: "Não deram certo",
  filtradas: "Resultado dos filtros atuais",
  todas: "Todas as ligações",
};

const STATUS_ATENDIDA = ["atendida", "concluida", "concluído", "concluido"];
const STATUS_SEM_SUCESSO = [
  "sem_resposta",
  "erro",
  "falhou",
  "caixa_postal",
  "recado_operadora",
  "nao_atendida",
  "descartado",
];

function norm(s: string | null | undefined): string {
  return (s ?? "").trim().toLowerCase();
}

export function foiAtendida(l: LigacaoExport): boolean {
  return STATUS_ATENDIDA.includes(norm(l.status));
}

export function foiConvertida(l: LigacaoExport): boolean {
  if (!foiAtendida(l)) return false;
  if (l.sentimento === "positivo") return true;
  return l.nota != null && l.nota >= 7;
}

export function naoDeuCerto(l: LigacaoExport): boolean {
  if (STATUS_SEM_SUCESSO.includes(norm(l.status))) return true;
  return foiAtendida(l) && l.sentimento === "negativo";
}

export function filtrarGrupo<T extends LigacaoExport>(ligacoes: T[], grupo: GrupoExport): T[] {
  if (grupo === "atendidas") return ligacoes.filter(foiAtendida);
  if (grupo === "convertidas") return ligacoes.filter(foiConvertida);
  if (grupo === "sem_sucesso") return ligacoes.filter(naoDeuCerto);
  return ligacoes;
}

function celula(valor: unknown): string {
  const texto = valor == null ? "" : String(valor);
  const limpo = texto.replace(/\r?\n/g, " ").replace(/"/g, '""');
  return `"${limpo}"`;
}

const CABECALHO = [
  "Data",
  "Contato",
  "Telefone",
  "Campanha",
  "Status",
  "Resultado",
  "Duracao",
  "Duracao (segundos)",
  "Sentimento",
  "Nota",
  "Gravacao",
];

export function gerarCsv(ligacoes: LigacaoExport[]): string {
  const linhas = [CABECALHO.map(celula).join(";")];
  for (const l of ligacoes) {
    linhas.push(
      [
        formatDataHora(l.iniciada_em),
        l.contatos?.nome ?? "",
        l.contatos?.telefone ?? "",
        l.campanhas?.nome ?? "",
        rotuloStatusLigacao(l.status),
        l.resultado ?? "",
        formatDuracao(l.duracao_segundos),
        l.duracao_segundos ?? "",
        l.sentimento ?? "",
        l.nota ?? "",
        l.gravacao_url ?? "",
      ]
        .map(celula)
        .join(";"),
    );
  }
  return linhas.join("\r\n");
}

export function baixarCsv(nomeArquivo: string, conteudo: string) {
  const blob = new Blob(["\uFEFF" + conteudo], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nomeArquivo;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function nomeArquivoExport(grupo: GrupoExport): string {
  const d = new Date();
  const data = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return `vozia-ligacoes-${grupo}-${data}.csv`;
}
