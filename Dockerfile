# Accord website. Railway builds this Dockerfile directly, so a deploy never depends on Railway's builder tool
# (railpack) being downloadable at build time. Build: install, typecheck, Vite build, pre-render. Run: the
# dependency-free static server on $PORT (apps/web/scripts/serve.mjs), with /healthz.
FROM node:22-alpine AS build
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

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/apps/web/scripts/serve.mjs ./apps/web/scripts/serve.mjs
COPY --from=build /app/apps/web/dist ./apps/web/dist
EXPOSE 8080
CMD ["node", "apps/web/scripts/serve.mjs"]
