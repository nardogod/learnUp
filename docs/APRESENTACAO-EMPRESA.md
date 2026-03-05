# LearnUP — Apresentação Corporativa

**Solução de aprendizado de idiomas via Telegram para empresas**

---

## 1. Resumo executivo

O **LearnUP** é um bot de idiomas no Telegram que combina vocabulário personalizado, geração de frases com IA e validação gramatical (NLP). Pensado para escala corporativa, permite que centenas ou milhares de colaboradores pratiquem idiomas no dia a dia, sem apps adicionais.

**Público-alvo:** Empresas com 1500+ funcionários que precisam de treinamento de idiomas (ex.: sueco, inglês) de forma ágil e mensurável.

---

## 2. Problema e solução

### Problema
- Treinamentos de idiomas tradicionais são caros, presenciais e pouco flexíveis.
- Apps genéricos não se adaptam ao vocabulário e ao contexto da empresa.
- Falta de prática no dia a dia e repetição espaçada ineficiente.

### Solução LearnUP
- **Bot no Telegram** — já usado pela maioria dos colaboradores.
- **Vocabulário personalizado** — cada usuário cadastra e revisa suas próprias palavras.
- **Frases geradas por IA** — usando apenas o vocabulário do usuário, com validação gramatical.
- **Lembretes automáticos** — manhã, tarde e noite para manter o hábito.

---

## 3. Arquitetura da solução

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Telegram      │────▶│  Vercel (Next.js) │────▶│  Neon (Postgres) │
│   (usuário)     │     │  Webhook + API    │     │  Usuários,       │
└─────────────────┘     └────────┬─────────┘     │  Palavras,       │
                                  │               │  Frases enviadas │
                    ┌─────────────┼─────────────┐  └─────────────────┘
                    │             │             │
                    ▼             ▼             ▼
             ┌──────────┐  ┌──────────┐  ┌──────────────┐
             │   Groq   │  │   NLP    │  │   Cron       │
             │   (LLM)  │  │  (spaCy) │  │  (manhã/     │
             │ Llama 3  │  │  sueco   │  │  tarde/noite) │
             └──────────┘  └──────────┘  └──────────────┘
```

| Componente | Função |
|------------|--------|
| **Telegram** | Interface do usuário; comandos e mensagens |
| **Vercel** | Hospedagem do app Next.js; webhook e APIs |
| **Neon** | Banco PostgreSQL serverless (escala automática) |
| **Groq** | LLM para geração de frases (gratuito, baixa latência) |
| **NLP (Render)** | spaCy + modelo sueco para validação gramatical |
| **Cron** | Envio de frases automáticas em horários definidos |

---

## 4. Módulos principais

### 4.1 Vocabulário
- **/addword** — cadastro de palavra + tradução.
- **/palavras** — lista do vocabulário do usuário.
- **/addphrase** — envia uma frase e o bot extrai e salva as palavras.
- **/deduplicate** — remove duplicatas e unifica traduções.

### 4.2 Geração de frases (/frase)
1. **LLM (Groq)** — gera frases usando apenas o vocabulário do usuário.
2. **Validação** — spaCy valida gramática em sueco; regras manuais como fallback.
3. **Fallback** — templates gramaticais quando o LLM falha.
4. **Last resort** — frases conhecidas (ex.: "Jag mår bra, tack") quando necessário.
5. **Anti-repetição** — frases já enviadas hoje são excluídas.

### 4.3 Frases automáticas (Cron)
- **Manhã, tarde e noite** — envio de frases para praticar.
- Respeita timezone do usuário e plano (free/premium).

### 4.4 Planos
- **Free:** 100 palavras, 3 frases automáticas/dia, 10 /frase/dia.
- **Premium:** palavras ilimitadas, frases automáticas configuráveis, /frase ilimitado.

---

## 5. Stack técnico

| Camada | Tecnologia |
|--------|------------|
| Frontend/API | Next.js 16, React 19 |
| Banco de dados | PostgreSQL (Neon) |
| ORM | Prisma |
| LLM | Groq (Llama 3) |
| NLP | spaCy + sv_pipeline (sueco) |
| Deploy app | Vercel |
| Deploy NLP | Render |
| Mensagens | Telegram Bot API |

---

## 6. Escalabilidade para 1500 funcionários

| Aspecto | Consideração |
|---------|--------------|
| **Banco** | Neon escala automaticamente; connection pooling habilitado. |
| **Vercel** | Serverless; escala por requisição. |
| **Groq** | Limites generosos; renovados diariamente. |
| **NLP** | Serviço separado; pode ser escalado ou replicado. |
| **Cadastro** | Script `npm run register-user` para cadastro em lote; possível integração com RH/SSO. |
| **Custos** | Groq gratuito; Vercel free tier; Neon free tier. Para 1500 usuários ativos, avaliar planos pagos conforme uso. |

---

## 7. Mensagens de erro e UX

O bot foi ajustado para mensagens mais claras quando o serviço falha:

- **Antes:** "Tente novamente em alguns minutos."
- **Agora:** "O serviço de geração de frases está temporariamente indisponível ou sobrecarregado. Tente novamente em 1–2 minutos. Enquanto isso, use /palavras para revisar seu vocabulário."

Isso reduz frustração e orienta o usuário a continuar praticando.

---

## 8. Próximos passos sugeridos

1. **Integração com RH** — cadastro em massa via planilha ou API.
2. **Dashboard** — métricas de uso (palavras, frases, engajamento).
3. **Relatórios** — progresso por colaborador ou equipe.
4. **Idiomas adicionais** — expandir além de sueco e inglês.
5. **Resiliência** — retry automático e fallbacks mais robustos quando o LLM falha.

---

## 9. Contato e documentação

- **Setup:** `SETUP.md`
- **Deploy:** `DEPLOY-RENDER.md`
- **LLM gratuito:** `docs/FREE-LLM-OPTIONS.md`
- **NLP:** `nlp-service/README.md`
