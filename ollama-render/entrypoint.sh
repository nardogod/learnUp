#!/bin/sh
# Modelo já está na imagem (pre-pull no build). Só inicia o servidor.
PORT="${PORT:-11434}"
export OLLAMA_HOST="0.0.0.0:${PORT}"
exec ollama serve
