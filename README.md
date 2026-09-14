# Frank IA Discador Inteligente

Crie um aplicativo web chamado "VozIA — Discador Inteligente". Por enquanto vamos 

montar só a BASE: autenticação + banco de dados. As telas viremos depois.

Stack: React + Tailwind. Backend: Supabase (quando você pedir pra conectar o Supabase, 

vou conectar um projeto novo).

IDIOMA: toda a interface em português do Brasil. Sem emojis. Tema claro e escuro.

AUTENTICAÇÃO:

- Tela de cadastro e de login por e-mail e senha (Supabase Auth).

- Depois de logar, mostrar uma tela inicial simples contendo só: o título "VozIA", 

  o nome/e-mail do usuário logado e um botão "Sair". Vamos preencher essa tela depois.

- Cada usuário só pode enxergar os próprios dados: habilite Row Level Security (RLS) 

  em TODAS as tabelas, com políticas que filtram por user_id = auth.uid().

BANCO DE DADOS — crie estas tabelas no Supabase:

- profiles: id (igual ao id do usuário do auth), nome, empresa, criado_em.

- contatos: id, user_id, nome, telefone (formato E.164, ex +5511999999999), email, 

  tags (texto), observacoes, status (novo/ligado/convertido/nao_atender), criado_em.

- agentes: id, user_id, nome, persona_prompt (texto longo — personalidade e objetivo 

  da IA na ligação), voz_id (id da voz no ElevenLabs), idioma (default 'pt-BR'), 

  velocidade_fala (número, default 1), criado_em.

- campanhas: id, user_id, nome, agente_id (FK para agentes), status 

  (rascunho/agendada/em_andamento/pausada/concluida, default 'rascunho'), 

  agendada_para (timestamp), max_tentativas (inteiro, default 2), criado_em.

- campanha_contatos: id, campanha_id (FK), contato_id (FK), status 

  (na_fila/ligando/atendida/sem_resposta/concluida/falhou, default 'na_fila'), 

  tentativas (inteiro, default 0), atualizado_em.

- ligacoes: id, user_id, campanha_id (FK), contato_id (FK), status, 

  duracao_segundos (inteiro), twilio_call_sid, gravacao_url, transcricao (texto), 

  resultado (texto), sentimento (positivo/neutro/negativo), iniciada_em, finalizada_em.

Crie um trigger que, ao cadastrar um novo usuário no auth, insira automaticamente 

uma linha em profiles com o id dele.

Não crie nenhuma outra tela ainda. Quando terminar, me diga quais tabelas foram 

criadas e confirme que o login está funcionando.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://voz-ia-core.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/2bbdb5bd-9d47-4d10-8a57-a1b84bd561ef).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
