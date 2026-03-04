#!/bin/sh
set -e

# Render usa PORT (ex: 10000); Ollama precisa escutar nessa porta
PORT="${PORT:-11434}"
export OLLAMA_HOST="0.0.0.0:${PORT}"

# Inicia Ollama em background
ollama serve &
OLLAMA_PID=$!

# Aguarda API ficar pronta
sleep 5
until curl -s "http://localhost:${PORT}/api/tags" > /dev/null 2>&1; do
  sleep 2
done

# Baixa o modelo (usa variável de ambiente ou padrão)
MODEL="${OLLAMA_MODEL:-qwen2.5:0.5b}"
echo "Baixando modelo $MODEL..."
ollama pull "$MODEL"

echo "Ollama pronto com $MODEL na porta $PORT"
wait $OLLAMA_PID
