# LearnUP NLP Service

Serviço de NLP em Python usando **spaCy** + modelo sueco **KBLab** (Biblioteca Nacional da Suécia).

- **98%+** acurácia em POS tagging
- Validação gramatical para frases em sueco
- Auto-categorização de palavras (ADJ, CONJ, DET, VERB_COPULA, etc.)

## Instalação local

```bash
cd nlp-service
pip install -r requirements.txt
pip install "https://huggingface.co/KBLab/swedish-spacy-pipeline/resolve/main/sv_pipeline-any-py3-none-any.whl"
uvicorn main:app --reload --port 8000
```

## Endpoints

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/health` | Health check + status do modelo |
| POST | `/pos` | POS tags de uma frase |
| POST | `/validate` | Validação gramatical |
| POST | `/categorize` | Auto-categorização de palavra |

## Uso no LearnUP

Configure `NLP_API_URL` na Vercel apontando para o serviço (ex: `https://learnup-nlp-xxxx.onrender.com`).

Sem a variável, o bot usa regras manuais (fallback).
