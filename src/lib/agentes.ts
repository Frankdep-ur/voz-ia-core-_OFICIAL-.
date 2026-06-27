export const VOZES_OPCOES = [
  { id: "feminina_calorosa", label: "Feminina — calorosa (recomendada)" },
  { id: "feminina_jovem", label: "Feminina — jovem e animada" },
  { id: "masculina_profissional", label: "Masculina — profissional" },
  { id: "masculina_grave", label: "Masculina — grave e calmo" },
] as const;

export type VozId = (typeof VOZES_OPCOES)[number]["id"];

export const IDIOMAS_OPCOES = [
  { id: "pt-BR", label: "Português (Brasil)" },
  { id: "pt-PT", label: "Português (Portugal)" },
  { id: "en-US", label: "Inglês (EUA)" },
] as const;

export type IdiomaId = (typeof IDIOMAS_OPCOES)[number]["id"];

export function rotuloVoz(voz_id: string | null | undefined): string {
  if (!voz_id) return "—";
  const encontrado = VOZES_OPCOES.find((v) => v.id === voz_id);
  return encontrado ? encontrado.label : voz_id;
}

export function rotuloIdioma(idioma: string | null | undefined): string {
  if (!idioma) return "—";
  const encontrado = IDIOMAS_OPCOES.find((i) => i.id === idioma);
  return encontrado ? encontrado.label : idioma;
}

export const SAUDACAO_PLACEHOLDER =
  "Oi, tudo bem? Aqui é a Ana, da Clínica Sorriso. Estou ligando pra confirmar sua consulta de amanhã. Você tem um minutinho?";

export const MODELO_PERSONA_EXEMPLO = `Você é a [NOME], assistente virtual da empresa [EMPRESA]. Você está ligando para [NOME DO CONTATO].

OBJETIVO: [descreva em uma frase o que você quer nesta ligação — ex: confirmar uma consulta, oferecer um produto, fazer uma pesquisa].

COMO FALAR:
- Fale em português do Brasil, de forma natural, calorosa e educada.
- Use frases curtas, uma ideia de cada vez. Nada de textão.
- Faça pausas e deixe a pessoa responder; se não entender, peça pra repetir com gentileza.

REGRAS:
- Nunca diga que é uma inteligência artificial, a não ser que perguntem diretamente.
- Se a pessoa não tiver interesse ou pedir pra não ligar mais, respeite na hora, peça desculpas pelo incômodo e encerre.
- Não invente informações. Se não souber, diga que vai verificar.
- Mantenha o foco no objetivo, sem ser insistente.

ENCERRAMENTO: agradeça pelo tempo e se despeça de forma simpática.`;
