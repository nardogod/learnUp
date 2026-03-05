# LearnUP NLP Service - spaCy + modelo sueco KBLab
FROM python:3.12-slim

WORKDIR /app

# Dependências do sistema (spaCy pode precisar)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Python deps (contexto = raiz do repo)
COPY nlp-service/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Modelo sueco oficial spaCy (~13MB)
RUN python -m spacy download sv_core_news_sm

COPY nlp-service/main.py .

# Porta padrão Render
ENV PORT=10000
EXPOSE 10000

CMD python -m uvicorn main:app --host 0.0.0.0 --port ${PORT}
