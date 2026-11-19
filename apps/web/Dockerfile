# Build context is the repo root (see docker-compose.yml). The web app is the
# shell; each service's tab screens live in services/<name>/frontend and get
# bundled in here, and MEWS and the role names come from packages/shared.

# every workspace manifest at its own path (see infra/docker/service.Dockerfile)
FROM node:22-alpine AS manifests
WORKDIR /src
COPY . .
RUN find . -name package.json -not -path "*/node_modules/*" -exec sh -c 'mkdir -p "/manifests/$(dirname "$1")" && cp "$1" "/manifests/$1"' _ {} \;

FROM node:22-alpine AS build
WORKDIR /repo
COPY --from=manifests /manifests ./
COPY package-lock.json ./
RUN npm ci --workspace @wahter/web --workspace @wahter/shared --include-workspace-root=false

COPY packages/shared packages/shared
# only the frontend/ folders matter here, but copying services/ whole keeps
# this file from needing an edit every time a service is added
COPY services services
COPY apps/web apps/web

# NEXT_PUBLIC_* values are baked in at build time, so these have to be build args
ARG NEXT_PUBLIC_API_URL=/api
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_ENABLE_DEMO=false
ENV NEXT_PUBLIC_ENABLE_DEMO=$NEXT_PUBLIC_ENABLE_DEMO
# logo set (see src/lib/brand.ts); empty = the WAH logo
ARG NEXT_PUBLIC_BRAND=
ENV NEXT_PUBLIC_BRAND=$NEXT_PUBLIC_BRAND
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build --workspace @wahter/web

FROM node:22-alpine
WORKDIR /repo
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=build /repo/node_modules node_modules
COPY --from=build /repo/packages/shared/package.json packages/shared/
COPY --from=build /repo/packages/shared/dist packages/shared/dist
COPY --from=build /repo/apps/web/package.json /repo/apps/web/next.config.ts apps/web/
COPY --from=build /repo/apps/web/public apps/web/public
COPY --from=build /repo/apps/web/.next apps/web/.next
USER node
EXPOSE 3000
WORKDIR /repo/apps/web
CMD ["../../node_modules/.bin/next", "start", "-p", "3000"]
