# Opções gratuitas para testar o LearnUP

## 1. **Groq** (recomendado – gratuito, sem cartão)

- **Site:** [console.groq.com](https://console.groq.com)
- **Cadastro:** e-mail ou GitHub
- **Limite:** milhares de tokens/minuto, renovados diariamente
- **Modelos:** Llama 3.3 70B, Llama 3.1 8B, Gemma 2, etc.

**Configuração:**
1. Crie uma conta e gere uma API key
2. Na Vercel, adicione: `GROQ_API_KEY=gsk_xxx`
3. O bot passa a usar Groq em vez de Ollama

---

## 2. **Ollama local + ngrok** (teste completo)

- **Ollama:** [ollama.com](https://ollama.com) (roda no seu PC)
- **ngrok:** [ngrok.com](https://ngrok.com) (túnel gratuito)

**Passos:**
1. Instale Ollama e rode: `ollama run qwen2.5:7b`
2. Instale ngrok e execute: `ngrok http 3000`
3. Configure o webhook do Telegram com a URL do ngrok: `https://xxx.ngrok.io/api/webhook`
4. Rode o app: `npm run dev`
5. Teste o bot no Telegram

---

## 3. **Render Free** (atual)

- Modelo na imagem, mas 512MB pode causar 502 na inferência
- Útil para verificar se o deploy funciona, mas instável para uso contínuo

---

## 4. **Railway**

- ~US$ 5 de crédito grátis/mês
- Depois exige cartão para continuar

---

## Resumo

| Opção        | Custo | Estabilidade | Configuração |
|-------------|-------|--------------|--------------|
| **Groq**    | Grátis | Alta         | Só API key   |
| **Local + ngrok** | Grátis | Alta (enquanto o PC estiver ligado) | Média |
| **Render Free** | Grátis | Baixa (502) | Já feita |
| **Railway** | Crédito grátis | Média | Deploy em 1 clique |
