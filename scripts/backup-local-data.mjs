import { DatabaseSync, backup } from 'node:sqlite';
import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { createHash } from 'node:crypto';

const root = resolve(import.meta.dirname, '..');
const source = join(root, '.wrangler/state/v3/d1/miniflare-D1DatabaseObject');
const target = resolve(root, process.argv[2] || `.runtime/backups/workspace-${new Date().toISOString().replace(/[:.]/g, '-')}`);
mkdirSync(target, { recursive: true });
if (existsSync(join(target, 'manifest.json'))) throw new Error('Backup already exists; choose a new directory.');
const manifest = { createdAt: new Date().toISOString(), databases: [] };
for (const name of readdirSync(source).filter(name => name.endsWith('.sqlite'))) {
  const db = new DatabaseSync(join(source, name), { readOnly: true });
  await backup(db, join(target, name));
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all();
  const records = tables.map(({ name: table }) => {
    const rows = db.prepare(`SELECT * FROM "${table.replaceAll('"', '""')}"`).all().sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
    return { table, count: rows.length, sha256: createHash('sha256').update(JSON.stringify(rows)).digest('hex') };
  });
  manifest.databases.push({ name, tables: records });
  db.close();
}
writeFileSync(join(target, 'manifest.json'), JSON.stringify(manifest, null, 2));
console.log(JSON.stringify({ backup: target, databases: manifest.databases.map(db => ({ name: db.name, tables: db.tables.map(({ table, count }) => ({ table, count })) })) }, null, 2));
