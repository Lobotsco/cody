FROM node:22-alpine AS builder

WORKDIR /app

ENV NUXT_TELEMETRY_DISABLED=1

RUN corepack enable && corepack prepare pnpm@10.28.0 --activate

COPY package.json ./
RUN pnpm install --no-frozen-lockfile

COPY . .
RUN pnpm run build

FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NITRO_PORT=9022
ENV NITRO_HOST=0.0.0.0
ENV PORT=9022
ENV HOST=0.0.0.0

COPY --from=builder /app/.output /app/.output

EXPOSE 9022

CMD ["node", ".output/server/index.mjs"]
