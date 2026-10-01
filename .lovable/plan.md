# Análise da estrutura — resultado e próximos ajustes

## Situação verificada agora
- Compilação: OK, sem erros na tela.
- Novos status (Não atendeu, Descartado): reconhecidos no painel, nos badges, no resumo da campanha, nos relatórios e na planilha.
- Banco: fila de campanhas com 69 na fila, 23 concluídas, 25 com falha, 184 sem resposta. Ligações: 472 sem resposta, 25 atendidas. Campanhas: 2 concluídas, 2 pausadas.
- Os novos valores ainda não aparecem nos dados: o servidor de voz ainda não grava "nao_atendida" nem "descartado".

## Pontos de atenção (não alterados)
1. Ao iniciar de novo, a campanha devolve TODOS para a fila (inclusive quem não atendeu). Ajuste sugerido: retomar só quem está na fila.
2. Erro 502 quando o servidor de voz está acordando. Ajuste sugerido: tentar de novo sozinho 2 vezes com 4s de espera.
3. Botão "Limpar ligações de exemplo" apaga todas as ligações. Ajuste sugerido: renomear para "Limpar todas as ligações".
4. Mensagens de erro mostram detalhes técnicos internos. Ajuste sugerido: mensagem clara e segura.
5. Gravações não são salvas (depende do servidor de voz).

## Se aprovado, implemento os itens 1 a 4
- Item 1 e 2: função de início de campanha.
- Item 3: tela de Relatórios (só o texto).
- Item 4: função de início, mantendo o detalhe no registro interno.
