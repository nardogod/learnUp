# LearnUP — Passo a passo de configuração

## 1. Neon (banco de dados) — ✅ Já configurado

Você já tem o Neon configurado. O `.env` contém `DATABASE_URL` e `DIRECT_URL`.

- **Console:** [console.neon.tech](https://console.neon.tech)
- **Backups:** Em *Project Settings > Backups* configure a retenção desejada.

---

## 2. Telegram Bot

### 2.1 Criar o bot

1. Abra o Telegram e busque **@BotFather**
2. Envie `/newbot`
3. Escolha um nome (ex: `LearnUP`)
4. Escolha um username (ex: `LearnUP_Bot` — deve terminar em `_bot`)
5. Copie o **token** retornado (ex: `7123456789:AAH...`)

### 2.2 Configurar no projeto

No `.env` local:

```
TELEGRAM_BOT_TOKEN="7123456789:AAH..."
TELEGRAM_WEBHOOK_SECRET="uma_string_aleatoria_segura"   # ex: openssl rand -hex 32
NEXT_PUBLIC_TELEGRAM_BOT_LINK="https://t.me/veifelipe_bot"
```

---

## 3. Vercel (deploy)

### 3.1 Conectar o repositório

1. Acesse [vercel.com](https://vercel.com) e faça login
2. **Add New > Project**
3. Importe o repositório: [github.com/nardogod/learnUp](https://github.com/nardogod/learnUp)
4. Confirme o framework: **Next.js** (detectado automaticamente)

### 3.2 Variáveis de ambiente

Em *Settings > Environment Variables*, adicione:

| Nome | Valor | Observação |
|------|-------|------------|
| `DATABASE_URL` | `postgresql://...pooler...` | Connection string do Neon (pooled) |
| `TELEGRAM_BOT_TOKEN` | Token do BotFather | Obrigatório |
| `TELEGRAM_WEBHOOK_SECRET` | String aleatória | Para validar o webhook |
| `OLLAMA_BASE_URL` | URL do Ollama em produção | Ver passo 5 |
| `NEXT_PUBLIC_TELEGRAM_BOT_LINK` | `https://t.me/veifelipe_bot` | Para o botão da landing |
| `CRON_SECRET` | (opcional) | Protege as rotas de cron |

### 3.3 Deploy

Clique em **Deploy**. Após o deploy, anote a URL (ex: `https://learnup-xxx.vercel.app`).

---

## 4. Configurar Webhook do Telegram

Depois que o deploy estiver no ar:

### 4.1 Definir o webhook

Abra no navegador (substitua os valores):

```
https://api.telegram.org/bot<SEU_TOKEN>/setWebhook?url=https://<SUA_URL_VERCEL>/api/webhook
```

Se configurou `TELEGRAM_WEBHOOK_SECRET`, use o método POST:

```bash
curl -X POST "https://api.telegram.org/bot<SEU_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://<SUA_URL_VERCEL>/api/webhook","secret_token":"<TELEGRAM_WEBHOOK_SECRET>"}'
```

### 4.2 Verificar

```
https://api.telegram.org/bot<SEU_TOKEN>/getWebhookInfo
```

Deve retornar a URL configurada.

---

## 5. Ollama (produção)

O Ollama roda localmente. Em produção na Vercel você precisa de um servidor externo.

### Opção A: Servidor próprio (VPS)

1. Contrate um VPS (Railway, Render, Fly.io, DigitalOcean, etc.)
2. Instale o Ollama: `curl -fsSL https://ollama.com/install.sh | sh`
3. Baixe o modelo: `ollama pull qwen2.5:7b`
4. Exponha a API (com autenticação ou em rede privada)
5. Defina `OLLAMA_BASE_URL` na Vercel com a URL pública

### Opção B: Desenvolvimento local

Para testar sem deploy:

1. Instale o Ollama: [ollama.com](https://ollama.com)
2. Execute: `ollama pull qwen2.5:7b`
3. Mantenha `OLLAMA_BASE_URL=http://localhost:11434` no `.env`
4. Use um túnel (ngrok, cloudflared) para expor o webhook localmente:

   ```bash
   ngrok http 3000
   # Use a URL do ngrok no setWebhook
   ```

---

## 6. Cadastrar o primeiro usuário

No terminal, na pasta do projeto:

```bash
npm run register-user
```

Responda às perguntas (nome, email, idiomas, Telegram ID, plano, timezone).

**Como obter o Telegram ID:** use o bot [@userinfobot](https://t.me/userinfobot) no Telegram.

---

## 7. Testar

1. Abra o bot no Telegram
2. Envie `/start` ou qualquer mensagem
3. Se estiver cadastrado, receberá a mensagem de boas-vindas
4. Teste: `palavra nova` → informe a palavra → informe o significado

---

## Resumo da ordem

| # | Etapa | Status |
|---|-------|--------|
| 1 | Neon configurado | ✅ |
| 2 | Criar bot no Telegram (BotFather) | ⬜ |
| 3 | Deploy na Vercel + variáveis de ambiente | ⬜ |
| 4 | Configurar webhook do Telegram | ⬜ |
| 5 | Ollama em produção (ou túnel local) | ⬜ |
| 6 | Cadastrar usuário (`npm run register-user`) | ⬜ |
| 7 | Testar no Telegram | ⬜ |
