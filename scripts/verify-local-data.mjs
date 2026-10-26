import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
const backupDirectory = path.resolve(process.argv[2] || '.runtime/backups/workspace-before-repairs-20260914');
const liveDirectory = path.resolve('.wrangler/state/v3/d1/miniflare-D1DatabaseObject');
const manifest = JSON.parse(fs.readFileSync(path.join(backupDirectory, 'manifest.json'), 'utf8'));
const quote = name => '"' + name.replaceAll('"', '""') + '"';
let checkedTables = 0, checkedRows = 0;
for (const database of manifest.databases) {
  const before = new DatabaseSync(path.join(backupDirectory, database.name), { readOnly: true });
  const after = new DatabaseSync(path.join(liveDirectory, database.name), { readOnly: true });
  if (after.prepare('PRAGMA quick_check').get().quick_check !== 'ok') throw new Error('Database integrity check failed.');
  for (const { table } of database.tables) {
    if (['d1_migrations', 'sqlite_sequence', '_cf_METADATA'].includes(table)) continue;
    const columns = before.prepare(`PRAGMA table_info(${quote(table)})`).all().map(column => quote(column.name)).join(', ');
    const oldRows = before.prepare(`SELECT ${columns} FROM ${quote(table)}`).all();
    const currentRows = new Map();
    for (const row of after.prepare(`SELECT ${columns} FROM ${quote(table)}`).all()) { const key = JSON.stringify(row); currentRows.set(key, (currentRows.get(key) || 0) + 1); }
    for (const row of oldRows) { const key = JSON.stringify(row); if (!currentRows.get(key)) throw new Error(`Existing row changed or missing in ${table}. No data restored automatically.`); currentRows.set(key, currentRows.get(key) - 1); }
    checkedTables++; checkedRows += oldRows.length;
  }
  before.close(); after.close();
}
console.log(JSON.stringify({ intact: true, checkedTables, checkedRows, message: 'All original business rows and columns are unchanged. Additive schema and new rows are permitted.' }));
