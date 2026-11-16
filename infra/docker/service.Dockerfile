# One Dockerfile for all ten NestJS services; docker-compose.yml passes the
# folder name as SERVICE. Build context is the repo root, because a service
# needs packages/shared and the workspace lockfile. Only that service's
# backend/ goes into the image; its frontend/ is bundled into the web app.

# Every workspace's package.json, at its own path, so npm ci agrees with the
# root lockfile. Copied by content, so editing source code doesn't bust the
# npm ci layer below.
FROM node:22-alpine AS manifests
WORKDIR /src
COPY . .
RUN find . -name package.json -not -path "*/node_modules/*" -exec sh -c 'mkdir -p "/manifests/$(dirname "$1")" && cp "$1" "/manifests/$1"' _ {} \;

FROM node:22-alpine AS build
ARG SERVICE
WORKDIR /repo
COPY --from=manifests /manifests ./
COPY package-lock.json ./
RUN npm ci --workspace @wahter/shared --workspace @wahter/${SERVICE} --include-workspace-root=false

COPY packages/shared packages/shared
COPY services/${SERVICE}/backend services/${SERVICE}/backend
RUN npm run build --workspace @wahter/shared && npm run build --workspace @wahter/${SERVICE}

FROM node:22-alpine
ARG SERVICE
ENV SERVICE=${SERVICE}
WORKDIR /repo
ENV NODE_ENV=production
COPY --from=build /repo/node_modules node_modules
COPY --from=build /repo/packages/shared/package.json packages/shared/
COPY --from=build /repo/packages/shared/dist packages/shared/dist
COPY --from=build /repo/services/${SERVICE}/backend/package.json services/${SERVICE}/backend/
COPY --from=build /repo/services/${SERVICE}/backend/dist services/${SERVICE}/backend/dist
COPY --from=build /repo/services/${SERVICE}/backend/db services/${SERVICE}/backend/db
USER node
EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=3s --start-period=20s --retries=5 \
  CMD wget -qO- "http://localhost:3000/api/${SERVICE}/health" || exit 1
CMD ["sh", "-c", "exec node services/${SERVICE}/backend/dist/main.js"]
