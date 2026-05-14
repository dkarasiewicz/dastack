import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { copyFile, mkdir, rm } from 'node:fs/promises';
import * as path from 'node:path';
import { Command, InvalidArgumentError } from 'commander';
import * as pc from 'picocolors';
import tiged from 'tiged';
import { initTemplate } from './init.js';

interface Options {
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

const program = new Command();

program
  .name('create-dastack')
  .description('Scaffold a new project from the dastack Supabase template.')
  .argument('<project-name>', 'kebab-case project name (e.g. my-app)', parseProjectName)
  .option('--no-install', `Skip ${pc.cyan('pnpm install')} after scaffolding.`)
  .option('--no-git', `Skip ${pc.cyan('git init')} + initial commit.`)
  .option('--ref <ref>', 'Branch, tag, or commit to fetch from.', 'main')
  .addHelpText(
    'after',
    `
${pc.bold('Examples:')}
  $ pnpm create dastack my-app
  $ pnpm create dastack my-app --no-install --ref some-branch
`,
  )
  .action(async (projectName: string, options: Options) => {
    await scaffold(projectName, options);
  });

program.parseAsync(process.argv).catch((err: unknown) => {
  fail(err instanceof Error ? err.message : String(err));
});

async function scaffold(projectName: string, options: Options): Promise<void> {
  const target = path.resolve(process.cwd(), projectName);

  if (existsSync(target)) {
    fail(`Target directory ${pc.cyan(projectName)} already exists. Refusing to overwrite.`);
  }

  console.log(pc.bold(`Creating ${pc.cyan(projectName)} from ${pc.cyan(REPO)}@${options.ref}`));
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

  console.log(`  ${pc.dim('→')} renaming ${pc.cyan('appname')} → ${pc.cyan(projectName)}`);
  await initTemplate(target, projectName);

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
  console.log(`  cd ${pc.cyan(projectName)}`);
  if (!options.install) console.log(`  pnpm install`);
  console.log(`  pnpm supabase start            ${pc.dim('# boots Postgres / Auth / Realtime / Storage / Studio locally')}`);
  console.log(`  pnpm supabase status           ${pc.dim('# values for .env')}`);
  console.log(`  cp .env.example .env && $EDITOR .env`);
  console.log(`  pnpm nx run api:migrate-run`);
  console.log(`  pnpm nx serve api              ${pc.dim('# backend on http://localhost:3000')}`);
  console.log(`  pnpm nx serve ui               ${pc.dim('# frontend on http://localhost:4200 (other terminal)')}`);
}

async function fetch(source: string, dest: string, files?: string[]): Promise<void> {
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
          await copyFile(src, dst);
        }
      }),
    );
    await rm(tmp, { recursive: true, force: true });
    return;
  }
  await tiged(source, { cache: false, force: true, verbose: false }).clone(dest);
}

function run(cmd: string, args: string[], cwd: string): void {
  const result = spawnSync(cmd, args, { cwd, stdio: 'inherit' });
  if (result.status !== 0) {
    fail(`${cmd} ${args.join(' ')} failed with code ${result.status}`);
  }
}

function parseProjectName(value: string): string {
  if (!/^[a-z][a-z0-9-]*$/.test(value)) {
    throw new InvalidArgumentError(
      `Project name must be lowercase kebab-case (e.g. my-app). Got: ${value}`,
    );
  }
  if (value === 'appname') {
    throw new InvalidArgumentError(`'appname' is the placeholder itself — pick a different name.`);
  }
  return value;
}

function fail(msg: string): never {
  console.error(pc.red('error: ') + msg);
  process.exit(1);
}
