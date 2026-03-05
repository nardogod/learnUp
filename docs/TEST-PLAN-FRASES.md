# Plano de Testes - Validação de Frases (Sueco)

## Fase 1: Combinações Proibidas (todas devem ser REJEITADAS)

Execute `/frase` várias vezes. **Nenhuma** destas deve aparecer:

| Frase | Motivo |
|-------|--------|
| Min mår | POSS + VERB |
| Min heter | POSS + VERB_NAME |
| Min hur | POSS + ADV |
| Min Hej | POSS + INTJ |
| Vän kvinna | NOUN + NOUN |
| Fru min | NOUN + POSS |
| Hur Hej | ADV + INTJ |
| Odlar mår | VERB + VERB |
| Du min | PRON + POSS |
| Hej odlar | INTJ + VERB |
| Odlar | verbo sem sujeito |
| Heter Anna | verbo sem sujeito |
| Anna | nome isolado |
| Jag heter vän | heter exige nome próprio |
| Jag heter kvinna | heter exige nome próprio |

---

## Fase 2: Padrões Aceitos (devem APARECER)

| Padrão | Exemplo |
|--------|---------|
| PRON + VERB_INTRANS | Jag mår, Jag odlar |
| POSS + NOUN | Min fru |
| PRON + VERB_NAME + PROPN | Jag heter Anna |
| POSS + NOUN + VERB_INTRANS | Min vän odlar |
| ADV + VERB_INTRANS + PRON | Hur mår du? |
| VERB_INTRANS + PRON | Mår du? |
| INTJ | Hej |

---

## Fase 3: Regra Semântica "heter"

1. Adicione nome próprio: `/addword` → Anna → Anna
2. Frases válidas: Jag heter Anna, Min fru heter Anna
3. Frases bloqueadas: Jag heter vän, Jag heter kvinna

---

## Fase 4: Checklist Rápido

```
/addword → jag, du, min, vän, mår, odlar, hur, Hej, Anna
/frase × 20
```

Anote todas as frases. Nenhuma da Fase 1 deve aparecer.

---

## Testes Automatizados

Execute `npm run test` para rodar os 24 testes de gramática sueca.
