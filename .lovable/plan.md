## Objetivo
Construir a tela "Agentes" completa (listagem + criar/editar) substituindo o placeholder atual, e adicionar a coluna `saudacao_inicial` na tabela `agentes`.

## 1. Migração de banco
Adicionar coluna `saudacao_inicial text` em `public.agentes`. RLS permanece (já está `agentes_all_own`). Sem outras mudanças.

## 2. Constantes compartilhadas — `src/lib/agentes.ts` (novo)
- `VOZES_OPCOES`: array com `{ id, label }`:
  - `feminina_calorosa` — "Feminina — calorosa (recomendada)"
  - `feminina_jovem` — "Feminina — jovem e animada"
  - `masculina_profissional` — "Masculina — profissional"
  - `masculina_grave` — "Masculina — grave e calmo"
- `IDIOMAS_OPCOES`: `pt-BR` (padrão), `pt-PT`, `en-US` com labels.
- `MODELO_PERSONA_EXEMPLO`: string exata fornecida pelo usuário.
- `SAUDACAO_PLACEHOLDER`: exemplo "Oi, tudo bem? Aqui é a Ana...".

## 3. Tela de listagem — `src/routes/_authenticated/app.agentes.tsx` (substitui "Em breve")
- Header: título "Agentes", subtítulo "Crie a personalidade e a voz da sua IA nas ligações." + botão "Novo agente" → navega para `/app/agentes/novo`.
- `useQuery` lendo `supabase.from("agentes").select("*").eq("user_id", uid).order("criado_em", { ascending: false })`.
- Grid de cards (shadcn `Card`): nome, trecho da persona (clamp ~2 linhas), label da voz (resolvido via `VOZES_OPCOES`), label do idioma. Botões editar (→ `/app/agentes/$id`) e excluir (AlertDialog "Tem certeza?").
- Estado vazio: mensagem amigável + botão "Criar primeiro agente".

## 4. Formulário — `src/routes/_authenticated/app.agentes_.$id.tsx` (rota com `_` para não ficar aninhada em layout do listagem)
- Path: `/app/agentes/novo` e `/app/agentes/<uuid>` no mesmo arquivo, distinguindo via `params.id === "novo"`.
- Campos (react-hook-form + zod):
  1. **Nome** (input, obrigatório, placeholder "Ana - Confirmação de consultas").
  2. **Saudação inicial** (`Textarea` curto, ~3 linhas) com placeholder do exemplo e helper "É a primeira frase que a pessoa ouve quando atende a ligação."
  3. **Personalidade e instruções** (`Textarea` grande, min-h ~360px) com card de dica ao lado explicando o que escrever (quem é, objetivo, tom, regras, o que fazer se não houver interesse). Botão "Usar modelo de exemplo" preenche com `MODELO_PERSONA_EXEMPLO` exato.
  4. **Voz** (`Select` com `VOZES_OPCOES`, salva em `voz_id`) + input opcional "ID da voz do ElevenLabs (opcional)" — se preenchido, sobrescreve `voz_id` ao salvar. Aviso: "As vozes reais do ElevenLabs serão conectadas na fase do servidor. Por enquanto, escolha o estilo desejado."
  5. **Idioma** (`Select`, padrão `pt-BR`).
  6. **Velocidade da fala** (`Slider` 0.7–1.2, step 0.05, padrão 1.0) com valor numérico ao lado.
- Botões: "Cancelar" (volta a `/app/agentes`) e "Salvar agente".
- Modo edição: carrega via `useQuery` por `id`, popula `defaultValues` e usa `update`; modo novo usa `insert` com `user_id = auth.uid()`.
- Após salvar: toast + navegar para `/app/agentes` e invalidar query.

## 5. Notas técnicas
- Tudo em pt-BR, sem emojis, tema claro/escuro respeitando tokens.
- Sidebar já tem item "Agentes" — sem mudanças nele.
- Velocidade salva como número (coluna `velocidade_fala numeric`).
- Persona/saudação podem ficar nullable no DB; a UI valida nome obrigatório e persona não-vazia.

## Pergunta antes de implementar
Confirma que o campo "ID da voz do ElevenLabs (opcional)", quando preenchido, deve **sobrescrever** o `voz_id` do dropdown ao salvar (já que ambos usam a mesma coluna `voz_id`)? Ou prefere que eu apenas guarde a escolha do dropdown e ignore esse campo extra por enquanto (até a fase do servidor)?
