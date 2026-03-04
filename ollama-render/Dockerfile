# Ollama no Render - CPU only
# Use modelo menor (0.5b ou 1.5b) para CPU; 7b pode ser lento
FROM ollama/ollama:latest

# O modelo será baixado no primeiro start via entrypoint
# qwen2.5:0.5b ~500MB - rápido em CPU
# qwen2.5:1.5b ~1GB - equilibrado
# qwen2.5:7b ~4GB - lento em CPU, considere plano maior
ENV OLLAMA_MODEL=qwen2.5:1.5b

EXPOSE 11434

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
