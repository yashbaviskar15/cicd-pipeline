# 0005 · PostgreSQL + Prisma for the data layer

- **Status:** Accepted
- **Date:** 2026-11-11
- **Deciders:** Backend

## Context

The API needs durable storage for users and tasks with relational integrity
(tasks belong to users), transactions, and a migration story that works in CI
and on ECS Fargate. The application is Node.js/TypeScript-adjacent (plain JS +
JSDoc) and must stay low-cost.

## Decision

We will use **PostgreSQL** (RDS `db.t4g.micro`, free-tier eligible) with
**Prisma** as the ORM and migration tool. A `db_query_duration_seconds`
histogram wraps every repository call so DB latency is observable.

## Consequences

**Positive**

- Relational integrity and transactions for free; Postgres is the boring,
  well-understood default.
- Prisma gives a typed client, a single `schema.prisma`, and deterministic
  `prisma migrate deploy` migrations that run from the container entrypoint
  (`RUN_MIGRATIONS=true`) — turnkey locally and in CI.
- Migrations are versioned SQL committed to the repo, so schema changes are
  reviewed like code.
- Easy to instrument: one wrapper records latency for every operation.

**Negative / trade-offs**

- Prisma adds a build step (`prisma generate`) to the image build and a binary
  engine to the runtime image size.
- Running migrations from the app entrypoint is convenient but not ideal for
  prod at scale; the recommended pattern is a one-off migration task before the
  deploy, which the docs describe.

**Neutral**

- Credentials are injected via Secrets Manager (`DATABASE_URL`), never baked
  into the image.
