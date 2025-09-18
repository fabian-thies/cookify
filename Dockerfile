# syntax=docker/dockerfile:1

FROM node:20-bullseye-slim AS base
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

FROM deps AS build
COPY . .
RUN npm run build

FROM deps AS production-deps
RUN npm prune --omit=dev

FROM node:20-bullseye-slim AS runner
WORKDIR /app
ENV PORT=3000

COPY --from=production-deps /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/package-lock.json ./package-lock.json
COPY --from=build /app/build ./build

EXPOSE 3000

CMD ["node", "build/index.js"]