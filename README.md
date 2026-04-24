# Solana Meme Indexer + Sniper

High-throughput Solana transaction indexing and automated execution stack for meme/launch ecosystems.

This project ingests live transactions from Solana in real time (Pump.fun, Raydium LaunchLab, PumpSwap, and Raydium), decodes and enriches those events, guarantees durable processing with Redis + Kafka, persists normalized data to PostgreSQL, and powers a low-latency sniper that matches user orders and places trades automatically.

---

## What This System Does

- Streams on-chain transactions over gRPC with minimal lag.
- Decodes protocol-specific instructions and transaction metadata in real time.
- Uses Redis and Kafka to reduce dropped events, smooth burst traffic, and support replay/recovery.
- Persists indexed data to PostgreSQL for querying, analytics, dashboards, and historical replay.
- Matches incoming market activity to user-defined order logic and executes trades via the sniper service.
- Exposes APIs/services used by execution workers and dashboard clients.

---

## Monorepo Layout

- `engine/`  
  Core real-time indexer/decoder pipeline for Solana transaction ingestion and normalization.

- `order/`  
  Order management + sniper execution service. Handles matching, trade orchestration, and worker processes.

- `raydium/`  
  Raydium-focused ingestion/decoding service and associated models/config.

- `dashboard/`  
  Frontend/admin surface for viewing indexed data and managing users/auth flows.

- `dev/`  
  Environment-specific local/deployment support files.

---

## High-Level Architecture

1. **Source ingestion (gRPC):** Subscribe to Solana transaction streams for target protocols.
2. **Decode + classify:** Parse instruction payloads and map to normalized domain events.
3. **Queue + cache safety layer:** Use Kafka for durable event transport and Redis for fast state/coordination.
4. **Persistence layer:** Store canonical transaction/event records in PostgreSQL via Prisma.
5. **Execution layer (sniper):** Evaluate user orders against live events and submit trades in real time.
6. **Serving/UI layer:** Expose APIs and dashboard views for monitoring, management, and analytics.

---

## Core Design Goals

- **Low latency:** near-real-time transaction decode and order matching.
- **High reliability:** no silent event loss during spikes or transient faults.
- **Replayability:** support backfill/reprocessing from queued streams.
- **Deterministic processing:** idempotent persistence/execution where possible.
- **Operational clarity:** logging, process management, and health checks for production maintenance.

---

## Tech Stack

- **Runtime / language:** TypeScript, Node.js, Bun (order service)
- **Chain access:** Solana Web3 + Yellowstone gRPC client
- **Protocol integrations:** Pump.fun, PumpSwap, Raydium (SDK/IDL-driven decoding)
- **Messaging:** Kafka
- **Fast state/cache:** Redis
- **Database:** PostgreSQL + Prisma
- **Process management:** PM2
- **Frontend:** React + TypeScript

---

## Data Flow (End-to-End)

1. gRPC subscribers receive newly confirmed/processed Solana transactions.
2. Decoder modules map raw instructions into protocol-specific semantic events.
3. Events are pushed through Kafka topics for buffering and consumer decoupling.
4. Redis stores short-lived state, locks, dedupe keys, and execution-side coordination values.
5. Consumers normalize and commit transaction/event entities to PostgreSQL.
6. Sniper workers evaluate order rules and risk constraints against live event streams.
7. Matching orders trigger execution handlers that submit and track trade transactions.
8. Final status and telemetry are persisted and surfaced to downstream APIs/dashboard.

---

## Reliability and Consistency Strategy

- **At-least-once delivery semantics** via queue-based fanout and consumer checkpoints.
- **Idempotent write patterns** to protect against duplicate event consumption.
- **Redis-assisted deduplication** for rapid duplicate suppression on hot paths.
- **Kafka replay capability** for crash recovery/backfills.
- **Process supervision** (PM2) for auto-restart and service continuity.
- **Separation of concerns** between ingestion, persistence, and execution services.

---

## Prerequisites

