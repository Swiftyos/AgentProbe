FROM oven/bun:1.3.12 AS build

WORKDIR /app

COPY package.json bun.lock bunfig.toml ./
COPY dashboard/package.json dashboard/package.json
RUN bun install --frozen-lockfile

COPY . .
RUN bun run dashboard:build

FROM oven/bun:1.3.12-slim AS runtime

WORKDIR /app

ENV NODE_ENV=production \
    AGENTPROBE_SERVER_HOST=0.0.0.0 \
    AGENTPROBE_SERVER_PORT=7878 \
    AGENTPROBE_SERVER_DATA=/app/data \
    AGENTPROBE_SERVER_DB=/app/.agentprobe/runs.sqlite3 \
    AGENTPROBE_SERVER_DASHBOARD_DIST=/app/dashboard/dist \
    AGENTPROBE_SERVER_LOG_FORMAT=json

COPY --from=build /app/package.json /app/bun.lock ./
COPY --from=build /app/dashboard/package.json ./dashboard/package.json
RUN bun install --production --frozen-lockfile

COPY --from=build /app/src ./src
COPY --from=build /app/data ./data
COPY --from=build /app/dashboard/dist ./dashboard/dist

EXPOSE 7878

# Runtime config is supplied via AGENTPROBE_SERVER_* env vars (see infra/helm
# values.yaml). Binding to 0.0.0.0 requires AGENTPROBE_SERVER_TOKEN and
# AGENTPROBE_SERVER_CORS_ORIGINS to be set; the CLI enforces this.
CMD ["bun", "run", "./src/cli/main.ts", "start-server", "--unsafe-expose"]
