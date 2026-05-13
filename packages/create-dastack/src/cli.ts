import { execSync, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import * as path from 'node:path';
import * as pc from 'picocolors';
import tiged from 'tiged';
import { initTemplate } from './init.js';

interface Options {
  projectName: string;
  install: boolean;
  git: boolean;
  ref: string;
}

const REPO = 'dkarasiewicz/dastack';

const FETCHES: { from: string; to: string }[] = [
  { from: 'templates/supabase', to: '.' },
  { from: 'docs', to: 'docs' },
  { from: '.claude/skills', to: '.claude/skills' },
];

const COPY_FILES = ['AGENTS.md', 'CONTEXT.md'];

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const target = path.resolve(process.cwd(), options.projectName);

  if (existsSync(target)) {
    fail(`Target directory ${pc.cyan(options.projectName)} already exists. Refusing to overwrite.`);
  }

  console.log(pc.bold(`Creating ${pc.cyan(options.projectName)} from ${pc.cyan(REPO)}@${options.ref}`));
  await mkdir(target, { recursive: true });

  for (const { from, to } of FETCHES) {
    const dest = path.join(target, to);
    console.log(`  ${pc.dim('→')} fetching ${pc.cyan(`${REPO}/${from}`)}`);
    await fetch(`${REPO}/${from}#${options.ref}`, dest);
  }

  // AGENTS.md / CONTEXT.md live at the repo root — fetch the root, but pick
  // only the two files we care about via tiged's `files` option.
  console.log(`  ${pc.dim('→')} fetching ${pc.cyan('AGENTS.md, CONTEXT.md')}`);
  await fetch(`${REPO}#${options.ref}`, target, COPY_FILES);

  console.log(`  ${pc.dim('→')} renaming ${pc.cyan('appname')} → ${pc.cyan(options.projectName)}`);
  await initTemplate(target, options.projectName);

  if (options.git) {
    console.log(`  ${pc.dim('→')} initializing git`);
    run('git', ['init', '-q'], target);
    run('git', ['add', '-A'], target);
    run('git', ['commit', '-q', '-m', 'chore: bootstrap from dastack'], target);
  }

  if (options.install) {
    console.log(`  ${pc.dim('→')} running ${pc.cyan('pnpm install')}`);
    run('pnpm', ['install'], target);
  }

  console.log();
  console.log(pc.green('✓ Done.'));
  console.log();
  console.log(`Next steps:`);
  console.log(`  cd ${pc.cyan(options.projectName)}`);
  if (!options.install) console.log(`  pnpm install`);
  console.log(`  pnpm supabase start            ${pc.dim('# boots Postgres / Auth / Realtime / Storage / Studio locally')}`);
  console.log(`  pnpm supabase status           ${pc.dim('# values for .env')}`);
  console.log(`  cp .env.example .env && $EDITOR .env`);
  console.log(`  pnpm nx run api:migrate-run`);
  console.log(`  pnpm nx serve api              ${pc.dim('# backend on http://localhost:3000')}`);
  console.log(`  pnpm nx serve ui               ${pc.dim('# frontend on http://localhost:4200 (other terminal)')}`);
}

async function fetch(source: string, dest: string, files?: string[]): Promise<void> {
  const emitter = tiged(source, {
    cache: false,
    force: true,
    verbose: false,
  });
  if (files && files.length > 0) {
    // tiged doesn't have a built-in "only these files" option; clone the
    // root to a tmp dir then copy the requested files over.
    const tmp = path.join(dest, '.tiged-tmp');
    await tiged(source, { cache: false, force: true, verbose: false }).clone(tmp);
    await Promise.all(
      files.map(async (file) => {
        const src = path.join(tmp, file);
        const dst = path.join(dest, file);
        if (existsSync(src)) {
          await import('node:fs/promises').then(({ copyFile }) => copyFile(src, dst));
        }
      }),
    );
    await import('node:fs/promises').then(({ rm }) => rm(tmp, { recursive: true, force: true }));
    return;
  }
  await emitter.clone(dest);
}

function run(cmd: string, args: string[], cwd: string): void {
  const result = spawnSync(cmd, args, { cwd, stdio: 'inherit' });
  if (result.status !== 0) {
    fail(`${cmd} ${args.join(' ')} failed with code ${result.status}`);
  }
}

function parseArgs(argv: string[]): Options {
  const options: Partial<Options> = { install: true, git: true, ref: 'main' };
  const positionals: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    switch (arg) {
      case '--no-install':
        options.install = false;
        break;
      case '--no-git':
        options.git = false;
        break;
      case '--ref':
        options.ref = argv[++i] ?? 'main';
        break;
      case '-h':
      case '--help':
        printHelp();
        process.exit(0);
      // eslint-disable-next-line no-fallthrough
      default:
        if (arg.startsWith('-')) fail(`Unknown flag: ${arg}`);
        positionals.push(arg);
    }
  }

  const projectName = positionals[0];
  if (!projectName) {
    printHelp();
    process.exit(1);
  }
  if (!/^[a-z][a-z0-9-]*$/.test(projectName)) {
    fail(`Project name must be lowercase kebab-case (e.g. my-app). Got: ${projectName}`);
  }
  if (projectName === 'appname') {
    fail(`'appname' is the placeholder itself — pick a different name.`);
  }

  return { ...options, projectName } as Options;
}

function printHelp(): void {
  console.log(`
${pc.bold('create-dastack')} — scaffold a new project from the dastack Supabase template.

${pc.bold('Usage:')}
  pnpm create dastack <project-name> [flags]

${pc.bold('Flags:')}
  --no-install    Skip ${pc.cyan('pnpm install')} after scaffolding.
  --no-git        Skip ${pc.cyan('git init')} + initial commit.
  --ref <ref>     Branch, tag, or commit to fetch from (default: main).
  -h, --help      Show this help.

${pc.bold('Example:')}
  pnpm create dastack my-app
  pnpm create dastack my-app --no-install --ref some-branch
`);
}

function fail(msg: string): never {
  console.error(pc.red('error: ') + msg);
  process.exit(1);
}

main().catch((err: unknown) => {
  fail(err instanceof Error ? err.message : String(err));
});
