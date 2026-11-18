FROM debian:bookworm-slim
RUN apt-get update \
  && apt-get install -y --no-install-recommends socat \
  && rm -rf /var/lib/apt/lists/*
ENTRYPOINT ["socat"]
CMD ["TCP-LISTEN:9002,fork,reuseaddr,bind=0.0.0.0", "TCP:127.0.0.1:9000"]
