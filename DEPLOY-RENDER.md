# Deploy do Ollama no Render – Passo a passo

Este guia explica como fazer o deploy do Ollama no Render para o bot LearnUP funcionar em produção.

---

## Pré-requisitos

- Conta no [Render](https://render.com) (grátis)
- Repositório do LearnUP no GitHub
- Conta no [GitHub](https://github.com)

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

5. Em **Instance Type**, escolha:
   - **Free** – para testes (serviço dorme após 15 min)
   - **Starter (US$ 7/mês)** – recomendado para uso contínuo

6. Em **Environment**, adicione:
   | Key | Value |
   |-----|-------|
   | OLLAMA_MODEL | qwen2.5:1.5b |

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
   | OLLAMA_MODEL | qwen2.5:1.5b |

4. Faça um novo deploy (Deployments → ⋮ → Redeploy).

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
- Para usar `qwen2.5:7b`, altere `OLLAMA_MODEL` no Render e na Vercel.
- O modelo 7b é mais pesado e pode ser lento no plano Free/Starter.
