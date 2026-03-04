# Ollama no Render - modelo incluído na imagem (não depende de pull no start)
FROM ollama/ollama:latest

# Pre-pull do modelo durante o build - fica na imagem, start é instantâneo
RUN ollama serve & \
    sleep 30 && \
    ollama pull qwen2.5:0.5b && \
    pkill ollama || true

EXPOSE 11434

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
