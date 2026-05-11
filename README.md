# Architecture and code style

A starter set of architecture and code style docs for a new project. Use it as the seed when scaffolding a new Nx monorepo with a NestJS backend and a Next.js frontend.

## Where to start

- **[`AGENTS.md`](./AGENTS.md)** — prescriptive playbook for coding agents (human or AI). Code shapes, recipes, DO/DON'T. Start here when writing code.
- **[`docs/adr/`](./docs/adr/README.md)** — Architecture Decision Records (TL;DR + classic Context / Decision / Consequences). Start here when changing how the system works.
- **[`.claude/skills/`](./.claude/skills/README.md)** — task-scoped Claude Code skills (scaffold a context, add an event, wire an MCP tool, review architecture, etc.). Invocable as `/<skill-name>`.
- **[`CONTEXT.md`](./CONTEXT.md)** — Ubiquitous Language template. Fill in with the project's own domain terms. See ADR-0018.

## The system in one paragraph

The project is an **Nx monorepo** containing a **NestJS** backend (`apps/core` or `apps/api`) and one or more **Next.js** frontends. Backend bounded contexts live as Nx libraries under `libs/core/<context>` (or `libs/api/<context>`) and follow an 8-file convention (module, facade, controller, resolver, service, service.spec, queue, models). Layering and runtime separation are enforced at lint time by **Nx tag-based module boundaries** (`scope:* / type:* / target:*`). Every domain module exports exactly one provider — its **Facade**; internals stay private. Persistence is **Drizzle ORM + Postgres** (self-hosted or managed) via a single `DB_CONNECTION` DI token. The API surface is either **GraphQL-first** via Apollo (with `class-validator` inputs) OR **REST + MCP** for AI-native projects; in either case REST is available as escape hatch. AI-native projects expose **MCP tools** (`@rekog/mcp-nest`, Zod parameter schemas, per-call user authz) and an **in-UI assistant** (assistant-ui + Vercel AI SDK v6). Cross-context coordination uses validated **`DomainEvent<T>`** objects on a topic-routed bus (RabbitMQ self-hosted, SNS+SQS in AWS) or — in single-domain apps — direct service calls. Testing is **TDD** with NestJS `Test.createTestingModule` and `useValue` mocks. Config is **Zod-validated env**. Auth is **session + Passport** with email OTP or OAuth; external integrations (including AI agents) authenticate via OAuth flows, not parallel identity models. The frontend is **Apollo Client + Tailwind/Radix (shadcn) + Zustand + react-hook-form + Zod**. Every project keeps a **`CONTEXT.md`** Ubiquitous Language file at root.

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
| Deploy | Docker Compose (local) / SST → AWS / managed Postgres providers |
| AI integration | Vercel AI SDK + assistant-ui (in-UI), `@rekog/mcp-nest` (external MCP), LangGraph (graph-based agents) |
| Domain glossary | `CONTEXT.md` at repo root (single-context) or `CONTEXT-MAP.md` + per-context files (multi-context) |
