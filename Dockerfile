# Scolaria — image de production (Render Web Service "Docker")
# Utilisable lorsque vous déployez depuis une archive ZIP poussée sur Git.
FROM node:22-slim AS base
ENV NEXT_TELEMETRY_DISABLED=1 \
    NODE_ENV=production \
    PORT=10000

FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --include=dev

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Le build n'exige AUCUNE base de données (schéma créé au runtime).
RUN npm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.ts ./next.config.ts
COPY --from=builder /app/src ./src
COPY --from=builder /app/public ./public
RUN mkdir -p /app/.data && chown -R node:node /app/.data
USER node
EXPOSE 10000
CMD ["npm", "run", "start"]
