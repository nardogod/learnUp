#!/bin/sh
set -e

# Render usa PORT (ex: 10000); só abrimos essa porta DEPOIS do modelo estar pronto
# Assim o health check não passa antes do pull terminar
PORT="${PORT:-11434}"
INTERNAL_PORT="11433"

MODEL="${OLLAMA_MODEL:-qwen2.5:0.5b}"

# 1. Inicia Ollama em porta interna (Render não roteia tráfego ainda)
export OLLAMA_HOST="0.0.0.0:${INTERNAL_PORT}"
ollama serve &
OLLAMA_PID=$!

# 2. Aguarda API ficar pronta
sleep 5
until curl -s "http://localhost:${INTERNAL_PORT}/api/tags" > /dev/null 2>&1; do
  sleep 2
done

# 3. Baixa o modelo (bloqueia até terminar)
echo "Baixando modelo $MODEL..."
if ! ollama pull "$MODEL"; then
  echo "ERRO: Falha ao baixar modelo $MODEL"
  exit 1
fi

# 4. Reinicia Ollama na porta do Render (para o health check passar)
kill $OLLAMA_PID 2>/dev/null || true
wait $OLLAMA_PID 2>/dev/null || true
sleep 2

export OLLAMA_HOST="0.0.0.0:${PORT}"
ollama serve &
OLLAMA_PID=$!

until curl -s "http://localhost:${PORT}/api/tags" > /dev/null 2>&1; do
  sleep 1
done

echo "Ollama pronto com $MODEL na porta $PORT"
wait $OLLAMA_PID
