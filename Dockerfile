# ============================================
# STAGE 1: BUILD - Compilação da aplicação
# ============================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copia arquivos de dependências
COPY package.json package-lock.json ./

# ⚠️ Usa npm install em vez de npm ci (menos rigoroso, mas funcional)
# --legacy-peer-deps ignora conflitos de peerDependencies
RUN npm install --legacy-peer-deps

# Copia código fonte
COPY . .

# Build da aplicação
RUN npm run build

# ============================================
# STAGE 2: PRODUCTION
# ============================================
FROM nginx:alpine-slim AS production

LABEL maintainer="amos-fernandes" \
      description="GoldBank - Plataforma de investimento em ouro tokenizado" \
      version="1.0.0"

RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 8080

# Health check otimizado para Cloud Run
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:8080/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
