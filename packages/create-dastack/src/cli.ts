import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { copyFile, mkdir, rm } from 'node:fs/promises';
import * as path from 'node:path';
import { cancel, intro, log, note, outro, spinner } from '@clack/prompts';
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

  intro(pc.bgCyan(pc.black(' create-dastack ')));

  if (existsSync(target)) {
    fail(`Target directory ${pc.cyan(projectName)} already exists. Refusing to overwrite.`);
  }

  log.message(`${pc.dim('repo:')} ${pc.cyan(REPO)} ${pc.dim('@')} ${pc.cyan(options.ref)}`);
  log.message(`${pc.dim('into:')} ${pc.cyan(`./${projectName}`)}`);
  await mkdir(target, { recursive: true });

  for (const { from, to } of FETCHES) {
    const s = spinner();
    s.start(`Fetching ${pc.cyan(`${REPO}/${from}`)}`);
    try {
      await fetch(`${REPO}/${from}#${options.ref}`, path.join(target, to));
      s.stop(`Fetched  ${pc.cyan(`${REPO}/${from}`)}`);
    } catch (err) {
      s.stop(`Failed to fetch ${pc.cyan(`${REPO}/${from}`)}`, 1);
      throw err;
    }
  }

  // AGENTS.md / CONTEXT.md live at the repo root — fetch the root, but pick
  // only the two files we care about via tiged's `files` option.
  const sFiles = spinner();
  sFiles.start(`Fetching ${pc.cyan(COPY_FILES.join(', '))}`);
  await fetch(`${REPO}#${options.ref}`, target, COPY_FILES);
  sFiles.stop(`Fetched  ${pc.cyan(COPY_FILES.join(', '))}`);

  const sRename = spinner();
  sRename.start(`Renaming ${pc.cyan('appname')} → ${pc.cyan(projectName)}`);
  await initTemplate(target, projectName);
  sRename.stop(`Renamed  ${pc.cyan('appname')} → ${pc.cyan(projectName)}`);

  if (options.git) {
    const s = spinner();
    s.start('Initializing git');
    run('git', ['init', '-q'], target);
    run('git', ['add', '-A'], target);
    run('git', ['commit', '-q', '-m', 'chore: bootstrap from dastack'], target);
    s.stop('Initialized git');
  }

  if (options.install) {
    const s = spinner();
    s.start(`Running ${pc.cyan('pnpm install')}`);
    run('pnpm', ['install'], target, true);
    s.stop(`Installed dependencies`);
  }

  const steps = [
    `cd ${pc.cyan(projectName)}`,
    ...(!options.install ? [`pnpm install`] : []),
    `pnpm supabase start            ${pc.dim('# Postgres / Auth / Realtime / Storage / Studio')}`,
    `pnpm supabase status           ${pc.dim('# values for .env')}`,
    `cp .env.example .env && $EDITOR .env`,
    `pnpm nx run api:migrate-run`,
    `pnpm nx serve api              ${pc.dim('# http://localhost:3000')}`,
    `pnpm nx serve ui               ${pc.dim('# http://localhost:4200')}`,
  ];
  note(steps.join('\n'), 'Next steps');

  outro(pc.green(`✓ ${pc.bold(projectName)} ready.`));
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

function run(cmd: string, args: string[], cwd: string, quiet = false): void {
  const result = spawnSync(cmd, args, {
    cwd,
    stdio: quiet ? ['ignore', 'ignore', 'inherit'] : 'inherit',
  });
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
  cancel(msg);
  process.exit(1);
}
