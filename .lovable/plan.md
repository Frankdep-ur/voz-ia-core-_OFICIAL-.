## Objetivo
Transformar a Início num dashboard alimentado por `ligacoes`/`campanhas`, adicionar a coluna `nota`, refletir essa coluna em Relatórios, e substituir o botão de exemplo por gerar/limpar lote.

## 1. Migração de banco
- `ALTER TABLE public.ligacoes ADD COLUMN IF NOT EXISTS nota integer;`
- `ALTER TABLE public.ligacoes ADD CONSTRAINT ligacoes_nota_range CHECK (nota IS NULL OR (nota BETWEEN 1 AND 10));`
- RLS já cobre por `user_id = auth.uid()`; nenhum policy novo.

## 2. Instalar dependência
- `bun add recharts` (gráfico de barras + distribuição de sentimento).

## 3. Helpers — `src/lib/ligacoes.ts` (extensão)
- Exportar `formatNota(n)` → "8,5" (pt-BR, 1 casa) ou `"—"`.
- Exportar `gerarLoteExemplo({ contatos, campanhas, userId })` retornando array de inserts com:
  - 12 ligações distribuídas aleatoriamente nos últimos 7 dias (timestamp aleatório por dia).
  - ~80% `atendida`, resto `sem_resposta` (sem duração/nota/sentimento).
  - Atendidas: `duracao_segundos` 25-90; `nota` 6-10 maioria, com 1-2 entradas forçadas em 3-5; sentimento derivado (`>=8` positivo, `6-7` neutro, `<=5` negativo).
  - `resultado` curto baseado na nota (templates).
  - `transcricao` = `TRANSCRICAO_EXEMPLO`.
  - `contato_id`/`campanha_id` escolhidos round-robin entre os existentes do usuário.

## 4. Tela Início — `src/routes/_authenticated/app.index.tsx` (reescrever)
- Header: "Olá, {nome|email}" + subtítulo "Visão geral das suas ligações."
- Query única `["dashboard-ligacoes"]` em `ligacoes` (campos: `id, status, duracao_segundos, sentimento, nota, iniciada_em, contato_id`, com join `contatos(nome)`), ordenada por `iniciada_em desc`. `refetchInterval: 15000`. Subscribe realtime em `ligacoes` filtrado por `user_id`.
- Cálculos client-side (volumes pequenos):
  - `hoje`: filtra por data local igual a hoje.
  - `total`: length.
  - `taxaAtendimento`: atendidas/total * 100 (0 se total=0).
  - `duracaoMedia`: média de `duracao_segundos` das atendidas → `formatDuracao`.
  - `notaMedia`: média de `nota` não-nulas, 1 casa, ou "—".
  - `pctPositivo`: positivos / (positivos+neutros+negativos) * 100.
- Grid de 6 cards (Card/CardHeader/CardContent) com label e número grande.
- Card "Ligações por dia (últimos 7 dias)": BarChart recharts. Eixo X: últimos 7 dias `dd/MM` (gerados em loop, inclui dias com 0). Bar `count`. Cor via token CSS — usar `hsl(var(--primary))`.
- Card "Sentimento das ligações": 3 barras horizontais simples (positivo/neutro/negativo) com contagem e barra proporcional (`div` largura % usando classes tematizadas verde/cinza/vermelho, mesmas usadas em `sentimentoBadgeClass`). Mantém o tema claro/escuro.
- Card "Últimas ligações": tabela compacta com 5 linhas (Contato, Nota via `formatNota`, badge de Sentimento, Data via `formatDataHora`). Link "Ver todas" (`<Link to="/app/relatorios">`).
- Estado vazio: se 0 ligações, mostrar mensagem amigável ("Você ainda não tem ligações. Crie uma campanha e use o botão de exemplo para visualizar o dashboard.") e ainda renderizar os cards zerados.

## 5. Relatórios — `src/routes/_authenticated/app.relatorios.tsx`
- Adicionar `nota` ao `select` da query.
- Tipo `Ligacao` recebe `nota: number | null`.
- Tabela: nova coluna "Nota" entre Duração e Sentimento, usando `formatNota`.
- Painel de detalhes: bloco "Nota" antes de "Resultado", exibindo `formatNota(ligacao.nota)`.
- Substituir botão "Inserir ligação de exemplo (teste)" por dois botões em grupo:
  - "Gerar dados de exemplo (teste)" → busca todos contatos (`select id`) e campanhas (`select id`) do usuário; se algum vazio, toast de aviso. Caso contrário, monta `gerarLoteExemplo` e faz `supabase.from("ligacoes").insert(lote)`. Toast de sucesso + invalidate.
  - "Limpar ligações de exemplo" → `AlertDialog` de confirmação "Tem certeza? Isso apaga todas as suas ligações." → `delete().eq("user_id", userId)`. Toast + invalidate. Helper acima dos botões: "Botões temporários para testes." (Reaproveitar mesmos botões: também acessíveis pelo dashboard? Não — pedido restringe à tela Relatórios.)

## 6. Notas técnicas
- Sem alterações em sidebar, contatos, agentes, campanhas, auth.
- Tema preservado (sem hex hardcoded; usar tokens `hsl(var(--primary))`, `bg-muted`, `text-muted-foreground`, classes verde/cinza/vermelho já adotadas em `sentimentoBadgeClass`).
- Tudo em pt-BR, sem emojis.
- Não criar server function — operações simples com cliente do navegador respeitando RLS.
- Confirmar ao final que dashboard mostra cards/gráfico/sentimento/últimas e que "Gerar dados de exemplo" popula tudo.
