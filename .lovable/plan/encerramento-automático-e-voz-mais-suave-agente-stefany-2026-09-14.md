# Encerramento automático e voz mais suave (agente Stefany)

## O que muda para você

No formulário do agente entram dois blocos novos:

1. **Encerrar a ligação sozinho**
   - Chave liga/desliga: "Encerrar a ligação automaticamente ao concluir o objetivo".
   - Campo "Frase de despedida" (ex.: "Obrigada pelo seu tempo, tenha um ótimo dia!").
   - Campo numérico "Encerrar após X segundos de silêncio" (padrão 8).

2. **Ajuste da voz (sua voz clonada)**
   - Três controles deslizantes: **Estabilidade**, **Semelhança com a sua voz** e **Expressividade**.
   - Um botão "Voz suave e humanizada" que já aplica os valores recomendados para o que você pediu (menos dura, mais emoção): estabilidade 0,40 / semelhança 0,80 / expressividade 0,45, velocidade 0,95.
   - A velocidade da fala continua onde está hoje.

O ID da sua voz clonada continua sendo usado normalmente — esses ajustes só mudam **como** ela é falada, não trocam a voz.

## Instruções da Stefany

As instruções do agente ganham um trecho de encerramento no modelo de exemplo, orientando a assistente a se despedir e encerrar assim que o objetivo for cumprido ou a pessoa não tiver interesse. Isso é o que faz o agente "saber" a hora de parar; a chave acima é o que faz o sistema realmente desligar.

## Banco de dados

Novas colunas em `agentes`:

- `encerrar_automaticamente` (sim/não, padrão sim)
- `frase_despedida` (texto)
- `silencio_para_encerrar_segundos` (inteiro, padrão 8)
- `voz_estabilidade`, `voz_similaridade`, `voz_estilo` (números 0–1, padrões 0.40 / 0.80 / 0.45)

As regras de acesso atuais (cada usuário só vê os próprios agentes) continuam valendo.

## Parte técnica

- Uma migração adiciona as colunas acima com valores padrão, sem apagar nada.
- `src/routes/_authenticated/app.agentes_.$id.tsx`: novos campos no formulário, incluídos no payload de insert/update.
- `src/lib/agentes.ts`: preset `VOZ_SUAVE_HUMANIZADA`, texto de despedida padrão e bloco de encerramento no `MODELO_PERSONA_EXEMPLO`.
- `src/routes/_authenticated/app.agentes.tsx`: card do agente mostra se o encerramento automático está ativo.
- Nenhuma mudança na Edge Function `iniciar-campanha` nem nas telas de campanhas/relatórios.

## Importante sobre o servidor de voz

O desligamento real da chamada e o envio desses parâmetros ao ElevenLabs acontecem no servidor de voz externo (Railway), que não faz parte deste projeto. Depois de aprovado, o painel passa a gravar essas configurações no agente e eu te entrego a lista exata de campos que o servidor precisa ler (`encerrar_automaticamente`, `frase_despedida`, `silencio_para_encerrar_segundos`, `voz_estabilidade`, `voz_similaridade`, `voz_estilo`) para aplicar no Twilio e no ElevenLabs.
