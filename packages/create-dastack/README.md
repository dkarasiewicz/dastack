# create-dastack

Scaffold a new project from the [dastack](https://github.com/dkarasiewicz/dastack) Supabase template — Nx + NestJS + Next.js + Drizzle + Supabase Auth / Realtime / Storage / pgmq + shadcn UI lib, with the canonical ADRs, `AGENTS.md`, `CONTEXT.md`, and `.claude/skills/` all dropped in.

## Usage

```bash
pnpm create dastack my-app
```

Or with `npm` / `yarn`:

```bash
npm create dastack@latest my-app
yarn create dastack my-app
```

## What gets fetched

| Source (in [`dkarasiewicz/dastack`](https://github.com/dkarasiewicz/dastack)) | Lands in |
|---|---|
| `templates/supabase/` | `./my-app/` (the workspace root) |
| `docs/` | `./my-app/docs/` (ADRs) |
| `.claude/skills/` | `./my-app/.claude/skills/` |
| `AGENTS.md`, `CONTEXT.md` | `./my-app/` (root) |

The `appname` placeholder is replaced with your project name across all text files (`@appname/*` npm scopes, `Appname` PascalCase references, the Supabase `project_id`).

## Flags

| Flag | Default | Effect |
|---|---|---|
| `--no-install` | install on | Skip `pnpm install`. |
| `--no-git` | git init on | Skip `git init` + initial commit. |
| `--ref <ref>` | `main` | Branch / tag / commit to fetch from. Use a tag for stability or `main` for the latest. |

## Requirements

- Node ≥ 20
- `pnpm` (only if you want auto-install)
- Public network access to GitHub (uses `tiged` to fetch subdirectories without `.git` history)

## After scaffolding

```bash
cd my-app
pnpm supabase start            # boots Postgres / Auth / Realtime / Storage / Studio locally
pnpm supabase status           # values for .env
cp .env.example .env && $EDITOR .env
pnpm nx run api:migrate-run
pnpm nx serve api              # backend on http://localhost:3000
pnpm nx serve ui               # frontend on http://localhost:4200 (other terminal)
```

See `docs/adr/` for the architectural decisions baked into the template, and `AGENTS.md` for the prescriptive coding playbook.

## Maintainer: publishing

```bash
cd packages/create-dastack
pnpm install
pnpm run build
npm publish --access public
```

Bump `version` in `package.json` first. The `prepublishOnly` script runs the build automatically.

## License

MIT.
