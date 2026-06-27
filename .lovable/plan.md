## Objetivo
Construir a tela "Campanhas" completa (lista, criação, detalhes) e a Edge Function `iniciar-campanha` preparada para o servidor de voz, mantendo RLS e tudo em pt-BR.

## 1. Constantes — `src/lib/campanhas.ts` (novo)
- `STATUS_CAMPANHA` + labels: `rascunho`, `agendada`, `em_andamento`, `pausada`, `concluida`.
- `STATUS_CAMPANHA_CONTATO` + labels: `na_fila`, `ligando`, `atendida`, `sem_resposta`, `concluida`, `falhou`.
- Helper `proximaAcao(status)` → retorna `"iniciar" | "pausar" | null` para decidir o botão na lista.

## 2. Lista — `src/routes/_authenticated/app.campanhas.tsx` (substitui "Em breve")
- Header com título/subtítulo + botão "Nova campanha". Antes de navegar, verifica se o usuário tem agentes via query; se não tiver, abre `AlertDialog` "Crie um agente primeiro" com link para `/app/agentes`.
- `useQuery` em `campanhas` (do usuário, ordenadas por `criado_em desc`) com join para nome do agente (`agentes(nome)`).
- Para cada campanha, segunda query agregando contagem por `status` em `campanha_contatos` (uma chamada `.select("status", { count: ... })` por campanha, ou um único `.select("campanha_id,status")` filtrado pelos ids e agrupado no cliente — usaremos o agrupamento no cliente para evitar N+1).
- Cards mostrando: nome, agente, badge de status, "X de Y atendidas" (atendidas = status `atendida` ou `concluida`), data agendada quando houver.
- Ações por card:
  - "Ver detalhes" → `/app/campanhas/$id`.
  - "Iniciar" (rascunho/agendada/pausada) → chama edge function `iniciar-campanha` via `supabase.functions.invoke` com `{ campanha_id }`. Mostra toast com a mensagem retornada; invalida a query.
  - "Pausar" (em_andamento) → `update` direto na tabela para `status='pausada'`.
  - Excluir → `AlertDialog` "Tem certeza?" → delete (cascata em `campanha_contatos` via FK existente, se houver; caso contrário, deletar `campanha_contatos` antes — verificaremos o schema; se não houver `ON DELETE CASCADE` adiciono via migração).
- Empty state com CTA.

## 3. Criação — `src/routes/_authenticated/app.campanhas_.nova.tsx` (novo)
Formulário react-hook-form + zod com seções:
1. **Nome** (input obrigatório).
2. **Agente** (`Select` com agentes do usuário; obrigatório).
3. **Contatos** — `Tabs` com duas abas:
   - "Por tag": `Select` populado com tags únicas extraídas de `contatos.tags` (split por vírgula/espaço). Ao escolher, marca automaticamente os contatos correspondentes.
   - "Manual": `Input` de busca + lista virtualizada simples com `Checkbox` por contato (nome + telefone). Estado de seleção é compartilhado entre as duas abas (a tag apenas pré-marca; o usuário ainda pode ajustar).
   - Contador "X contatos selecionados" sempre visível; bloqueia salvar se 0.
4. **Quando ligar** — `RadioGroup`: "Iniciar agora" ou "Agendar para" (revela datepicker shadcn + input de hora). Salvo em `agendada_para`.
5. **Máximo de tentativas** — `Input type=number`, padrão 2, min 1.

Botões "Cancelar" e "Salvar campanha". Ao salvar:
- `insert` em `campanhas` com `status = agendada_para no futuro ? 'agendada' : 'rascunho'`, `user_id = auth.uid()`.
- Em seguida, `insert` em lote em `campanha_contatos` (uma linha por contato, `status='na_fila'`, `tentativas=0`).
- Toast + navega para `/app/campanhas/$id`.

## 4. Detalhes — `src/routes/_authenticated/app.campanhas_.$id.tsx` (novo)
- `useQuery` em `campanhas` (com `agentes(nome, voz_id, idioma)`) por id.
- `useQuery` em `campanha_contatos` com join `contatos(nome, telefone)` por `campanha_id`, ordenada por nome.
- Cabeçalho com nome, status, agente, data agendada, max_tentativas, e botões "Iniciar"/"Pausar" (mesma lógica do item 2) + "Voltar".
- Cards de resumo: total, na_fila, ligando, atendidas, falhas.
- Tabela: Nome, Telefone, Status individual (badge), Tentativas.
- **Realtime**: `useEffect` que registra `supabase.channel("campanha-"+id).on("postgres_changes", { table: "campanha_contatos", filter: "campanha_id=eq."+id }, ...)` e invalida a query. Fallback: `refetchInterval: 10000` na query — funciona mesmo se o realtime estiver desativado para a tabela.
- Migração separada para habilitar realtime: `ALTER PUBLICATION supabase_realtime ADD TABLE public.campanha_contatos, public.campanhas`.

## 5. Edge Function — `supabase/functions/iniciar-campanha/index.ts` (novo)
- `verify_jwt = true` (default) para garantir que veio do usuário logado.
- Lê `Authorization` do request, cria cliente Supabase com a chave anon + esse token para checar a campanha sob RLS.
- Passos:
  1. Valida body `{ campanha_id: string }`.
  2. `select` em `campanhas` por id — se RLS bloquear, retorna 404/403.
  3. Garante que existe pelo menos uma linha `na_fila` em `campanha_contatos` para essa campanha; se zero, retorna mensagem específica.
  4. Lê `Deno.env.get("VOICE_BACKEND_URL")` e `VOICE_BACKEND_SECRET`.
  5. Se ambas preenchidas: `fetch` POST para `${URL}/campanhas/iniciar` com header `Authorization: Bearer ${SECRET}` e body `{ campanha_id }`. Se 2xx, `update` `status='em_andamento'` e retorna `{ started: true }`.
  6. Se vazias (caso atual): retorna `{ started: false, message: "O servidor de voz ainda não está conectado. A campanha está pronta e os contatos estão na fila. As ligações começarão quando o servidor for ligado na fase final do projeto." }` SEM mudar status.
- CORS headers padrão para invocação do browser.
- Frontend trata `data.started` para escolher tipo de toast (success vs info) e exibe `data.message` quando presente.

## 6. Migrações
- (se necessário) `ALTER TABLE public.campanha_contatos ADD CONSTRAINT ... FOREIGN KEY (campanha_id) REFERENCES public.campanhas(id) ON DELETE CASCADE` — só se a FK atual não tiver cascata. Mesma checagem para `contato_id` (manter `ON DELETE CASCADE` ou `RESTRICT` conforme já está).
- `ALTER PUBLICATION supabase_realtime ADD TABLE public.campanha_contatos, public.campanhas` + `ALTER TABLE ... REPLICA IDENTITY FULL` nessas duas tabelas.
- Sem novas tabelas; RLS já está em todas.

## 7. Notas técnicas
- Nada de chamada direta a servidor externo no frontend — só `supabase.functions.invoke('iniciar-campanha', { body: { campanha_id } })`.
- Tema claro/escuro respeitando tokens existentes; sem emojis.
- Reaproveita `Badge`, `Card`, `Table`, `AlertDialog`, `Tabs`, `Checkbox`, `Slider/Input`, `Calendar+Popover` (já no projeto).
- Observação: para lógica interna o padrão moderno seria `createServerFn`, mas o pedido especifica explicitamente uma Edge Function chamada `iniciar-campanha` (faz sentido aqui porque o servidor de voz externo provavelmente vai chamar a mesma função ou compartilhar segredos), então vou seguir com Edge Function como pedido.
