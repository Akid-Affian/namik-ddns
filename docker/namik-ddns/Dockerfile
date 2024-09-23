FROM oven/bun:slim AS build

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    python3 \
    git \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /namik-ddns

COPY package.json bun.lockb* ./

RUN bun install --production

COPY . .

RUN bun run build:bun

FROM oven/bun:alpine

WORKDIR /namik-ddns

COPY --from=build /namik-ddns/package.json ./
COPY --from=build /namik-ddns/node_modules /namik-ddns/node_modules
COPY --from=build /namik-ddns/dist /namik-ddns/dist

EXPOSE 4321

CMD ["bun", "run", "start:bun"]
