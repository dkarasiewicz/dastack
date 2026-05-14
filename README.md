# dastack

A starter set of architecture decisions, a prescriptive coding playbook, a Supabase-flavored Nx monorepo template, and Claude Code skills — everything needed to spin up a new product on day 1.

## Get started in one command

```bash
pnpm create dastack my-app
```

Or with `npm` / `yarn`:

```bash
npm create dastack@latest my-app
yarn create dastack my-app
```

The CLI fetches `templates/supabase/`, `docs/adr/`, `.claude/skills/`, `AGENTS.md`, and `CONTEXT.md` into `./my-app`, renames the `appname` placeholder, runs `git init` + `pnpm install`, and prints the next steps. See [`packages/create-dastack`](./packages/create-dastack/README.md) for flags and details.

## What's in this repo

- **[`packages/create-dastack/`](./packages/create-dastack/)** — the `pnpm create dastack` CLI (one-command project bootstrap).
- **[`templates/supabase/`](./templates/supabase/)** — the pre-built starter directory (Nx + Nest + Next + Drizzle + Supabase Auth/Realtime/Storage + pgmq queues + shadcn UI lib + OTP login, ready to copy). Manual bootstrap: copy + run [`scripts/init-template.sh`](./scripts/init-template.sh).
- **[`AGENTS.md`](./AGENTS.md)** — prescriptive playbook for coding agents (human or AI). Code shapes, recipes, DO/DON'T. Start here when writing code.
- **[`docs/adr/`](./docs/adr/README.md)** — Architecture Decision Records (TL;DR + classic Context / Decision / Consequences). Start here when changing how the system works.
- **[`.claude/skills/`](./.claude/skills/README.md)** — task-scoped Claude Code skills (scaffold a context, add an event, wire an MCP tool, review architecture, etc.). Invocable as `/<skill-name>`.
- **[`CONTEXT.md`](./CONTEXT.md)** — Ubiquitous Language template. Fill in with the project's own domain terms. See ADR-0018.

All four are copied into a new project by `pnpm create dastack` automatically.

## The system in one paragraph

The project is an **Nx monorepo** containing a **NestJS** backend (`apps/core` or `apps/api`) and one or more **Next.js** frontends. Backend bounded contexts live as Nx libraries under `libs/core/<context>` and follow an 8-file convention (module, facade, controller, resolver, service, service.spec, queue, models). Layering is enforced at lint time by **Nx tag-based module boundaries** (`scope:* / type:* / target:*`). Every domain module exports exactly one provider — its **Facade**; internals stay private. Persistence is **Drizzle ORM + Postgres** via a single `DB_CONNECTION` DI token. The decision space is **two-dimensional**: **API flavor** is GraphQL-first via Apollo OR REST + MCP for AI-native projects; **infra flavor** is self-hosted/AWS-managed (Redis + RabbitMQ or SNS+SQS + BullMQ + Passport+OTP) OR Supabase-managed (Auth + Realtime + Storage + pgmq + pg_cron). Both axes are orthogonal and both options on each axis share the same code conventions. Cross-context coordination uses validated **`DomainEvent<T>`** objects on the chosen transport. Testing is **TDD** with NestJS `Test.createTestingModule` and `useValue` mocks. Config is **Zod-validated env**. The frontend is **Apollo Client + Tailwind/Radix (shadcn) + Zustand + react-hook-form + Zod**. Every project keeps a **`CONTEXT.md`** Ubiquitous Language file at root.

## Tech stack at a glance

| Layer | Choice |
|-------|--------|
| Monorepo | Nx, pnpm, SWC, Webpack HMR for Nest |
| Backend framework | NestJS 11 |
| API | GraphQL (Apollo, code-first) + REST escape hatch; or REST + MCP for AI-native apps |
| ORM | Drizzle + node-postgres + Drizzle Kit migrations |
| Event bus | RabbitMQ topic exchange (self-hosted) or AWS SNS + SQS FIFO (managed) |
| Background jobs | BullMQ (Redis-backed) |
| Cache & sessions | Redis (`ioredis`, `connect-redis`, `@keyv/redis`) |
| Auth | `express-session` + Passport (email OTP / OAuth) |
| Logging | `nestjs-pino` per-class Logger |
| Config | Zod-validated env via `@nestjs/config` |
| Validation | `class-validator` for HTTP/GraphQL DTOs and event payloads; Zod for env, MCP tool params, AI SDK tool params, and frontend forms |
| Testing | Jest + `Test.createTestingModule`; Playwright e2e |
| Frontend | Next.js (App Router) + React |
| FE state | Apollo cache + Zustand (+ IndexedDB for offline) |
| FE forms | react-hook-form + Zod |
| FE UI | Tailwind v4 + Radix + shadcn (copy-in) |
| Analytics | PostHog |
| Deploy | Docker Compose (local) / SST → AWS / managed Postgres providers / Supabase |
| AI integration | Vercel AI SDK + assistant-ui (in-UI), `@rekog/mcp-nest` (external MCP), LangGraph (graph-based agents) |
| Domain glossary | `CONTEXT.md` at repo root (single-context) or `CONTEXT-MAP.md` + per-context files (multi-context) |
| Supabase variant | Auth + Realtime + Storage + pgmq/pg_cron — orthogonal to API flavor (ADRs 0019–0023) |
