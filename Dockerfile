# Multi-stage Dockerfile para Núcleo Financiero (Entorno de Pruebas y Producción)
FROM node:20-alpine AS base

WORKDIR /app

# Instalar dependencias necesarias para compilar módulos nativos si los hubiera
RUN apk add --no-cache curl

# Copiar manifiestos de dependencias
COPY package*.json tsconfig.json ./

# Instalar todas las dependencias
RUN npm ci

# Copiar código fuente
COPY . .

# Compilar TypeScript a JavaScript
RUN npm run build

# Stage 2: Runner para Producción / Entornos de Pruebas
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Añadir curl para healthchecks
RUN apk add --no-cache curl

# Copiar manifiestos
COPY package*.json ./

# Instalar sólo dependencias de producción
RUN npm ci --only=production

# Copiar los archivos compilados del stage anterior
COPY --from=base /app/dist ./dist

# Exponer el puerto del API
EXPOSE 3000

# Healthcheck interno del contenedor
HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3000/api/v1/health || exit 1

# Comando por defecto para iniciar el servidor
CMD ["node", "dist/server.js"]
