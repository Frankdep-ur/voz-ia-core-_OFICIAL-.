
# VozIA — Base (Auth + Banco)

Montar apenas a fundação: Lovable Cloud (Supabase), autenticação por e-mail/senha em português, schema completo com RLS, e uma tela inicial mínima pós-login. Sem outras telas, sem emojis, suporte a tema claro/escuro.

## 1. Backend — Lovable Cloud

Ativar Lovable Cloud (cria um projeto Supabase novo automaticamente).

### Migration de schema

Enum:
- `app_status_contato`: novo, ligado, convertido, nao_atender
- `app_status_campanha`: rascunho, agendada, em_andamento, pausada, concluida
- `app_status_campanha_contato`: na_fila, ligando, atendida, sem_resposta, concluida, falhou
- `app_sentimento`: positivo, neutro, negativo

Tabelas (todas em `public`, com GRANT para `authenticated` + `service_role`, RLS ligado, políticas `user_id = auth.uid()` para SELECT/INSERT/UPDATE/DELETE):

- `profiles` — id uuid PK (= auth.users.id), nome text, empresa text, criado_em timestamptz default now(). Políticas usam `id = auth.uid()`.
- `contatos` — id uuid PK, user_id uuid not null, nome text, telefone text (E.164), email text, tags text, observacoes text, status app_status_contato default 'novo', criado_em timestamptz default now().
- `agentes` — id uuid PK, user_id uuid not null, nome text, persona_prompt text, voz_id text, idioma text default 'pt-BR', velocidade_fala numeric default 1, criado_em timestamptz default now().
- `campanhas` — id uuid PK, user_id uuid not null, nome text, agente_id uuid FK→agentes(id), status app_status_campanha default 'rascunho', agendada_para timestamptz, max_tentativas int default 2, criado_em timestamptz default now().
- `campanha_contatos` — id uuid PK, campanha_id uuid FK→campanhas(id) on delete cascade, contato_id uuid FK→contatos(id) on delete cascade, status app_status_campanha_contato default 'na_fila', tentativas int default 0, atualizado_em timestamptz default now(). RLS via EXISTS na campanha do usuário.
- `ligacoes` — id uuid PK, user_id uuid not null, campanha_id uuid FK, contato_id uuid FK, status text, duracao_segundos int, twilio_call_sid text, gravacao_url text, transcricao text, resultado text, sentimento app_sentimento, iniciada_em timestamptz, finalizada_em timestamptz.

### Trigger de novo usuário

Função `handle_new_user()` security definer + trigger `on_auth_user_created` em `auth.users` que faz `INSERT INTO public.profiles (id) VALUES (NEW.id)`.

## 2. Frontend

Rotas TanStack Start:
- `/auth` (pública) — formulário único com abas "Entrar" / "Cadastrar"; usa `supabase.auth.signInWithPassword` e `signUp` com `emailRedirectTo: window.location.origin`. Textos em pt-BR. Toasts de erro/sucesso.
- `/_authenticated/route.tsx` — gate gerenciado pela integração (já existe ou será criado).
- `/_authenticated/index.tsx` — tela inicial mínima: título "VozIA", nome/e-mail do usuário (lido de `profiles` + `auth.user`), botão "Sair" que faz `supabase.auth.signOut()` e redireciona para `/auth`.
- `/` (index público) — redireciona para `/auth` ou `/app` conforme sessão.

Tema claro/escuro: provider simples com toggle persistido em `localStorage` (classe `dark` no `<html>`), botão de alternância no header da tela inicial.

Sem outras páginas, sem componentes de campanhas/contatos/agentes ainda.

## 3. Entrega

Ao final: lista das tabelas criadas, confirmação do trigger, e instrução para testar cadastro + login. Não conectarei Twilio/ElevenLabs nesta etapa.
