const TAMANHO_PAGINA = 1000;

/**
 * Busca todas as linhas de uma consulta do Supabase em páginas de 1.000,
 * contornando o limite de 1.000 linhas por requisição.
 *
 * @param montarConsulta função que retorna a consulta SEM .range (a paginação é aplicada aqui)
 * @returns todas as linhas juntas
 * @throws o primeiro erro encontrado em qualquer página
 */
export async function buscarTodos<T>(montarConsulta: () => any): Promise<T[]> {
  const resultado: T[] = [];
  let de = 0;
  for (;;) {
    const { data, error } = await montarConsulta().range(de, de + TAMANHO_PAGINA - 1);
    if (error) throw error;
    const pagina = (data ?? []) as T[];
    resultado.push(...pagina);
    if (pagina.length < TAMANHO_PAGINA) break;
    de += TAMANHO_PAGINA;
  }
  return resultado;
}
