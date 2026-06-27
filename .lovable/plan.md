## Objetivo
Permitir reexecutar uma campanha já iniciada e expor erros reais nas respostas da Edge Function `iniciar-campanha`.

## Mudanças em `supabase/functions/iniciar-campanha/index.ts`

1. **Reset antes de contar a fila**
   - Após validar `campanha_id` e carregar a campanha (mantém leitura de `id, status`), executar dois updates via cliente autenticado (RLS garante posse):
     - `UPDATE campanha_contatos SET status = 'na_fila', tentativas = 0, atualizado_em = now() WHERE campanha_id = :id` — devolve todos os contatos (atendida/sem_resposta/concluida/falhou/ligando) para a fila.
     - `UPDATE campanhas SET status = 'rascunho' WHERE id = :id` — volta a campanha ao status inicial (mesmo de antes de iniciar). Observação: o schema não guarda o "status anterior real" de cada campanha; usamos `rascunho` como o estado inicial canônico definido pelo default da coluna. Se algum dos updates falhar, retornar o erro real (ver item 2).
   - Só depois, contar `campanha_contatos` com `status = 'na_fila'` e seguir o fluxo atual (chamar `VOICE_BACKEND_URL`, marcar `em_andamento` no sucesso).

2. **Erros reais em todas as respostas**
   - Toda resposta de erro passa a incluir o detalhe real (mensagem, status upstream, corpo retornado, stack quando aplicável) em vez de strings genéricas. Pontos afetados:
     - Configuração ausente do Supabase: incluir quais envs faltam.
     - Falta de `Authorization`: manter 401 com mensagem clara.
     - JSON inválido no corpo: incluir a mensagem do `catch`.
     - `campanha_id` ausente/ inválido: descrever o que veio.
     - Erros do Supabase (`errCamp`, novos updates de reset, `errCount`, `errUpd`): retornar `error.message`, `error.details`, `error.hint`, `error.code`.
     - Backend de voz indisponível (env faltando): listar quais.
     - `fetch` para `${VOICE_BACKEND_URL}/campanhas/iniciar` falhando: retornar `status`, `statusText` e corpo bruto recebido.
     - `catch` do `fetch`: retornar `message` e `stack`.
   - Manter o padrão atual de devolver 200 com `{ started: false, message, detail }` para falhas "de negócio" (sem contatos, upstream com erro), e usar status HTTP de erro (4xx/5xx) somente para falhas de plataforma — sempre com payload detalhado.

3. **Sem mudanças** em schema, RLS, frontend ou outros arquivos.

## Validação
- Deploy da function.
- Rodar uma campanha já concluída/pausada e confirmar:
  - `campanha_contatos` voltam para `na_fila` com `tentativas = 0`.
  - `campanhas.status` volta para `rascunho` e depois para `em_andamento` quando o upstream aceita.
  - Forçar erro (ex.: secret inválido) e confirmar que o toast no frontend mostra o detalhe real.
