# Ollama no Render (para LearnUP)

Este diretório contém os arquivos para rodar o Ollama no Render e usar com o bot LearnUP na Vercel.

## Passo a passo

### 1. Repositório

**Opção A – Mesmo repo do LearnUP (mais simples)**

1. Faça push do LearnUP (com a pasta `ollama-render/`) para o GitHub
2. No Render, conecte esse repositório

**Opção B – Repo separado**

1. Crie um repo novo (ex: `learnup-ollama`)
2. Copie o conteúdo de `ollama-render/` para a raiz do novo repo
3. Ajuste `dockerfilePath` e `dockerContext` no render.yaml

### 2. Criar o serviço no Render

1. Acesse [dashboard.render.com](https://dashboard.render.com)
2. **New** → **Web Service** (precisa ser Web para ter URL pública)
3. Conecte o repositório (GitHub)
4. Configure:
   - **Name:** `learnup-ollama`
   - **Region:** Oregon (ou mais próxima)
   - **Runtime:** Docker
   - **Dockerfile Path:** `ollama-render/Dockerfile`
   - **Root Directory:** deixe vazio (ou `ollama-render` se usar repo separado)

### 3. Variáveis de ambiente

No Render, em **Environment**:

| Key           | Value          |
|---------------|----------------|
| OLLAMA_MODEL  | qwen2.5:1.5b   |

Modelos para CPU (sem GPU):

- `qwen2.5:0.5b` – ~500MB, mais rápido
- `qwen2.5:1.5b` – ~1GB, bom equilíbrio
- `qwen2.5:7b` – ~4GB, lento em CPU

### 4. Plano

- **Free:** `qwen2.5:0.5b`; serviço dorme após ~15 min (primeiro request pode levar ~1 min)
- **Starter (US$ 7/mês):** recomendado para `qwen2.5:1.5b`

### 5. Obter a URL

Após o deploy, a URL aparece no topo do serviço, ex: `https://learnup-ollama-xxxx.onrender.com`

### 6. Configurar o LearnUP na Vercel

No projeto LearnUP na Vercel → **Settings** → **Environment Variables**:

| Key              | Value                                      |
|------------------|---------------------------------------------|
| OLLAMA_BASE_URL  | https://learnup-ollama-xxxx.onrender.com    |

**Importante:** não use barra no final da URL.

Se usar `qwen2.5:1.5b` no Render, adicione na Vercel:

| Key            | Value          |
|----------------|----------------|
| OLLAMA_MODEL   | qwen2.5:1.5b   |

(Opcional; o padrão é qwen2.5:7b.)

### 7. Segurança

Ollama não tem autenticação. A URL fica pública. Para reduzir risco:

- Use um nome de serviço difícil de adivinhar
- Ou coloque o Ollama atrás de um proxy com auth (ex: Cloudflare Access)

### 8. Alternativa: Railway

A [Railway](https://railway.app) tem template de Ollama com deploy em um clique e ~US$ 5 de crédito grátis/mês.
