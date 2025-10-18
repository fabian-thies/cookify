FROM node:22-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci
COPY ./ ./
RUN npm run build && npm prune --omit=dev

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000 \
    HOST=0.0.0.0

COPY --from=build /app/package*.json /app/
COPY --from=build /app/node_modules /app/node_modules
COPY --from=build /app/build /app/build
COPY --from=build /app/scripts /app/scripts
COPY --from=build /app/drizzle /app/drizzle

RUN npm i --no-save tsx

EXPOSE 3000

CMD ["sh", "-c", "npx tsx scripts/migrate.ts && node build"]