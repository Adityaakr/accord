# One Dockerfile for both Railway services, chosen by the service's own variables:
# - the website service (no ACCORD_NETWORK): install, typecheck, Vite build, pre-render, then the dependency-free
#   static server on $PORT (apps/web/scripts/serve.mjs), with /healthz;
# - the app service (ACCORD_NETWORK set, e.g. testnet): the Next.js app in platform/ under /app on $PORT, with
#   OutLayer's `outlayer-verify` on PATH (built in its own Rust stage) for the release check of /api/verify and /app/mcp;
# - a platform service (ACCORD_SERVICE=keeper or agent): the same platform build, running
#   `pnpm --filter @accord/$ACCORD_SERVICE start` (no HTTP port; it writes heartbeats to DATABASE_URL).
# Railway builds this file directly, so a deploy never depends on Railway's builder tool being downloadable.
# No secrets at build time: every key is a runtime variable.
ARG ACCORD_NETWORK
ARG ACCORD_SERVICE

FROM node:22-alpine AS web-build
WORKDIR /app

# Build-time configuration: Railway passes service variables to declared build args. All optional.
ARG SITE_URL
ARG VITE_ACCORD_API_URL
ARG VITE_APP_URL
ARG VITE_CONTACT_EMAIL
ARG VITE_CONTRACT_ID
ARG VITE_DEMO_VIDEO_URL
ARG VITE_REPO_URL
ARG VITE_X_POST_URL
ENV SITE_URL=$SITE_URL VITE_ACCORD_API_URL=$VITE_ACCORD_API_URL VITE_APP_URL=$VITE_APP_URL \
    VITE_CONTACT_EMAIL=$VITE_CONTACT_EMAIL VITE_CONTRACT_ID=$VITE_CONTRACT_ID \
    VITE_DEMO_VIDEO_URL=$VITE_DEMO_VIDEO_URL VITE_REPO_URL=$VITE_REPO_URL VITE_X_POST_URL=$VITE_X_POST_URL

COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/package.json
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build

FROM node:22-alpine AS target
WORKDIR /app
ENV NODE_ENV=production
COPY --from=web-build /app/package.json ./package.json
COPY --from=web-build /app/apps/web/scripts/serve.mjs ./apps/web/scripts/serve.mjs
COPY --from=web-build /app/apps/web/dist ./apps/web/dist
EXPOSE 8080
CMD ["node", "apps/web/scripts/serve.mjs"]

# ---- outlayer-verify, OutLayer's own verifier, for the app's `release` check (/api/verify and /app/mcp) ----
# Built from source at a pinned commit; a static musl binary (ureq + rustls with webpki roots), so the runtime image
# gets one file and no Rust toolchain. Only the app target copies it, so the website and keeper builds skip this stage.
FROM rust:1.91-alpine AS outlayer-verify
RUN apk add --no-cache musl-dev gcc
ARG OUTLAYER_VERIFY_REV=90c27d9d4fc843194ddc6f8ebaafa4eb320c3bb6
RUN cargo install --locked --git https://github.com/out-layer/outlayer-verify --rev "$OUTLAYER_VERIFY_REV" \
      outlayer-verify --root /opt/outlayer-verify \
 && /opt/outlayer-verify/bin/outlayer-verify -h >/dev/null

# ---- the app (platform/, Next.js under /app) ----
FROM node:24-alpine AS app-build
WORKDIR /repo
RUN corepack enable
ARG NEXT_PUBLIC_BASE_PATH=/app
ENV NEXT_PUBLIC_BASE_PATH=$NEXT_PUBLIC_BASE_PATH \
    NEXT_TELEMETRY_DISABLED=1
COPY platform/ .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @accord/app run build

FROM node:24-alpine AS target-app
WORKDIR /repo
RUN corepack enable
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1
COPY --from=app-build /repo /repo
# on PATH, so the release check proves each job run; without it the check says "not checked"
COPY --from=outlayer-verify /opt/outlayer-verify/bin/outlayer-verify /usr/local/bin/outlayer-verify
RUN outlayer-verify -h >/dev/null
WORKDIR /repo/app
EXPOSE 3100
CMD ["sh", "-c", "pnpm exec next start -p ${PORT:-3100}"]

# ---- the keeper or the demo agent (platform/services), from the same build as the app ----
# The keeper and the demo agent need only the workspace and the two built packages they import, not the Next.js app:
# building the app would fetch Google Fonts at build time, which a background service has no reason to depend on.
FROM node:24-alpine AS svc-build
WORKDIR /repo
RUN corepack enable
COPY platform/ .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @accord/sdk --filter @accord/store build

FROM node:24-alpine AS target-app-svc
WORKDIR /repo
RUN corepack enable
ARG ACCORD_SERVICE
ENV NODE_ENV=production ACCORD_SERVICE=$ACCORD_SERVICE
COPY --from=svc-build /repo /repo
CMD ["sh", "-c", "case \"$ACCORD_SERVICE\" in keeper|agent) exec pnpm --filter \"@accord/$ACCORD_SERVICE\" start ;; *) echo \"ACCORD_SERVICE must be keeper or agent, not '$ACCORD_SERVICE'\" >&2; exit 1 ;; esac"]

# ACCORD_SERVICE without ACCORD_NETWORK: the same service (it defaults to testnet).
FROM target-app-svc AS target-svc

# ---- pick one: target (website), target-app (app), target-app-svc or target-svc (keeper or agent) ----
FROM target${ACCORD_NETWORK:+-app}${ACCORD_SERVICE:+-svc}
