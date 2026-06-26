# ─────────────────────────────────────────────────────────────────────────────
# BillCraft AI — multi-stage Docker build
#
# Stage 1 (deps)    – install all npm dependencies (dev + prod)
# Stage 2 (builder) – run `next build` and produce .next/standalone
# Stage 3 (runner)  – minimal production image (~200 MB)
#
# Build:
#   docker build \
#     --build-arg NEXT_PUBLIC_SUPABASE_URL=... \
#     --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY=... \
#     --build-arg NEXT_PUBLIC_APP_URL=https://yourdomain.com \
#     --build-arg NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=... \
#     --build-arg NEXT_PUBLIC_PAYPAL_CLIENT_ID=... \
#     -t billcraft-ai:latest .
#
# Run:
#   docker run -p 3000:3000 --env-file .env.production billcraft-ai:latest
# ─────────────────────────────────────────────────────────────────────────────

# ── Stage 1: install dependencies ────────────────────────────────────────────
FROM node:24-alpine AS deps

# libc6-compat is required by some native Node modules on Alpine
RUN apk add --no-cache libc6-compat

WORKDIR /app

# Copy manifests first for layer caching
COPY package.json package-lock.json* ./

# Install all dependencies (devDependencies needed for the build stage)
RUN npm ci

# ── Stage 2: build ───────────────────────────────────────────────────────────
FROM node:24-alpine AS builder

WORKDIR /app

# Bring in installed node_modules from the deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy the rest of the source tree
COPY . .

# ─── NEXT_PUBLIC_* vars are embedded at build time ───────────────────────────
# Pass them via --build-arg. They CANNOT be changed at runtime.
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
ARG NEXT_PUBLIC_PAYPAL_CLIENT_ID

ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=$NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
ENV NEXT_PUBLIC_PAYPAL_CLIENT_ID=$NEXT_PUBLIC_PAYPAL_CLIENT_ID

# Suppress Next.js build telemetry
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# ── Stage 3: production runner ────────────────────────────────────────────────
FROM node:24-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Dedicated non-root user/group for runtime security
RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nextjs

# /app/public — static files served by Next.js
COPY --from=builder /app/public ./public

# Pre-create .next so chown works before copying into it
RUN mkdir -p .next && chown nextjs:nodejs .next

# Standalone server bundle — contains server.js + minimal node_modules
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./

# Static client assets (JS/CSS chunks, images)
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# server.js is emitted by Next.js standalone output at the project root
CMD ["node", "server.js"]
