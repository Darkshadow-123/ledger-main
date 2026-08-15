<div align="center">

<svg width="56" height="56" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M16 2L30 9V18C30 24.627 23.732 29.74 16 31C8.268 29.74 2 24.627 2 18V9L16 2Z" stroke="#6366f1" stroke-width="1.5" stroke-linejoin="round"/>
  <path d="M10 16.5L14 20.5L22 12.5" stroke="#6366f1" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>

<h1>Ledger</h1>

<p>AI spend enforcement, in realtime — built from scratch</p>

<p><em>A reverse proxy that sits between your app and any AI provider, enforcing per-user spending limits atomically before the provider ever gets called.</em></p>

<p>
  <img src="https://img.shields.io/badge/Next.js_15-000000?style=flat-square&logo=nextdotjs&logoColor=white" alt="Next.js"/>
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript"/>
  <img src="https://img.shields.io/badge/Node.js-339933?style=flat-square&logo=nodedotjs&logoColor=white" alt="Node.js"/>
  <img src="https://img.shields.io/badge/PostgreSQL-4169E1?style=flat-square&logo=postgresql&logoColor=white" alt="PostgreSQL"/>
  <img src="https://img.shields.io/badge/Redis-DC382D?style=flat-square&logo=redis&logoColor=white" alt="Redis"/>
  <img src="https://img.shields.io/badge/Clerk-6C47FF?style=flat-square&logo=clerk&logoColor=white" alt="Clerk"/>
</p>

</div>

---

## What is Ledger?

Ledger is a **self-hosted AI billing proxy** — every request from your app goes through it. Before hitting the AI provider, it checks whether the user has budget remaining. If they don't, it returns a `402` immediately. The provider never sees the request. Money never leaves.

- **Atomic spend enforcement** — Redis Lua script checks and increments in one operation, no race conditions
- **Per-user limits** — daily and monthly caps, configurable per user or overridden by admins
- **Real-time dashboard** — spend updates pushed to the browser via WebSocket within ~100ms of each request
- **Anomaly detection** — flags unusual spend spikes against a rolling baseline
- **Threshold alerts** — triggers at 80% and 100%, visible in the dashboard instantly
- **Multi-provider** — works with Groq (free tier) and OpenAI

---

## The Hard Parts

### Atomic billing with a Lua script

The naive approach — read the counter, check the limit, increment if okay — has a race condition. Two concurrent requests both read `$4.98` against a `$5.00` limit. Both pass. Both increment. The user gets charged `$5.06`.

The fix is collapsing the check and increment into a single atomic operation. Redis Lua scripts run as one transaction — nothing can interleave. The script reads the current spend, compares against the limit, and increments only if budget remains. One round trip. No window for a race.

Costs are stored as integers (×1e6) to avoid floating point bugs. `$0.003847` is stored as `3847`. Decimal.js handles all arithmetic — floats never touch billing.

```
checkAndIncrementAtomic(userId, cost, dailyLimit, monthlyLimit)
  → reads both counters
  → compares against limits in Lua
  → increments atomically or returns LIMIT_EXCEEDED
  → one round trip, zero race window
```

### Real-time spend updates without polling

The proxy responds to the user as soon as the AI provider returns, then hands off async via BullMQ. The worker writes the `UsageEvent` to Postgres, publishes to a Redis Pub/Sub channel, and a WebSocket subscriber pushes it to the browser. The spend meter in the dashboard updates without a refresh, without polling.

```
POST /proxy/chat
  → auth → limit check → call provider → atomic increment → return to user
                                                          ↓ async via BullMQ
                                               write UsageEvent to Postgres
                                                          ↓
                                               publish to Redis Pub/Sub
                                                          ↓
                                               push to browser via WebSocket
```

### Other decisions worth noting

- **Idempotency via DB constraint** — deduplication uses a unique constraint on `idempotencyKey` in Postgres. Prisma P2002 handles conflicts. Survives Redis restarts, no extra infra.
- **Cache stampede protection** — limits are cached in Redis. On a cache miss, a lock prevents a thundering herd from hitting Postgres simultaneously.
- **Counter recovery on cold start** — if Redis restarts and counters are wiped, the server rebuilds them from Postgres before accepting traffic.
- **Dynamic TTL** — counter keys expire at the exact day/month boundary, not a fixed duration from creation.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Browser / Client                    │
└────────────────────────┬────────────────────────────────┘
                         │ HTTP / WebSocket
