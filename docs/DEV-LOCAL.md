# LearnUP — Desenvolvimento local com Ollama/Qwen

Guia para rodar o bot no Telegram usando **Ollama** (Qwen ou outro modelo) na sua máquina, com o servidor Next.js local.

---

## Pré-requisitos

- [Ollama](https://ollama.com) instalado
- [ngrok](https://ngrok.com) — para expor localhost ao Telegram
- Node.js 18+

---

## Como instalar e usar o ngrok (Windows)

### 1. Baixar o ngrok

1. Acesse [ngrok.com](https://ngrok.com) e crie uma conta gratuita
2. Vá em [Dashboard > Your Authtoken](https://dashboard.ngrok.com/get-started/your-authtoken)
3. Baixe o ngrok para Windows: [ngrok.com/download](https://ngrok.com/download)
4. Extraia o `ngrok.exe` para uma pasta (ex: `C:\ngrok` ou na pasta do projeto)

### 2. Configurar o authtoken (uma vez só)

```powershell
# Na pasta onde está o ngrok.exe
.\ngrok config add-authtoken SEU_TOKEN_AQUI
```

O token está em: [dashboard.ngrok.com/get-started/your-authtoken](https://dashboard.ngrok.com/get-started/your-authtoken)

### 3. Iniciar o túnel

```powershell
ngrok http 3000
```

**Importante:** O ngrok fica rodando e mostra uma tela. **Não feche essa janela.**

Na tela aparecerá algo como:

```
Forwarding   https://a1b2c3d4-e5f6-7890-abcd-ef1234567890.ngrok-free.app -> http://localhost:3000
```

**Copie a URL HTTPS** (a parte antes de `->`). Essa URL muda toda vez que você inicia o ngrok (plano gratuito).

### ⚠️ Problema: ngrok gratuito bloqueia o Telegram

O plano gratuito do ngrok exibe uma página de aviso que **impede** as requisições do Telegram de chegarem ao seu servidor. Por isso, mensagens enviadas no bot podem não gerar resposta.

**Solução recomendada:** use **Cloudflare Tunnel (cloudflared)** em vez do ngrok — é gratuito e não tem esse bloqueio.

---

## Alternativa: Cloudflare Tunnel (cloudflared) — recomendado para Telegram

O cloudflared não bloqueia requisições de bots como o Telegram.

### 1. Instalar o cloudflared (Windows)

Baixe em: [developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation)

Ou via winget:
```powershell
winget install Cloudflare.cloudflared
```

### 2. Iniciar o túnel

```powershell
cloudflared tunnel --url http://localhost:3000
```

Copie a URL `https://xxx.trycloudflare.com` que aparecer.

### 3. Configurar o webhook

```powershell
npm run webhook:local -- https://SUA_URL.trycloudflare.com
```

---

## Passo 1: Iniciar o Ollama

```powershell
# Baixar o modelo (se ainda não tiver)
ollama pull qwen2.5:7b

# Ou modelo menor para máquinas com pouca RAM
ollama pull qwen2.5:1.5b

# O Ollama inicia automaticamente. Verifique:
ollama list
```

O Ollama roda em `http://localhost:11434` por padrão.

---

## Passo 2: Configurar o .env para usar Ollama

Crie ou edite `.env` (ou `.env.local`):

```env
# Forçar Ollama mesmo se GROQ_API_KEY existir
USE_OLLAMA=true

# Ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen2.5:7b

# Comente ou remova GROQ_API_KEY para usar Ollama por padrão
# GROQ_API_KEY=...
```

**Ou**, se preferir não alterar o `.env`, rode o servidor com:

```powershell
$env:USE_OLLAMA="true"; npm run dev
```

---

## Passo 3: Iniciar o túnel (ngrok)

Em **outro terminal** (deixe rodando, não feche):

```powershell
ngrok http 3000
```

Copie a URL HTTPS que aparecer (ex: `https://a1b2c3d4-xx-xx.ngrok-free.app`). **Não use "abc123"** — é só exemplo; sua URL será diferente.

---

## Passo 4: Configurar o webhook do Telegram

Com o ngrok **rodando** e o Next.js **rodando**, em um **terceiro terminal**:

```powershell
cd C:\LMM-proj\LearnUP
npm run webhook:local -- https://SUA_URL_DO_NGROK
```

Exemplo real: `npm run webhook:local -- https://a1b2c3d4-e5f6-7890.ngrok-free.app`

---

## Passo 5: Iniciar o servidor Next.js

```powershell
npm run dev
```

O app estará em `http://localhost:3000`. O ngrok encaminha as requisições do Telegram para cá.

---

## Resumo da ordem (4 terminais)

| # | Terminal | Comando | Observação |
|---|----------|---------|------------|
| 1 | 1 | `ollama run qwen2.5:7b` | Deixe rodando |
| 2 | 2 | `ngrok http 3000` | Deixe rodando; copie a URL HTTPS |
| 3 | 3 | `npm run dev` | Deixe rodando |
| 4 | 4 | `npm run webhook:local -- https://URL_COPIADA` | Use a URL do ngrok do terminal 2 |

---

## Testar

1. Abra o bot no Telegram
2. Envie `/frase` ou `/status`
3. O bot deve responder usando o Ollama local

---

## Restaurar webhook para produção

Após terminar o desenvolvimento local, aponte o webhook de volta para a Vercel:

```powershell
npx tsx -e "
require('dotenv').config();
const { setWebhook } = require('./src/lib/telegram');
setWebhook('https://SEU_APP.vercel.app/api/webhook').then(ok => {
  console.log(ok ? 'Webhook restaurado' : 'Erro');
});
"
```

Ou use a URL da sua Vercel no `setWebhook`.

---

## Troubleshooting

| Problema | Solução |
|----------|---------|
| "ngrok não é reconhecido" | Adicione a pasta do ngrok ao PATH ou use `.\ngrok http 3000` na pasta onde está o .exe |
| ngrok fecha logo ao abrir | Rode pelo terminal: `ngrok http 3000` — ele deve ficar aberto mostrando a URL |
| Bot não responde no Telegram | 1) ngrok rodando? 2) `npm run dev` rodando? 3) Webhook configurado com a URL correta? Rode `npm run webhook:check` |
| "Tente novamente em alguns minutos" | Verifique se o Ollama está rodando: `curl http://localhost:11434/api/tags` |
| Modelo lento | Use `qwen2.5:1.5b` em vez de 7b |
| USE_OLLAMA não funciona | Certifique-se de que `USE_OLLAMA=true` está no `.env` |
