# syntax=docker/dockerfile:1
FROM node:20-bullseye-slim AS base
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

FROM deps AS build
COPY . .
RUN npm run build

FROM node:20-bullseye-slim AS runner
WORKDIR /app
ENV PORT=3000

COPY --from=deps /app/node_modules ./node_modules
RUN npm prune --omit=dev

COPY --from=build /app/package.json ./
COPY --from=build /app/build ./build
COPY --from=build /app/scripts ./scripts
COPY --from=build /app/drizzle ./drizzle

EXPOSE 3000
CMD ["sh", "-c", "npx tsx scripts/migrate.ts && node build/index.js"]
