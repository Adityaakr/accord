# One Dockerfile for both Railway services, chosen by the service's own variables:
# - the website service (no ACCORD_NETWORK): install, typecheck, Vite build, pre-render, then the dependency-free
#   static server on $PORT (apps/web/scripts/serve.mjs), with /healthz;
# - the app service (ACCORD_NETWORK set, e.g. testnet): the Next.js app in platform/ under /app on $PORT.
# Railway builds this file directly, so a deploy never depends on Railway's builder tool being downloadable.
# No secrets at build time: every key is a runtime variable.
ARG ACCORD_NETWORK

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
WORKDIR /repo/app
EXPOSE 3100
CMD ["sh", "-c", "pnpm exec next start -p ${PORT:-3100}"]

# ---- pick one: target (website) or target-app (app) ----
FROM target${ACCORD_NETWORK:+-app}
