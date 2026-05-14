import { promises as fs } from 'node:fs';
import * as path from 'node:path';

const SKIP_FILES = new Set(['pnpm-lock.yaml', 'package-lock.json', 'yarn.lock']);
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'tmp', '.nx']);

// Mirrors scripts/init-template.sh: replaces the `appname` placeholder in
// every text file under `targetDir`. Skips lockfiles (they'll be regenerated
// on the next install) and obvious binary / vendored paths.
export async function initTemplate(
  targetDir: string,
  projectName: string,
): Promise<void> {
  const pascal = toPascalCase(projectName);
  for await (const file of walk(targetDir)) {
    const rel = path.relative(targetDir, file);
    if (rel.split(path.sep).some((seg) => SKIP_DIRS.has(seg))) continue;
    if (SKIP_FILES.has(path.basename(file))) continue;
    if (await looksBinary(file)) continue;

    const raw = await fs.readFile(file, 'utf8');
    const next = raw
      .replace(/\bappname\b/g, projectName)
      .replace(/\bAppname\b/g, pascal);
    if (next !== raw) {
      await fs.writeFile(file, next);
    }
  }
}

function toPascalCase(name: string): string {
  return name
    .split('-')
    .filter(Boolean)
    .map((segment) => segment[0]!.toUpperCase() + segment.slice(1))
    .join('');
}

async function* walk(dir: string): AsyncGenerator<string> {
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      yield* walk(full);
    } else if (entry.isFile()) {
      yield full;
    }
  }
}

// Heuristic: read first 4KB, treat as binary if it contains a NUL byte.
async function looksBinary(file: string): Promise<boolean> {
  const fh = await fs.open(file, 'r');
  try {
    const buf = Buffer.alloc(4096);
    const { bytesRead } = await fh.read(buf, 0, 4096, 0);
    for (let i = 0; i < bytesRead; i++) {
      if (buf[i] === 0) return true;
    }
    return false;
  } finally {
    await fh.close();
  }
}