- Node.js 18+ (recommend matching `.nvmrc` where present)
- Bun (for `order/` service workflows)
- PostgreSQL (local or managed)
- Redis
- Kafka broker/cluster
- Solana RPC + gRPC access credentials/endpoints for production-grade streams

---

## Getting Started (Local Development)

### 1) Clone and install dependencies

```bash
git clone <your-repo-url>
cd SolanaMemeIndexer

cd engine && npm install
cd ../order && bun install
cd ../raydium && npm install
cd ../dashboard && npm install
```

### 2) Configure environment

Create environment files for each service (`engine`, `order`, `raydium`, and optionally `dashboard`) using your own secret values.

Typical required variables include:

- PostgreSQL connection URL
- Redis host/port/password
- Kafka brokers + topic names + consumer group IDs
- Solana RPC endpoint
- gRPC endpoint + auth token/headers
- Trading/execution wallet keys and related signer config
- Service ports / CORS / environment mode

> Keep all secrets out of git. Use secure secret management for staging/production.

### 3) Database setup

Run Prisma migrations in services that own schemas:

```bash
cd engine
npx prisma migrate deploy

cd ../order
npx prisma migrate deploy

cd ../raydium
npx prisma migrate deploy
```

### 4) Start infrastructure

Ensure PostgreSQL, Redis, and Kafka are running before starting app services.

### 5) Run services

```bash
# indexer engine
cd engine
npm run build
npm run dev

# order/sniper service (separate terminal)
cd order
bun run dev

# raydium service (separate terminal)
cd raydium
npm run build
npm run dev

# dashboard (optional, separate terminal)
cd dashboard
npm start
```

---

## Service Commands

### `engine/`

- `npm run build`
- `npm run dev`
- `npm run start`

### `order/`

- `bun run dev`
- `bun run start`
- `bun run pm2:start`
- `bun run pm2:status`
- `bun run health-check`

### `raydium/`

- `npm run build`
- `npm run dev`
- `npm run start`

### `dashboard/`

- `npm start`
- `npm run build`

---

## Production Operations

- Use PM2 (or container orchestration) for zero-touch restarts and process supervision.
- Separate Kafka topics/consumer groups by service domain to avoid cross-coupling.
- Configure alerts for:
  - consumer lag growth
  - decode failure rate
  - order execution failure rate
  - database write latency/errors
  - gRPC disconnect/reconnect churn
- Enable structured logging and centralized aggregation for incident triage.
- Introduce dead-letter topics/queues for poison messages.

---

## Security and Trading Safety

- Store private keys and signing credentials in a secure secret store (never plaintext in repo).
- Enforce strict per-order and global risk limits (size, slippage, exposure, and cooldowns).
- Add kill-switch controls to disable sniper execution instantly.
- Require explicit environment separation between paper/sim mode and live funds.
- Audit admin/user actions and sensitive configuration changes.

---

## Testing Recommendations

For a system of this scope, maintain:

- **Unit tests:** decoders, normalizers, order matching, risk checks.
- **Integration tests:** Redis/Kafka/Postgres interaction and idempotency behavior.
- **Replay tests:** historical event streams to verify deterministic outcomes.
- **Load tests:** burst traffic and consumer lag recovery.
- **Failure tests:** broker restarts, DB disconnects, gRPC interruption handling.

---

## Known Gaps to Fill (If Not Already Implemented)

- Explicit architecture diagrams (service-to-topic mapping)
- Runbook for incident response and replay procedures
- Environment variable templates (`.env.example` per service)
- End-to-end staging pipeline and smoke tests
- SLA/SLO definitions for indexing latency and execution latency

---

## Compliance and Risk Notice

Automated trading on volatile assets is high risk. This software is for infrastructure and execution automation; operators are responsible for legal/compliance requirements, jurisdictional restrictions, key custody, and financial risk controls.

---

## Contributing

1. Create a feature branch.
2. Keep changes scoped by service.
3. Add/update tests for behavior changes.
4. Run lint/type checks and service-level smoke tests.
5. Submit PR with clear operational impact notes.

---

## License

Set the project license and terms of use explicitly before production distribution.
