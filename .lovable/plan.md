## Objetivo

Remover o bloqueio de "senha fraca" que está impedindo o cadastro/login, tornando a entrada mais fácil durante o desenvolvimento.

## O que será feito

1. **Desativar a verificação HIBP (Have I Been Pwned)** no backend de autenticação. É essa checagem que retorna a mensagem "Password is known to be weak and easy to guess". Com ela desligada, o usuário pode usar senhas simples como `123456`.

2. **Manter o mínimo de 6 caracteres** no formulário de cadastro (limite mínimo do Supabase Auth). Não é possível ir abaixo disso.

3. **Confirmação automática de e-mail**: ativar o auto-confirm para que, ao se cadastrar, o usuário entre direto sem precisar abrir link de confirmação no e-mail. Isso acelera muito os testes.

## Detalhes técnicos

- Chamada `supabase--configure_auth` com:
  - `password_hibp_enabled: false` (libera senhas fracas)
  - `auto_confirm_email: true` (pula confirmação por e-mail)
  - `disable_signup: false` (mantém cadastro aberto)
  - `external_anonymous_users_enabled: false`

Nenhuma alteração de código no frontend é necessária.

## Observação de segurança

Senhas fracas e auto-confirmação são adequadas para a fase de desenvolvimento. Antes de publicar para usuários reais, recomendo reativar a verificação HIBP e a confirmação por e-mail.
