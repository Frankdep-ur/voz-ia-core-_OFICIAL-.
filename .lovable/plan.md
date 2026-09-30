# Exibição dos novos status

## Alterações
- Confirmar os novos valores nos tipos locais do banco, sem criar migrações.
- Adicionar rótulos em português para `nao_atendida` e `descartado` nos contatos de campanha e para `descartado` nos contatos.
- Exibir `nao_atendida` em âmbar e `descartado` em cinza nos badges.
- Acrescentar “Não atendeu” e “Descartados” ao resumo da campanha, mantendo “Falhas” como `falhou + sem_resposta` e usando sete colunas em telas grandes.
- Centralizar os rótulos amigáveis de status de ligação e aplicá-los à tabela, ao detalhe, ao filtro e à exportação CSV.
- Incluir `descartado` no grupo “Não deram certo”.

## Limites
- Nenhuma mudança em banco, migrações, permissões, funções de início ou lógica do discador.
- Nenhuma alteração fora dos arquivos solicitados.

## Validação
- Conferir a compilação automática e validar que os status continuam filtrando pelos valores originais.
