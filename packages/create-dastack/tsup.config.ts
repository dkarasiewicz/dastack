import { defineConfig } from 'tsup';

// CommonJS output keeps the bin script trivially runnable on every Node
// version supported by `engines`. The shebang is injected into cli.cjs.
export default defineConfig({
  entry: { cli: 'src/cli.ts' },
  format: ['cjs'],
  outExtension: () => ({ js: '.cjs' }),
  target: 'node20',
  banner: { js: '#!/usr/bin/env node' },
  clean: true,
  sourcemap: false,
  minify: false,
});
