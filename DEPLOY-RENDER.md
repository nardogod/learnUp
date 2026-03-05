# Deploy do LearnUP – Passo a passo

Este guia explica como fazer o deploy completo do LearnUP (app na Vercel + Ollama no Render).

**Plano Free:** 512MB RAM, 750h/mês, dorme após 15 min sem uso (~1 min para acordar). Use modelo `qwen2.5:0.5b`.

---

## Comandos de deploy

```powershell
# 1. Rodar migrações no banco de produção (Neon)
npm run db:migrate:deploy

# 2. Deploy do app na Vercel (via Git ou CLI)
git push origin main
# ou, se usar Vercel CLI:
npm run deploy:vercel

# 3. Atualizar comandos do bot no Telegram (após deploy)
npm run deploy:commands
```

| Comando | Descrição |
|---------|-----------|
| `npm run db:migrate:deploy` | Aplica migrações Prisma no banco de produção |
| `npm run deploy:vercel` | Deploy na Vercel (requer `vercel` instalado) |
| `npm run deploy:commands` | Atualiza o menu de comandos do bot no Telegram |

> **Nota:** O deploy do Ollama no Render é automático via Blueprint ao fazer `git push` para o repositório conectado.

---

## Pré-requisitos

- Conta no [Render](https://render.com) (grátis)
- Repositório do LearnUP no GitHub
- Conta no [GitHub](https://github.com)

---

## Parte 0: Deploy do app (Vercel)

O app Next.js é deployado na Vercel. Conecte o repositório em [vercel.com](https://vercel.com) → **Add New Project** → selecione o repo LearnUP. Cada `git push` dispara um deploy automático.

Variáveis de ambiente necessárias na Vercel:
- `DATABASE_URL` – URL do Neon PostgreSQL
- `TELEGRAM_BOT_TOKEN` – token do bot
- `GROQ_API_KEY` – (recomendado) chave Groq para LLM gratuito
- `OLLAMA_BASE_URL` – (opcional) URL do Ollama no Render, se não usar Groq
- `NLP_API_URL` – (opcional) URL do serviço NLP no Render (spaCy sueco), fallback para regras manuais

---

## Parte 1: Push do código para o GitHub

1. Abra o terminal na pasta do projeto:
   ```powershell
   cd c:\LMM-proj\LearnUP
   ```

2. Se ainda não inicializou o Git:
   ```powershell
   git init
   git add .
   git commit -m "Add Ollama Render config"
   ```

3. Crie um repositório no GitHub (ex: `learnup` ou `LearnUP`).

4. Conecte e faça push:
   ```powershell
   git remote add origin https://github.com/SEU_USUARIO/learnup.git
   git branch -M main
   git push -u origin main
   ```

---

## Parte 2: Deploy no Render

### Opção A: Usando Blueprint (automático)

1. Acesse [dashboard.render.com](https://dashboard.render.com) e faça login.

2. Clique em **New** → **Blueprint**.

3. Conecte o GitHub:
   - Se for a primeira vez, clique em **Connect GitHub** e autorize o Render.
   - Selecione o repositório do LearnUP.

4. O Render vai ler o `render.yaml` e mostrar o serviço `learnup-ollama`.

5. Clique em **Apply** para criar o serviço.

6. Aguarde o deploy (5–15 minutos na primeira vez, por causa do download do modelo).

### Opção B: Configuração manual

1. Acesse [dashboard.render.com](https://dashboard.render.com).

2. Clique em **New** → **Web Service**.

3. Conecte o repositório do LearnUP (se ainda não conectou).

4. Configure:
   - **Name:** `learnup-ollama`
   - **Region:** `Oregon (US West)` ou a mais próxima
   - **Branch:** `main`
   - **Runtime:** `Docker`
   - **Dockerfile Path:** `ollama-render/Dockerfile`
   - **Docker Context:** `ollama-render`

5. Em **Instance Type**, escolha **Free** (512MB RAM).

6. Em **Environment**, adicione:
   | Key | Value |
   |-----|-------|
   | OLLAMA_MODEL | qwen2.5:0.5b |

7. Clique em **Create Web Service**.

---

## Parte 3: Obter a URL

1. Após o deploy, a URL aparece no topo da página do serviço.
2. Formato: `https://learnup-ollama-xxxx.onrender.com`
3. Copie essa URL (sem barra no final).

---

## Parte 4: Configurar a Vercel

1. Acesse [vercel.com](https://vercel.com) e abra o projeto LearnUP.

2. Vá em **Settings** → **Environment Variables**.

3. Adicione ou edite:
   | Key | Value |
   |-----|-------|
   | OLLAMA_BASE_URL | https://learnup-ollama-xxxx.onrender.com |
   | OLLAMA_MODEL | qwen2.5:0.5b |
   | NLP_API_URL | https://learnup-nlp-xxxx.onrender.com |

4. Faça um novo deploy (Deployments → ⋮ → Redeploy).

> **NLP (opcional):** O Blueprint cria o serviço `learnup-nlp` (spaCy + modelo sueco KBLab). Use a URL do serviço em `NLP_API_URL` para validação gramatical com 98% de acurácia. Sem essa variável, o bot usa regras manuais.

---

## Parte 5: Testar

1. Abra o bot no Telegram.
2. Envie `/frase`.
3. Se tudo estiver certo, o bot deve responder com uma frase gerada.

---

## Resumo do que cada arquivo faz

| Arquivo | Função |
|---------|--------|
| `render.yaml` | Define o serviço no Render (Blueprint) |
| `ollama-render/Dockerfile` | Imagem Docker baseada no Ollama oficial |
| `ollama-render/entrypoint.sh` | Inicia o Ollama na porta do Render e baixa o modelo |

### Fluxo do container

1. O Render inicia o container e define a variável `PORT` (ex: 10000).
2. O `entrypoint.sh` configura `OLLAMA_HOST=0.0.0.0:PORT` para o Ollama escutar nessa porta.
3. O Ollama inicia em background.
4. O script baixa o modelo `qwen2.5:1.5b` (ou o definido em `OLLAMA_MODEL`).
5. O serviço fica pronto para receber requisições na URL pública.

---

## Problemas comuns

**"Tente novamente em alguns minutos"**
- Verifique se `OLLAMA_BASE_URL` está correto na Vercel.
- Confirme que o serviço no Render está "Live" (não "Suspended").
- No plano Free, o serviço pode demorar ~1 min para acordar.

**Deploy falha no Render**
- Verifique os logs do deploy no Render.
- Confirme que `ollama-render/Dockerfile` e `ollama-render/entrypoint.sh` existem no repositório.

**Modelo diferente**
- Plano Free (512MB): use apenas `qwen2.5:0.5b`.
- Plano pago: pode usar `qwen2.5:1.5b` ou `qwen2.5:7b`.
