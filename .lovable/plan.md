## Objetivo
Construir a tela "Relatórios" (substituindo "Em breve") com listagem de ligações, filtros, painel de detalhes com transcrição em estilo chat, atualização realtime e botão temporário para inserir ligação de exemplo. Manter RLS e pt-BR.

## 1. Migração — realtime para `ligacoes`
- `ALTER TABLE public.ligacoes REPLICA IDENTITY FULL;`
- `ALTER PUBLICATION supabase_realtime ADD TABLE public.ligacoes;`
- Sem mudanças de schema; RLS já cobre `user_id = auth.uid()`.

## 2. Helpers — `src/lib/ligacoes.ts` (novo)
- `formatDuracao(segundos)` → "m:ss".
- `formatDataHora(iso)` → "dd/mm/aaaa HH:mm" (pt-BR via `Intl.DateTimeFormat`).
- `SENTIMENTO_LABEL` + helper `sentimentoBadgeVariant(sentimento)` retornando classes Tailwind (verde/cinza/vermelho) usando tokens semânticos.
- `parseTranscricaoChat(texto)` → array `{ speaker: string; text: string; side: "left" | "right" }`. Detecta padrão `Nome: fala` por linha; a primeira voz encontrada vira `right` (assistente), demais `left` (cliente). Linhas sem `Nome:` agrupam na fala anterior preservando quebras.

## 3. Tela — `src/routes/_authenticated/app.relatorios.tsx` (substitui o stub)
Estrutura:
- Header: título "Relatórios", subtítulo, botão pequeno (variant `outline`, `size="sm"`) "Inserir ligação de exemplo (teste)" alinhado à direita.
- Barra de filtros (4 controles em flex-wrap):
  1. Busca por nome/telefone (`Input` controlado).
  2. `Select` Campanha (lista as campanhas do usuário + "Todas").
  3. `Select` Status (Todos + valores distintos vindos das ligações).
  4. `Select` Sentimento (Todos / positivo / neutro / negativo).
- Tabela com colunas: Contato, Telefone, Campanha, Status, Duração, Sentimento (Badge colorido), Data. Linha inteira clicável (`cursor-pointer`) abre o painel.
- Empty state quando `data.length === 0` sem filtros aplicados.
- Realtime: `supabase.channel("relatorios-ligacoes").on("postgres_changes", { schema:"public", table:"ligacoes", filter:`user_id=eq.${userId}` }, ...)` invalida a query. Fallback `refetchInterval: 10000`.

### Query de ligações
```ts
supabase
  .from("ligacoes")
  .select(`
    id, status, duracao_segundos, sentimento, resultado,
    transcricao, gravacao_url, iniciada_em, finalizada_em,
    campanha_id, contato_id,
    contatos:contato_id ( nome, telefone ),
    campanhas:campanha_id ( nome )
  `)
  .order("iniciada_em", { ascending: false, nullsFirst: false });
```
Filtros aplicados client-side (volumes pequenos).

## 4. Painel de detalhes
- Componente `LigacaoDetalheSheet` usando `Sheet` (lado direito, `sm:max-w-xl`). Recebe a ligação selecionada e `onOpenChange`.
- Topo: nome do contato, telefone, campanha, data, duração, status, badge de sentimento.
- Bloco "Resultado": texto em `p` com `whitespace-pre-line`.
- Bloco "Gravação": `<audio controls src={gravacao_url} className="w-full">` ou fallback "Gravação não disponível ainda."
- Bloco "Transcrição": container scrollável. Para cada item de `parseTranscricaoChat`:
  - Bolha estilo chat (`max-w-[80%]`, padding, `rounded-2xl`).
  - `side === "right"` → `ml-auto bg-primary text-primary-foreground`; `side === "left"` → `mr-auto bg-muted`.
  - Nome do falante em texto pequeno acima da bolha.
  - Se a transcrição não casar com o padrão `Nome:`, exibe bloco único com `whitespace-pre-line`.

## 5. Botão "Inserir ligação de exemplo (teste)"
- Mutação que:
  1. Busca o primeiro `contato` do usuário (`select id`, `limit 1`).
  2. Busca a primeira `campanha` (`select id`, `limit 1`).
  3. Se faltar contato ou campanha → toast de aviso "Crie um contato e uma campanha primeiro para inserir uma ligação de exemplo."
  4. Caso contrário, `insert` em `ligacoes` com:
     - `user_id`: do usuário logado
     - `contato_id`, `campanha_id`
     - `status: "atendida"`, `duracao_segundos: 47`
     - `sentimento: "positivo"`, `resultado: <texto pedido>`
     - `gravacao_url: null`
     - `iniciada_em: new Date().toISOString()`
     - `transcricao`: string multilinha exata do pedido
  5. Toast de sucesso + `queryClient.invalidateQueries`.
- Sem mudanças nas demais telas.

## 6. Notas técnicas
- Selo de sentimento usa classes tematizadas: `bg-emerald-500/15 text-emerald-700 dark:text-emerald-300`, `bg-muted text-muted-foreground`, `bg-red-500/15 text-red-700 dark:text-red-300` (mantém suporte ao tema claro/escuro).
- Tipos: o select com joins gera arrays — desembrulhar com `Array.isArray(c.contatos) ? c.contatos[0] : c.contatos`.
- Sem emojis. Todo texto em pt-BR.
- Sem alterações em `campanhas`, `contatos`, `agentes`, sidebar ou rotas existentes além da substituição de `app.relatorios.tsx`.
