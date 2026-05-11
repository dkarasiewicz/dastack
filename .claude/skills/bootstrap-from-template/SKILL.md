---
name: bootstrap-from-template
description: Use when the user asks to "start a new project", "bootstrap a repo from this template", "scaffold a new Nx workspace", "set up a fresh project with our stack", or names a brand-new project. Sets up an Nx monorepo, copies the ADRs/AGENTS.md/CONTEXT.md/skills from node-example, and wires up the canonical dependencies.
---

# bootstrap-from-template

Initialize a new project from the architecture template in `node-example`. Output: a working Nx workspace with the canonical stack, all 18 ADRs copied in, AGENTS.md and CONTEXT.md ready to fill, and `.claude/skills/` populated.

## When to use

- Starting a brand-new project that should follow this architecture.
- The user says "let's spin up a new repo for [product]".

## Inputs to confirm

1. **Project name** (becomes the npm scope `@<project>/...`, the directory name, and the Nx workspace name).
2. **API flavor**:
   - **Standard:** NestJS + GraphQL + Apollo.
   - **AI-native:** NestJS + REST + MCP server + Vercel AI SDK + assistant-ui.
3. **Infra flavor** (orthogonal to API flavor):
   - **Self-hosted / AWS-managed:** docker-compose + RabbitMQ (local) or SST + SNS+SQS (AWS); BullMQ + Redis for jobs; Passport + custom OTP for auth.
   - **Supabase:** Supabase Auth + Realtime + Postgres + Storage + pgmq/pg_cron for queues. See ADRs 0019–0023.
4. **Frontend count** — single Next.js app, or multiple?
5. **First bounded context to scaffold** (typically `auth` + one product context).

## Steps

1. **Create the Nx workspace:**

   ```bash
   pnpm dlx create-nx-workspace@latest <project> \
     --preset=nest \
     --appName=core \
     --packageManager=pnpm \
     --nxCloud=skip
   ```

   (Use `--preset=ts` and add Nest/Next manually if you need more control.)

2. **Add the Next.js frontend:**

   ```bash
   cd <project>
   pnpm nx g @nx/next:application apps/<ui-app>
   pnpm nx g @nx/next:application apps/<ui-app>-e2e --e2eTestRunner=playwright
   ```

3. **Copy the documentation skeleton from this template:**

   ```bash
   cp -R /Users/dkarasiewicz/WebstormProjects/node-example/docs ./
   cp /Users/dkarasiewicz/WebstormProjects/node-example/AGENTS.md ./
   cp /Users/dkarasiewicz/WebstormProjects/node-example/CONTEXT.md ./
   cp -R /Users/dkarasiewicz/WebstormProjects/node-example/.claude/skills ./.claude/
   ```

4. **Fill in `CONTEXT.md`** with the project's actual domain language. Lead with 2-3 core terms; add more as they emerge. Run the `update-context-md` skill iteratively.

5. **Install the canonical backend deps:**

   ```bash
   # Core Nest (both infra flavors)
   pnpm add @nestjs/config @nestjs/cache-manager @nestjs/schedule @nestjs/terminus
   # Logging
   pnpm add nestjs-pino pino-pretty
   # Drizzle
   pnpm add drizzle-orm pg && pnpm add -D drizzle-kit @types/pg
   # Validation
   pnpm add class-validator class-transformer zod
   ```

   **Self-hosted / AWS-managed infra flavor — add:**
   ```bash
   pnpm add @nestjs/passport @nestjs/bullmq bullmq
   pnpm add ioredis @keyv/redis connect-redis
   pnpm add express-session passport passport-custom bcrypt jsonwebtoken
   pnpm add -D @types/passport @types/express-session @types/bcrypt @types/jsonwebtoken
   ```

   **Supabase infra flavor — add:**
   ```bash
   pnpm add @supabase/supabase-js @supabase/ssr
   # pgmq + pg_cron are Postgres extensions, no npm deps
   ```

6. **Pick the API flavor and install accordingly:**

   **GraphQL (standard):**
   ```bash
   pnpm add @nestjs/apollo @nestjs/graphql @apollo/server @apollo/client @apollo/client-integration-nextjs graphql graphql-ws graphql-redis-subscriptions @as-integrations/express5
   ```

   **REST + MCP (AI-native):**
   ```bash
   pnpm add @rekog/mcp-nest @modelcontextprotocol/sdk ai @ai-sdk/anthropic @assistant-ui/react @assistant-ui/react-ai-sdk
   ```

7. **Pick the event transport and install:**

   **RabbitMQ (self-hosted, default for the standard infra flavor):**
   ```bash
   pnpm add @golevelup/nestjs-rabbitmq amqplib amqp-connection-manager
   ```

   **SNS+SQS (AWS via SST):**
   ```bash
   pnpm add @aws-sdk/client-sns @aws-sdk/client-sqs && pnpm add -D sst
   ```

   **pgmq (Supabase variant, Postgres-native):**
   ```bash
   # No npm deps. Enable extensions and create queues in a Supabase migration:
   # create extension if not exists pgmq;
   # create extension if not exists pg_cron;
   # select pgmq.create('domain_events');
   ```
   See ADR-0023 and the `use-supabase-queues` skill.

