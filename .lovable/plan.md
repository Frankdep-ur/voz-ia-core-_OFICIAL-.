## Objetivo
Adicionar navegação lateral persistente para área autenticada e construir a tela de Contatos completa (CRUD + busca + filtro + importação CSV).

## 1. Layout com menu lateral

**`src/routes/_authenticated/route.tsx`** — transformar em layout com `SidebarProvider` + `AppSidebar` + `<Outlet />`. Mantém o `beforeLoad` atual.

**`src/components/app-sidebar.tsx`** (novo) — usa `@/components/ui/sidebar` (shadcn já instalado).
- Topo: "VozIA"
- Itens (com `Link` do TanStack e `isActive` via `useRouterState`):
  - Início → `/app`
  - Contatos → `/app/contatos`
  - Agentes → `/app/agentes`
  - Campanhas → `/app/campanhas`
  - Relatórios → `/app/relatorios`
- Rodapé: e-mail do usuário (via `supabase.auth.getUser`) + botão "Sair" + toggle de tema
- `collapsible="icon"` para colapsar

**`src/routes/_authenticated/app.tsx`** — simplificar: remover header próprio (agora vem do layout), manter conteúdo "Olá, [nome] / e-mail / texto introdutório".

## 2. Páginas "Em breve"
- `src/routes/_authenticated/app.agentes.tsx`
- `src/routes/_authenticated/app.campanhas.tsx`
- `src/routes/_authenticated/app.relatorios.tsx`

Cada uma: título + texto "Em breve".

## 3. Tela de Contatos

**`src/routes/_authenticated/app.contatos.tsx`** — página principal:
- Header: título "Contatos", botões "Baixar modelo CSV", "Importar CSV" (input file oculto), "Novo contato"
- Campo de busca (input com ícone) + Select de status (Todos / novo / ligado / convertido / nao_atender)
- Tabela (shadcn `Table`) com colunas Nome, Telefone, E-mail, Tags, Status, Ações (editar/excluir)
- Estado vazio amigável quando não há contatos
- Carregamento via `useQuery` (TanStack Query já configurado), filtros aplicados client-side
- Exclusão com `AlertDialog` de confirmação

**`src/components/contatos/contato-form-dialog.tsx`** (novo) — Dialog com formulário:
- Campos: Nome, Telefone, E-mail, Tags, Observações, Status (Select, default "novo")
- Validação com Zod: telefone regex `^\+[1-9]\d{6,14}$` (E.164). Erro inline.
- Modo criar e editar (recebe `contato?` opcional)
- Salva via `supabase.from("contatos").insert/update`

**`src/lib/contatos.ts`** (novo) — helpers:
- `validarE164(tel)` 
- `parseCSV(file)` → linhas { nome, telefone, email, tags }
- `gerarCSVModelo()` → string CSV com cabeçalho e linha de exemplo
- `STATUS_CONTATO_OPCOES` constante

**Importar CSV**:
- Parser simples (split por linha/vírgula respeitando aspas) — sem dependência nova
- Para cada linha valida E.164; insere válidas em lote via `supabase.from("contatos").insert([...])` com `user_id`; conta ignoradas
- Toast final: "X contatos importados, Y ignorados por telefone inválido"

**Baixar modelo CSV**: gera Blob e dispara download via `<a download>`.

## 4. Considerações técnicas
- Todas as queries usam o `supabase` client do browser — RLS já garante filtro por `user_id`. No insert, preencher `user_id` com `auth.uid()` do cliente (necessário pelas policies `WITH CHECK`).
- Tudo pt-BR, sem emojis, suporta tema claro/escuro via tokens do design system.
- Rotas seguem convenção `app.contatos.tsx` (filho da rota `/_authenticated/app`). Como `app.tsx` atualmente é uma folha (sem `<Outlet />`), vou converter: criar `app.tsx` como layout com `<Outlet />` e mover o conteúdo "Olá" para `app.index.tsx`. Assim `/app` continua sendo a tela inicial e `/app/contatos`, `/app/agentes` etc. funcionam.

Espera confirmação?
