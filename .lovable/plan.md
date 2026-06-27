## Objetivo
Cadastrar os dois segredos do backend usados pela Edge Function `iniciar-campanha`. Nenhuma alteração de código: a função já faz POST em `${VOICE_BACKEND_URL}/campanhas/iniciar` com `Authorization: Bearer ${VOICE_BACKEND_SECRET}`, corpo `{ campanha_id }`, e atualiza o status para `em_andamento` quando a resposta é OK.

## Passos

1. **Salvar `VOICE_BACKEND_URL`** (valor público) via `set_secret`:
   - `VOICE_BACKEND_URL = https://vozia-motor-de-voz-production.up.railway.app`

2. **Solicitar `VOICE_BACKEND_SECRET`** via `add_secret`:
   - Abre um formulário seguro para você colar o valor.
   - Fica disponível apenas no backend como `Deno.env.get("VOICE_BACKEND_SECRET")`.
   - Nunca vai pro frontend, código, logs nem `.env` do repo.

3. **Confirmar comportamento** (sem editar código): reler `supabase/functions/iniciar-campanha/index.ts` para validar que o fluxo POST → Bearer → update status já está correto e relatar.

## Onde colocar o segredo com segurança
Somente no formulário aberto pelo `add_secret` no passo 2. Não cole o valor no chat, em arquivos do projeto, no frontend nem em `.env` versionado.
