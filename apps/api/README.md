<div align="center">

<svg width="56" height="56" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M16 2L30 9V18C30 24.627 23.732 29.74 16 31C8.268 29.74 2 24.627 2 18V9L16 2Z" stroke="#6366f1" stroke-width="1.5" stroke-linejoin="round"/>
  <path d="M10 16.5L14 20.5L22 12.5" stroke="#6366f1" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>

<h1>Ledger API</h1>

<p>AI billing proxy — backend deep dive</p>

<p><em>Node.js + Express backend handling atomic spend enforcement, real-time WebSocket updates, background job processing, and per-user analytics.</em></p>

<p>
  <img src="https://img.shields.io/badge/Node.js-339933?style=flat-square&logo=nodedotjs&logoColor=white" alt="Node.js"/>
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript"/>
  <img src="https://img.shields.io/badge/PostgreSQL-4169E1?style=flat-square&logo=postgresql&logoColor=white" alt="PostgreSQL"/>
  <img src="https://img.shields.io/badge/Redis-DC382D?style=flat-square&logo=redis&logoColor=white" alt="Redis"/>
  <img src="https://img.shields.io/badge/Prisma-2D3748?style=flat-square&logo=prisma&logoColor=white" alt="Prisma"/>
  <img src="https://img.shields.io/badge/Clerk-6C47FF?style=flat-square&logo=clerk&logoColor=white" alt="Clerk"/>
</p>

<p>
  <a href="https://ledger-production-217e.up.railway.app"><strong>Live Demo</strong></a> ·
  <a href="../web/README.md"><strong>Frontend README</strong></a> ·
  <a href="https://twitter.com/singh_akhil2272"><strong>Building in Public</strong></a>
</p>

</div>

---

## What This Does

Every AI request from your app hits this server first. It verifies identity, checks spend limits atomically in Redis, forwards to the AI provider, and hands off to a background worker for logging and real-time updates — all before the response reaches the client.

The core guarantee: **a user can never exceed their limit**, even under concurrent load. The check and the increment are a single atomic Lua operation.

---

## Architecture

```
src/
├── app.ts                    ← Express app, middleware, routes
├── server.ts                 ← HTTP server, WebSocket init, PubSub
├── config/
│   ├── env.ts               ← Zod-validated env (fails fast on missing vars)
│   ├── redis.ts             ← ioredis client
│   └── prisma.ts            ← Prisma singleton with PrismaPg adapter
├── middleware/
│   ├── requestId.ts         ← UUID on every request via x-request-id
│   ├── auth.ts              ← Clerk JWT verification → req.user.id
│   ├── admin.ts             ← env-based admin allowlist
│   └── errorHandler.ts      ← Global error handler, structured responses
├── lib/
│   ├── AppError.ts          ← Custom error class
│   ├── pricing.ts           ← calculateCost(model, promptTokens, completionTokens)
│   ├── openai.ts            ← AI provider wrapper (Groq + OpenAI)
│   └── idempotency.ts       ← Deduplication logic
├── redis/
│   ├── counter.ts           ← Lua atomic counter, micro units (×1e6)
│   └── pubsub.ts            ← Separate publisher/subscriber connections
├── modules/
│   ├── auth/                ← Clerk webhook sync
│   ├── proxy/               ← POST /proxy/chat — full billing flow
│   ├── limits/              ← GET/PATCH /limits
│   ├── usage/               ← GET /usage/summary|breakdown|events|hourly
│   ├── admin/               ← GET/PATCH /admin/users
│   └── alerts/              ← GET/POST/DELETE/PATCH /alerts
├── queues/
│   ├── usage.queue.ts       ← BullMQ usage processing queue
│   └── alert.queue.ts       ← BullMQ alert processing queue
├── workers/
│   ├── usage.worker.ts      ← Writes UsageEvent, publishes to Redis
│   └── alert.worker.ts      ← Threshold checks + anomaly detection
└── websocket/
    ├── socket.server.ts     ← WebSocket server with Clerk JWT auth
    └── socket.rooms.ts      ← userId → Set<WebSocket> room management
```

---

## Request Lifecycle

Every call to `POST /proxy/chat` goes through this sequence:

```
POST /proxy/chat
  → requestId middleware          (UUID stamped on every request)
  → auth middleware               (Clerk JWT → req.user.id)
  → validate model
  → estimate prompt cost
  → checkCanProceed               (Redis cache → Postgres limits + Redis counters → 402 if over)
  → call AI provider              (Groq or OpenAI based on AI_PROVIDER env)
  → calculate actual cost
  → checkAndIncrementAtomic       (Lua script — atomic check + increment, no race window)
  → return response to client
  → [background via BullMQ]
      → write UsageEvent to Postgres
      → publish to Redis Pub/Sub
      → WebSocket pushes to browser
```

The response returns to the client before the background work starts. The user never waits for the DB write or WebSocket push.

---

## Performance

Load tested against the live Railway deployment (free tier, shared infrastructure):

| Metric | 50 connections | 100 connections |
|---|---|---|
| Throughput | ~134 req/s | ~295 req/s |
| Latency p50 | 320ms | 636ms |
| Latency p99 | 1579ms | 832ms |
| Duration | 10s | 15s |
| Errors | 0 | 86 |

