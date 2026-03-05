# Regras gramaticais — Sueco (validação manual)

Quando o serviço NLP (spaCy) não está disponível, o LearnUP usa regras manuais em `src/lib/llm.ts` para validar frases em sueco.

---

## 1. Substrings proibidas

Combinações sempre inválidas (possessivo + advérbio/preposição/conjunção):

| Proibido | Exemplo inválido |
|----------|------------------|
| min ifrån | Min ifrån |
| min varifrån | Min varifrån heter Erik |
| min vart | Min vart |
| min och | Min och du |
| min hur | Min hur |
| min var | Min var |
| din ifrån | Din ifrån |
| din varifrån | Din varifrån |
| din vart | Din vart |
| din och | Din och |
| din hur | Din hur |
| din var | Din var |

---

## 2. Léxico (classificação POS)

Palavras conhecidas e suas categorias:

| Categoria | Palavras |
|-----------|----------|
| **PRON** (pronome) | jag, du, han, hon, vi, de |
| **POSS** (possessivo) | min, mitt, mina, din, ditt, dina |
| **VERB_NAME** | heter |
| **VERB_INTRANS** | odlar, mår, har, går, kommer |
| **VERB_COPULA** | är |
| **ADV** (advérbio) | hur, var, när, varför, vad, varifrån, vart |
| **ADP** (preposição) | ifrån |
| **INTJ** (interjeição) | hej, tack, nej, ja |
| **ADJ** (adjetivo) | bra, god, dålig, stor, liten, fin, vacker |
| **CONJ** (conjunção) | och, men, eller, utan |
| **DET** (determinante) | det, den, detta, denna |
| **PROPN** (nome próprio) | Anna, Erik, Maria, Johan, Lars, Sofia, etc. |
| **NOUN** (substantivo) | palavras do usuário não classificadas |

---

## 3. Combinações adjacentes proibidas

Dois tokens consecutivos que nunca são válidos:

- POSS + VERB, ADV, INTJ, ADJ, CONJ, DET, ADP
- ADP + VERB
- ADJ + VERB
- CONJ + VERB
- NOUN + NOUN, POSS, ADJ
- ADV + INTJ
- VERB + VERB
- VERB_NAME + NOUN (heter exige nome próprio, não substantivo comum)
- PRON + POSS
- INTJ + VERB

---

## 4. Padrões válidos

Estruturas aceitas (sequência de categorias):

- `PRON VERB_INTRANS` — Jag odlar
- `POSS NOUN` — Min fru
- `PRON VERB_NAME PROPN` — Jag heter Anna
- `POSS NOUN VERB_INTRANS` — Min fru odlar
- `POSS NOUN VERB_NAME PROPN` — Min vän heter Maria
- `ADV VERB_INTRANS PRON` — Hur mår du
- `ADV VERB_COPULA PRON` — Var är du
- `VERB_INTRANS PRON` — Mår du
- `INTJ` — Hej
- `PRON VERB_COPULA ADJ` — Jag är bra
- `POSS NOUN VERB_COPULA ADJ` — Min vän är bra
- `DET VERB_COPULA ADJ` — Det är bra
- `VERB_COPULA PRON ADJ` — Är du bra
- `PRON VERB_INTRANS ADJ INTJ` — Jag mår bra tack
- `ADV VERB_INTRANS PRON CONJ ADV VERB_INTRANS PRON` — Varifrån kommer du och hur mår du

---

## 5. Regras especiais

### heter (chamar-se)
- Exige **nome próprio** como complemento (Anna, Erik, Maria), não substantivo comum (vän, fru, kvinna)
- Sujeito de heter deve ser pronome ou substantivo de pessoa: vän, fru, kvinna, man, pojke, flicka

### min / din (possessivos)
- Exigem **substantivo** logo após: Min fru, Min vän
- Nunca: Min bra, Min och, Min ifrån

### Frase com um único token
- Nome próprio isolado: inválido
- Verbo isolado: inválido (exige sujeito)

### Ordem
- Possessivo antes do substantivo: Min fru ✓, Fru min ✗

---

## 6. Regras enviadas ao LLM (prompt)

O prompt inclui:

```
heter exige nome próprio (Anna, Erik). min exige substantivo depois (min fru, min vän). 
bra=adjetivo (Jag är bra). och=conjunção (Jag odlar och du mår). det=determinante (Det är bra). 
är=verbo de ligação (é/está). varifrån/ifrån/vart=advérbios/preposições (Varifrån kommer du?). 
NUNCA: min+adjetivo, min+conjunção, min+det, min+verbo, min+advérbio, min+preposição (min ifrån), min+varifrån/vart. 
Ex válidos: Min fru heter Anna, Varifrån kommer du, Jag är bra. 
Ex inválidos: Min bra, Min och, Min ifrån, Min Vart.
```

---

## 7. NLP (spaCy) vs regras manuais

| Modo | Acurácia | Quando |
|------|----------|--------|
| **spaCy** | ~98% | `NLP_API_URL` configurado e serviço rodando |
| **Regras manuais** | Limitada | Fallback quando spaCy indisponível |

Para usar spaCy localmente: inicie o `nlp-service` (`python -m uvicorn main:app --port 8000`) e defina `NLP_API_URL=http://localhost:8000` no `.env`.
