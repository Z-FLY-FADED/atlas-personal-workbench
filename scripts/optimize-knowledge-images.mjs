import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const sharpDirectory = (await fs.readdir('node_modules/.pnpm')).find(name => name.startsWith('sharp@'));
if (!sharpDirectory) throw new Error('Sharp is unavailable in the local dependency store.');
const sharp = require(path.resolve('node_modules/.pnpm', sharpDirectory, 'node_modules/sharp'));
let original = 0, optimized = 0;
for (const name of (await fs.readdir('public')).filter(name => /^knowledge-.*\.png$/.test(name))) {
  const input = path.join('public', name);
  const output = input.replace(/\.png$/, '.webp');
  await sharp(input).resize({ width: 1440, withoutEnlargement: true }).webp({ quality: 82 }).toFile(output);
  original += (await fs.stat(input)).size; optimized += (await fs.stat(output)).size;
}
console.log(JSON.stringify({ originalBytes: original, optimizedBytes: optimized, reduction: `${Math.round((1 - optimized / original) * 100)}%` }));