> Baseline latency reflects Railway free-tier shared infrastructure, not application overhead. The architecture is horizontally scalable — the API and WebSocket servers are stateless and decouple via Redis Pub/Sub, meaning both can scale independently behind a load balancer.

---

## Key Engineering Decisions

| Decision | Why |
|---|---|
| Redis Lua script for billing | Atomic check-and-increment — no race window, no double-charging under concurrent load |
| Micro units (×1e6) for costs | `$0.003847` stored as `3847` — integer arithmetic, zero float precision bugs |
| DB unique constraint for idempotency | Deduplication via Prisma P2002 — survives Redis restarts, no extra infra needed |
| Separate Redis connections for Pub/Sub | Redis protocol requirement — a connection in subscribe mode can't issue other commands |
| Dynamic TTL on counters | Keys expire at the exact day/month boundary, not a fixed duration from creation |
| Cache stampede lock on limits | Prevents thundering herd hitting Postgres on cache miss |
| Counter recovery on cold start | Rebuilds Redis counters from Postgres if Redis restarts and data is lost |
| Auth webhook before express.json() | Svix needs the raw body for HMAC signature verification — parsing it first breaks the check |
| Decimal.js for all money | Floats are never used for financial calculations, anywhere |
| BullMQ for async processing | DB writes and WebSocket pushes happen off the critical path — request latency stays low |

---

## API Reference

### Proxy
| Method | Path | Description |
|---|---|---|
| POST | `/proxy/chat` | Send a prompt through Ledger — full billing flow |

### Usage
| Method | Path | Description |
|---|---|---|
| GET | `/usage/summary` | Daily + monthly spend summary |
| GET | `/usage/events` | Paginated request history |
| GET | `/usage/breakdown` | Spend broken down by model |
| GET | `/usage/hourly` | Hourly spend data for charts |

### Limits
| Method | Path | Description |
|---|---|---|
| GET | `/limits` | Get current daily and monthly limits |
| PATCH | `/limits` | Update limits |

### Alerts
| Method | Path | Description |
|---|---|---|
| GET | `/alerts` | List all alerts |
| POST | `/alerts` | Create a new alert |
| PATCH | `/alerts/:id/resolve` | Resolve a triggered alert |
| DELETE | `/alerts/:id` | Delete an alert |

### Admin
| Method | Path | Description |
|---|---|---|
| GET | `/admin/users` | List all users |
| PATCH | `/admin/users/:id/limits` | Override limits for a specific user |

### Auth
| Method | Path | Description |
|---|---|---|
| POST | `/auth/webhook` | Clerk webhook — syncs new users to Postgres |

### System
| Method | Path | Auth |
|---|---|---|
| GET | `/health` | Server, DB, and Redis status | — |

---

## What's Built

### ✅ Core Infrastructure
- [x] Zod-validated environment — fails fast on startup if any required var is missing
- [x] Global error handler with structured JSON responses
- [x] Request ID tracing via `x-request-id` header on every request
- [x] Health check with live DB and Redis status

### ✅ Auth
- [x] Clerk JWT middleware on every protected route
- [x] Admin allowlist middleware via env variable
- [x] Clerk webhook receiver — auto-syncs new users to Postgres (raw body preserved for Svix)

### ✅ Proxy + Billing
- [x] Prompt cost estimation before forwarding to provider
- [x] Atomic check-and-increment via Redis Lua script
- [x] 402 returned instantly if user is over limit — provider never called
- [x] Supports Groq and OpenAI, switchable via `AI_PROVIDER` env var
- [x] Idempotency — deduplication via DB unique constraint on `idempotencyKey`

### ✅ Limits
- [x] Per-user daily and monthly limits stored in Postgres
- [x] Redis cache with stampede lock on cache miss
- [x] Admin override for individual user limits

### ✅ Usage & Analytics
- [x] Full `UsageEvent` history per user
- [x] Daily and monthly spend summary
- [x] Per-model spend breakdown
- [x] Hourly spend data for time-series charts

### ✅ Alerts
- [x] Threshold alerts at 80% and 100% of limit
- [x] Anomaly detection against a rolling spend baseline
- [x] Alert resolution and deletion
- [x] BullMQ alert queue with dedicated worker

### ✅ Real-time
- [x] WebSocket server with Clerk JWT auth on connect
- [x] `userId → Set<WebSocket>` room management
- [x] Redis Pub/Sub — usage events published from worker, consumed by WebSocket server
- [x] Separate Redis connections for publisher and subscriber (protocol requirement)

### ✅ Background Jobs
- [x] BullMQ usage queue — DB writes happen off the critical path
- [x] BullMQ alert queue — threshold and anomaly checks run async
- [x] Graceful shutdown — workers drain cleanly on SIGTERM

---

## Environment Variables

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ledger
REDIS_URL=redis://localhost:6379
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SECRET=whsec_...
GROQ_API_KEY=gsk_...
OPENAI_API_KEY=sk-proj-...
AI_PROVIDER=groq
PORT=8000
NODE_ENV=development
```

---

## Running Locally

```bash
# From repo root
docker-compose up -d

cd apps/api
npm install
npx prisma migrate dev
npx prisma generate
npm run dev
```

API runs at `http://localhost:8000`
Health check at `http://localhost:8000/health`

---

## License

MIT — use it, fork it, learn from it.

---

<div align="center">
  <sub>If this was useful or interesting — a ⭐ goes a long way.</sub>
</div>