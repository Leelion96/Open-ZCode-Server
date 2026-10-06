FROM node:24.18.0-bookworm-slim@sha256:6f7b03f7c2c8e2e784dcf9295400527b9b1270fd37b7e9a7285cf83b6951452d AS base
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
RUN npm install --global pnpm@10.33.2
ENV PRISMA_HIDE_UPDATE_MESSAGE=true
WORKDIR /app

FROM base AS build
COPY package.json pnpm-lock.yaml .npmrc ./
RUN pnpm install --frozen-lockfile
COPY tsconfig*.json prisma.config.ts ./
COPY prisma ./prisma
COPY src ./src
COPY scripts/build-plugin-marketplace.mjs scripts/plugin-package-build.mjs ./scripts/
COPY data ./data
COPY plugins/packages ./plugins/packages
COPY plugins/assets ./plugins/assets
RUN pnpm build && pnpm prune --prod

FROM base AS runtime
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3000
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --chown=node:node package.json pnpm-lock.yaml prisma.config.ts ./
COPY --chown=node:node prisma ./prisma
COPY --chown=node:node data ./data
COPY --from=build --chown=node:node /app/plugin-artifacts ./plugin-artifacts
COPY --chown=node:node specs/api-inventory.json ./specs/api-inventory.json
COPY --chown=node:node deploy/docker-entrypoint.sh ./deploy/docker-entrypoint.sh
USER node
EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=5s --start-period=30s --retries=6 CMD node -e "fetch('http://127.0.0.1:3000/health/ready').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
ENTRYPOINT ["sh", "/app/deploy/docker-entrypoint.sh"]
