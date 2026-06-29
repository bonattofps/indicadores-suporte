# Assistente de IA do SGP com Firebase AI Logic

Esta versao usa Firebase AI Logic com Gemini Developer API, que permite comecar no plano Spark gratuito.
Nao usa Cloud Functions e nao usa chave da OpenAI.

## Ativar no Firebase

1. Abra o Firebase Console:
   https://console.firebase.google.com

2. Entre no projeto:
   `SGP - Sistema Suporte`

3. No menu lateral, abra:
   `AI Services` > `AI Logic`

4. Clique em:
   `Get started`

5. Escolha:
   `Gemini Developer API`

6. Mantenha o projeto no plano:
   `Spark`

7. Conclua o passo a passo do Firebase.

O Firebase vai ativar as APIs necessarias e criar a chave Gemini dentro do projeto. Nao coloque essa chave manualmente no codigo.

## Testar

Abra:

```text
http://localhost:8000/login.html
```

Entre com um usuario liberado e abra uma dashboard. O botao `Assistente SGP` aparece no canto inferior direito.

## Observacoes

- Se aparecer erro de permissao, o AI Logic ainda nao foi ativado no projeto Firebase.
- Se aparecer erro de limite, o limite gratuito do Gemini foi atingido temporariamente.
- Antes de deixar publico para muita gente, o ideal e ativar Firebase App Check para proteger contra abuso.
