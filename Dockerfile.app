# Accord app (the platform behind <site>/app), built from the repository root.
# Railway: keep the service's root directory at `/` and set its config-as-code path to /railway.app.json, which
# points here. Same build as platform/Dockerfile, with platform/ as the workspace. No secrets at build time.
FROM node:24-alpine AS build
WORKDIR /repo
RUN corepack enable
ARG NEXT_PUBLIC_BASE_PATH=/app
ARG NEXT_PUBLIC_NEAR_AUTH_CLIENT_ID
ENV NEXT_PUBLIC_BASE_PATH=$NEXT_PUBLIC_BASE_PATH NEXT_PUBLIC_NEAR_AUTH_CLIENT_ID=$NEXT_PUBLIC_NEAR_AUTH_CLIENT_ID \
    NEXT_TELEMETRY_DISABLED=1
COPY platform/ .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @accord/app run build

FROM node:24-alpine
WORKDIR /repo
RUN corepack enable
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1
COPY --from=build /repo /repo
WORKDIR /repo/app
EXPOSE 3100
CMD ["sh", "-c", "pnpm exec next start -p ${PORT:-3100}"]
