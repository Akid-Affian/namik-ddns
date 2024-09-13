FROM node:20.17-slim AS build

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    git \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /namik-ddns

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

FROM node:20.17-slim

WORKDIR /namik-ddns

COPY --from=build /namik-ddns/package*.json ./
COPY --from=build /namik-ddns/node_modules /namik-ddns/node_modules
COPY --from=build /namik-ddns/dist /namik-ddns/dist

EXPOSE 4321

CMD ["node", "./dist/server/entry.mjs"]
