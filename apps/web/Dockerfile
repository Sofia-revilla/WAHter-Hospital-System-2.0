# Build context is the repo root (see docker-compose.yml). The web app is the
# shell; each service's tab screens live in services/<name>/frontend and get
# bundled in here, and MEWS comes from packages/shared.
FROM node:22-alpine AS build
WORKDIR /repo

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
RUN npm ci --workspace @wahter/web --workspace @wahter/shared --include-workspace-root=false

COPY packages/shared packages/shared
COPY services/identity/frontend services/identity/frontend
COPY services/clinical-records/frontend services/clinical-records/frontend
COPY services/scheduling/frontend services/scheduling/frontend
COPY services/orders-diagnostics/frontend services/orders-diagnostics/frontend
COPY services/billing/frontend services/billing/frontend
COPY services/interoperability/frontend services/interoperability/frontend
COPY services/notifications/frontend services/notifications/frontend
COPY services/audit-log/frontend services/audit-log/frontend
COPY apps/web apps/web

# NEXT_PUBLIC_* values are baked in at build time, so this has to be a build arg
ARG NEXT_PUBLIC_API_URL=/api
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
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