8. **Install frontend deps:**

   ```bash
   pnpm add zustand react-hook-form @hookform/resolvers next-themes sonner cmdk vaul lucide-react tailwind-merge clsx class-variance-authority
   pnpm add @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-popover @radix-ui/react-select @radix-ui/react-slot @radix-ui/react-toast # ...etc
   pnpm add -D tailwindcss @tailwindcss/postcss postcss autoprefixer tw-animate-css
   ```

9. **Set up `eslint.config.mjs`** with `@nx/enforce-module-boundaries` and the tag rules from ADR-0015 (use the template at the end of this skill).

10. **Scaffold the `common` lib** (DB, Redis, EventBus, Analytics, Health, decorators, models):

    ```bash
    pnpm nx g @nx/nest:library libs/core/common
    ```

    Copy the canonical structure (db/, redis/, eventbus/, analytics/, decorators/, health/, models/) from a reference project or build incrementally as contexts need them.

11. **Scaffold the first bounded context** using the `scaffold-bounded-context` skill (typically `auth`).

12. **Set up the local infra stack:**

    **Self-hosted / AWS-managed flavor** — add `docker-compose.yml` with Postgres, Redis, and (for RabbitMQ projects) RabbitMQ.

    **Supabase flavor** — initialize Supabase CLI:
    ```bash
    pnpm add -D supabase
    pnpm supabase init
    pnpm supabase start  # boots Postgres, Auth, Realtime, Storage, Studio, Inbucket in Docker
    pnpm supabase status # copy values into .env
    ```
    Use the `use-supabase-auth`, `use-supabase-storage`, and `use-supabase-queues` skills for the wiring.

13. **Initialize Drizzle:**

    ```bash
    # apps/core/drizzle.config.ts
    cat > apps/core/drizzle.config.ts << 'EOF'
    import { defineConfig } from 'drizzle-kit';
    export default defineConfig({
      schema: '../../libs/core/common/src/lib/db/schema.ts',
      out: './migrations',
      dialect: 'postgresql',
      dbCredentials: { url: process.env.DATABASE_URL! },
    });
    EOF
    ```

    Add the `migrate-generate`, `migrate-push`, `migrate-run`, `migrate-studio` targets to `apps/core/project.json`.

14. **Configure CI** (`.github/workflows/`):
    - `ci.yml` — lint, typecheck, unit tests on every PR (use `nx affected`).
    - `e2e.yml` — Playwright + supertest e2e on a schedule or merge.

15. **Commit the initial scaffold** as one commit — this is the "first commit" that becomes the future template foundation for the NEXT new project.

## Tag rules template (`eslint.config.mjs`)

Copy the rules block from ADR-0015. Tag every project at creation:

| Project type | Tags |
|---|---|
| `apps/core` (NestJS backend) | `scope:api`, `target:server` |
| `apps/<ui-app>` (Next.js) | `scope:ui`, `target:client` |
| `apps/*-e2e` | `scope:<area>`, `type:test` |
| `libs/core/<context>` (backend domain) | `scope:api`, `type:domain` or `type:feature`, `target:server` |
| `libs/shared/isomorphic/<package>` | `scope:shared`, `type:common` or `type:domain`, `target:isomorphic` |
| `libs/shared/client/<package>` | `scope:ui`, `type:domain`, `target:client` |

## Rules

- **DO** copy the entire `docs/adr/` directory and `AGENTS.md` and `.claude/skills/` from `node-example`. The new project starts on day 1 with the full template.
- **DO** strip date stamps from copied ADRs if you want to re-date them for the new project (or leave them as the canonical decision date).
- **DO** fill in `CONTEXT.md` early. Don't ship without at least the core 3-5 terms defined.
- **DO** pick ONE API flavor (GraphQL OR REST+MCP) and ONE infra flavor (self-hosted/AWS OR Supabase). The two axes are independent, but each axis is a one-time choice.
- **DON'T** pick multiple event transports. Choose one (Rabbit OR SNS+SQS OR pgmq).
- **DON'T** skip the Nx tag rules. Untagged libs silently bypass boundary enforcement.
- **DON'T** copy `MEMORY.md` or anything from `~/.claude/projects/`. Those are user-machine-specific.

## References

- All 18 ADRs in `docs/adr/`.
- ADR-0001: Nx monorepo layout.
- ADR-0015: Nx tag-based boundary enforcement.
- The `scaffold-bounded-context`, `add-drizzle-table`, and `update-context-md` skills for the next steps after the workspace exists.