┌────────────────────────▼────────────────────────────────┐
│                      API Server                         │
│                                                         │
│  Proxy Layer     → intercepts every AI provider call    │
│  Billing Layer   → atomic Redis counters + limits       │
│  Queue Layer     → BullMQ async usage processing        │
│  Analytics Layer → per-user spend queries               │
│  Alert Layer     → threshold + anomaly detection        │
└──────────┬──────────────────────┬───────────────────────┘
           │                      │
┌──────────▼──────┐    ┌──────────▼──────────────────────┐
│   PostgreSQL    │    │            Redis                │
│                 │    │                                 │
│  Users          │    │  Atomic spend counters (Lua)    │
│  UsageEvents    │    │  Pub/Sub (real-time events)     │
│  UserLimits     │    │  BullMQ queues                  │
│  Alerts         │    │  Idempotency keys               │
└─────────────────┘    └─────────────────────────────────┘
        ▲
        │ JWT verification + webhooks
┌───────┴─────────┐
│      Clerk      │
│  Auth + User    │
│  management     │
└─────────────────┘
```

---

## Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 18+ |
| Language | TypeScript (strict) |
| Backend | Express |
| Frontend | Next.js 15 (App Router) |
| Database | PostgreSQL + Prisma |
| Auth | Clerk |
| Cache / Counters | Redis (ioredis) |
| Job Queue | BullMQ |
| Real-time | WebSockets |
| Monorepo | Turborepo |
| Infra | Docker Compose |
| Styling | Tailwind CSS v4 + shadcn/ui |

---

## Getting Started

### Prerequisites
- Node.js 18+
- Docker + Docker Compose
- A [Clerk](https://clerk.com) account (free tier works)
- A [Groq](https://console.groq.com) API key (free) or OpenAI key

### 1. Clone and install

```bash
git clone https://github.com/Akhilesh-Singh-0/ledger.git
cd ledger
npm install
```

### 2. Set up environment variables

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
```

**`apps/api/.env`**
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

**`apps/web/.env.local`**
```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### 3. Start infrastructure

```bash
docker-compose up -d
```

### 4. Run migrations

```bash
cd apps/api
npx prisma migrate dev
npx prisma generate
cd ../..
```

### 5. Start everything

```bash
npm run dev
```

| Service | URL |
|---|---|
| Frontend | http://localhost:3000 |
| Backend | http://localhost:8000 |
| Health check | http://localhost:8000/health |

---

## Deployed

> Coming soon — deploying to Vercel + Railway.

| | URL |
|---|---|
| Frontend | https://ledger-web-mu.vercel.app |
| Backend | https://ledger-production-217e.up.railway.app |

---

## Monorepo Structure

```
ledger/
├── apps/
│   ├── api/     ← Express backend (port 8000)
│   └── web/     ← Next.js dashboard (port 3000)
├── docker-compose.yml
└── turbo.json
```

- [Backend README](apps/api/README.md) — API architecture, endpoints, env vars
- [Frontend README](apps/web/README.md) — Dashboard setup, hooks, component structure

---

## Why I Built This

I was building an AI feature and realized I had no real control over what it could cost. I could see spend after the fact, but nothing was stopping a bad request loop from running up a bill before I noticed. Every solution I found was either a managed service or just a dashboard layered on top of the same problem.

So I built the layer that was missing — something that sits in the request path and enforces limits before the money moves.

The interesting problems weren't the dashboard. They were the billing guarantees. What prevents two simultaneous requests from both slipping under the limit? What happens when Redis restarts and the counters are gone? What stops the limit check and the increment from drifting apart under load?

Working through those questions is why this project exists — and why I'm proud of it.


---

## License

MIT — use it, fork it, learn from it.

---

<div align="center">
  <sub>If this was useful or interesting — a ⭐ goes a long way.</sub>
</div>