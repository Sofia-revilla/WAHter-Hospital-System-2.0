# Build context is the repo root (see docker-compose.yml), because the
# service needs packages/shared and the workspace lockfile. Only this
# service's backend/ goes into the image; its frontend/ is bundled into the
# web app instead.
FROM node:22-alpine AS build
WORKDIR /repo

# every workspace manifest, so npm ci agrees with the root lockfile
COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/
COPY services/identity/backend/package.json services/identity/backend/
COPY services/clinical-records/backend/package.json services/clinical-records/backend/
COPY services/scheduling/backend/package.json services/scheduling/backend/
COPY services/orders-diagnostics/backend/package.json services/orders-diagnostics/backend/
COPY services/billing/backend/package.json services/billing/backend/
COPY services/interoperability/backend/package.json services/interoperability/backend/
COPY services/notifications/backend/package.json services/notifications/backend/
COPY services/audit-log/backend/package.json services/audit-log/backend/
RUN npm ci --workspace @wahter/shared --workspace @wahter/identity --include-workspace-root=false

COPY packages/shared packages/shared
COPY services/identity/backend services/identity/backend
RUN npm run build --workspace @wahter/shared && npm run build --workspace @wahter/identity

FROM node:22-alpine
WORKDIR /repo
ENV NODE_ENV=production
COPY --from=build /repo/node_modules node_modules
COPY --from=build /repo/packages/shared/package.json packages/shared/
COPY --from=build /repo/packages/shared/dist packages/shared/dist
COPY --from=build /repo/services/identity/backend/package.json services/identity/backend/
COPY --from=build /repo/services/identity/backend/dist services/identity/backend/dist
COPY --from=build /repo/services/identity/backend/db services/identity/backend/db
USER node
EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=3s --start-period=20s --retries=5 \
  CMD wget -qO- http://localhost:3000/api/identity/health || exit 1
CMD ["node", "services/identity/backend/dist/main.js"]
