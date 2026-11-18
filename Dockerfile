FROM node:22-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm install

COPY . .
RUN npx prisma generate && npm run build

ENV NODE_ENV=production
ENV PORT=4317
ENV HOST=0.0.0.0
EXPOSE 4317

CMD ["sh", "-c", "npx prisma migrate deploy && node scripts/serve.mjs"]
