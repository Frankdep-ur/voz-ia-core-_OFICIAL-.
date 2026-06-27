export const STATUS_CONTATO = ["novo", "ligado", "convertido", "nao_atender"] as const;
export type StatusContato = (typeof STATUS_CONTATO)[number];

export const STATUS_LABEL: Record<StatusContato, string> = {
  novo: "Novo",
  ligado: "Ligado",
  convertido: "Convertido",
  nao_atender: "Não atender",
};

export function validarE164(tel: string): boolean {
  return /^\+[1-9]\d{6,14}$/.test(tel.trim());
}

export type LinhaCSV = { nome: string; telefone: string; email: string; tags: string };

// Parser simples de CSV com suporte a aspas
export function parseCSV(text: string): LinhaCSV[] {
  const rows: string[][] = [];
  let cur = "";
  let row: string[] = [];
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          cur += '"';
          i++;
        } else inQuotes = false;
      } else cur += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ",") {
        row.push(cur);
        cur = "";
      } else if (c === "\n" || c === "\r") {
        if (cur.length || row.length) {
          row.push(cur);
          rows.push(row);
          row = [];
          cur = "";
        }
        if (c === "\r" && text[i + 1] === "\n") i++;
      } else cur += c;
    }
  }
  if (cur.length || row.length) {
    row.push(cur);
    rows.push(row);
  }
  if (rows.length === 0) return [];
  // descarta cabeçalho
  return rows.slice(1).map((r) => ({
    nome: (r[0] ?? "").trim(),
    telefone: (r[1] ?? "").trim(),
    email: (r[2] ?? "").trim(),
    tags: (r[3] ?? "").trim(),
  }));
}

export function gerarCSVModelo(): string {
  return "nome,telefone,email,tags\nJoão Silva,+5511999999999,joao@exemplo.com,cliente vip\n";
}
