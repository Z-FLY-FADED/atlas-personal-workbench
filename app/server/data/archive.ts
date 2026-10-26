import { ARCHIVE_LABELS, ARCHIVE_TABLES, MAX_ARCHIVE_BYTES, archiveChecksum, type ArchiveRow, type WorkspaceArchive } from '../../contracts/archive';
import { validateAttachment } from "../../features/career/domain/materials";
export { ARCHIVE_LABELS, ARCHIVE_TABLES, MAX_ARCHIVE_BYTES, archiveChecksum, type ArchiveRow, type WorkspaceArchive } from '../../contracts/archive';
export const quoteColumn = (name: string) => `"${name.replaceAll('"', '""')}"`;
export async function workspaceIdentity(db: D1Database, owner: string, create = false) {
    let row = await db.prepare("SELECT value FROM workspace_settings WHERE owner_id = ? AND key = 'workspace-id'").bind(owner).first<{
        value: string;
    }>();
    if (!row && create) {
        await db.prepare("INSERT INTO workspace_settings (id,owner_id,key,value) VALUES (?,?,'workspace-id',?) ON CONFLICT(owner_id,key) DO NOTHING").bind(crypto.randomUUID(), owner, crypto.randomUUID()).run();
        row = await db.prepare("SELECT value FROM workspace_settings WHERE owner_id = ? AND key = 'workspace-id'").bind(owner).first<{
            value: string;
        }>();
    }
    return row?.value || '';
}
export async function exportWorkspace(db: D1Database, owner: string): Promise<WorkspaceArchive> {
    const workspaceId = await workspaceIdentity(db, owner, true);
    const tables: Record<string, ArchiveRow[]> = {};
    // D1 batches run in one transaction, so related records share one snapshot.
    const results = await db.batch<ArchiveRow>([
        ...ARCHIVE_TABLES.map(table => db.prepare(`SELECT * FROM ${quoteColumn(table)} WHERE owner_id = ?`).bind(owner)),
        db.prepare('SELECT * FROM instruments WHERE id IN (SELECT instrument_id FROM watchlist_items WHERE owner_id = ?)').bind(owner),
    ]);
    for (const [index, table] of ARCHIVE_TABLES.entries()) {
        const result = results[index];
        tables[table] = result.results.filter(row => table !== 'workspace_settings' || row.key !== 'workspace-id').map(row => Object.fromEntries(Object.entries(row).filter(([key]) => key !== 'owner_id')));
    }
    // Catalog records referenced by the owner's watchlist are data, not credentials.
    tables.instruments = results[ARCHIVE_TABLES.length].results;
    return { format: 'atlas-workspace', version: 1, createdAt: new Date().toISOString(), workspaceId, tables, checksum: await archiveChecksum(tables) };
}
type Column = {
    name: string;
    type: string;
    notnull: number;
    pk: number;
    dflt_value: string | null;
};
export async function inspectArchive(db: D1Database, owner: string, input: unknown) {
    const archive = input as WorkspaceArchive;
    if (!archive || archive.format !== 'atlas-workspace' || archive.version !== 1 || !archive.tables || typeof archive.tables !== 'object' || Array.isArray(archive.tables) || typeof archive.workspaceId !== 'string' || !archive.workspaceId || archive.workspaceId.length > 200 || typeof archive.createdAt !== 'string' || !Number.isFinite(Date.parse(archive.createdAt)))
        throw new Error('不是受支持的 ATLAS 备份文件');
    if (new TextEncoder().encode(JSON.stringify(archive)).byteLength > MAX_ARCHIVE_BYTES || archive.checksum !== await archiveChecksum(archive.tables))
        throw new Error('文件超过 50 MB 或校验失败，请重新导出');
    if (Object.keys(archive.tables).some(table => ![...ARCHIVE_TABLES, 'instruments'].includes(table as typeof ARCHIVE_TABLES[number])))
        throw new Error('备份包含不支持的数据表');
    const currentId = await workspaceIdentity(db, owner);
    const businessTables = ARCHIVE_TABLES.filter(table => table !== 'workspace_settings');
    const count = await db.prepare(`SELECT ${businessTables.map(table => `(SELECT COUNT(*) FROM ${quoteColumn(table)} WHERE owner_id = ?)`).join(' + ')} AS count`).bind(...businessTables.map(() => owner)).first<{
        count: number;
    }>();
    if (currentId !== archive.workspaceId && (count?.count || 0) > 0)
        throw new Error('这是另一工作台的备份。当前库已有数据，请使用原工作台备份或在空库中恢复。');
    const statements: D1PreparedStatement[] = [];
    const summary: Array<{
        table: string;
        name: string;
        total: number;
        missing: number;
        existing: number;
    }> = [];
    let rowCount = 0;
    const ordered = ['instruments', ...ARCHIVE_TABLES];
    for (const table of ordered) {
        const rows = archive.tables[table] || [];
        if (!Array.isArray(rows))
            throw new Error('备份记录格式无效');
        rowCount += rows.length;
        if (rowCount > 5000)
            throw new Error('此恢复入口每次支持最多 5000 条记录');
        const columns = (await db.prepare(`PRAGMA table_info(${quoteColumn(table)})`).all<Column>()).results;
        const allowed = new Map(columns.map(column => [column.name, column]));
        const keys = table === 'workspace_settings' ? ['owner_id', 'key'] : columns.filter(column => column.pk).sort((a, b) => a.pk - b.pk).map(column => column.name);
        if (!keys.length)
            throw new Error('备份与当前数据库版本不兼容');
        const existingRows = (await db.prepare(`SELECT * FROM ${quoteColumn(table)}${table === 'instruments' ? '' : ' WHERE owner_id = ?'}`).bind(...(table === 'instruments' ? [] : [owner])).all<ArchiveRow>()).results;
        const keyOf = (row: ArchiveRow) => JSON.stringify(keys.map(key => row[key]));
        const existing = new Map(existingRows.map(row => [keyOf(row), row]));
        let missing = 0;
        for (const raw of rows) {
            if (!raw || typeof raw !== 'object' || Array.isArray(raw) || Object.hasOwn(raw, 'owner_id'))
                throw new Error('备份含有无效的账户字段');
            const row: ArchiveRow = table === 'instruments' ? { ...raw } : { ...raw, owner_id: owner };
            if (table === 'workspace_settings' && row.key === 'workspace-id')
                throw new Error('备份不得修改工作台身份字段');
            if (table === 'learning_cards') {
                let card: Record<string, unknown>;
                try {
                    card = JSON.parse(String(row.card));
                }
                catch {
                    throw new Error('复习卡片状态无效');
                }
                if (!card || typeof card !== 'object' || Array.isArray(card) || !['英语学习', '日语学习', '专业知识'].includes(String(row.language)) || !Number.isFinite(Date.parse(String(card.due))) || !Number.isFinite(Date.parse(String(row.due_at))) || ![0, 1, 2, 3].includes(Number(card.state)) || ['stability', 'difficulty', 'elapsed_days', 'scheduled_days', 'reps', 'lapses'].some(key => typeof card[key] !== 'number' || !Number.isFinite(card[key]) || Number(card[key]) < 0))
                    throw new Error('复习卡片状态无效');
            }
            if (table === 'career_attachments') {
                const file = validateAttachment(String(row.file_name), String(row.data_base64));
                if (file.size !== row.size || file.mime !== row.mime_type)
                    throw new Error('附件记录不完整');
            }
            if (table === 'recycled_records') {
                const source = RECYCLE_ENTITIES[String(row.entity)];
                let payload: ArchiveRow;
                try {
                    payload = JSON.parse(String(row.payload));
                }
                catch {
                    throw new Error('回收记录内容无效');
                }
                if (!source || !payload || typeof payload !== 'object' || Array.isArray(payload) || payload.id !== row.entity_id)
                    throw new Error('回收记录内容无效');
                const sourceColumns = (await db.prepare(`PRAGMA table_info(${quoteColumn(source)})`).all<Column>()).results;
                if (Object.entries(payload).some(([key, value]) => !sourceColumns.some(column => column.name === key) || (value !== null && typeof value !== 'string' && typeof value !== 'number')) || sourceColumns.some(column => (column.pk || (column.notnull && column.dflt_value === null)) && !(column.name in payload)))
                    throw new Error('回收记录内容无效');
            }
            for (const [key, value] of Object.entries(row)) {
                const column = allowed.get(key);
                if (!column || (value !== null && typeof value !== 'string' && typeof value !== 'number') || (typeof value === 'number' && !Number.isFinite(value)) || (typeof value === 'string' && value.length > (table === 'career_attachments' && key === 'data_base64' ? 1400000 : 1000000)) || (column.notnull && value === null))
                    throw new Error(`“${ARCHIVE_LABELS[table] || table}”包含无效字段`);
                if (column.type.toUpperCase() === 'INTEGER' && value !== null && (!Number.isSafeInteger(value) || (key === 'id' && Number(value) <= 0)))
                    throw new Error('编号或整数数据无效');
            }
            if (columns.some(column => !(column.name in row) && ((column.notnull && column.dflt_value === null) || column.pk)))
                throw new Error('备份缺少必需字段');
            if (existing.has(keyOf(row)))
                continue;
            // A numeric id belonging to another account must never be reused or overwritten.
            if (table !== 'instruments' && keys.includes('id')) {
                const collision = await db.prepare(`SELECT owner_id FROM ${quoteColumn(table)} WHERE id = ?`).bind(row.id).first<{
                    owner_id: string;
                }>();
                if (collision && collision.owner_id !== owner)
                    throw new Error('备份编号与另一账户冲突，未写入任何记录');
            }
            const names = Object.keys(row);
            statements.push(db.prepare(`INSERT INTO ${quoteColumn(table)} (${names.map(quoteColumn).join(',')}) VALUES (${names.map(() => '?').join(',')})`).bind(...names.map(name => row[name])));
            existing.set(keyOf(row), row);
            missing++;
        }
        summary.push({ table, name: ARCHIVE_LABELS[table] || '自选证券信息', total: rows.length, missing, existing: rows.length - missing });
    }
    if (currentId !== archive.workspaceId)
        statements.push(db.prepare("INSERT INTO workspace_settings (id,owner_id,key,value) VALUES (?,?,'workspace-id',?) ON CONFLICT(owner_id,key) DO UPDATE SET value=excluded.value").bind(crypto.randomUUID(), owner, archive.workspaceId));
    return { archive, statements, summary };
}
export const RECYCLE_ENTITIES: Record<string, string> = { task: 'tasks', application: 'applications', project: 'projects', 'quick-note': 'quick_notes', reminder: 'reminders' };
export async function recycleRecord(db: D1Database, owner: string, entity: string, id: number) {
    const table = RECYCLE_ENTITIES[entity];
    if (!table)
        throw new Error('不支持此记录类型');
    const row = await db.prepare(`SELECT id FROM ${table} WHERE id = ? AND owner_id = ?`).bind(id, owner).first();
    if (!row)
        return false;
    const columns = (await db.prepare(`PRAGMA table_info(${table})`).all<Column>()).results;
    const jsonFields = columns.map(column => `'${column.name}', ${quoteColumn(column.name)}`).join(',');
    await db.batch([
        db.prepare(`INSERT INTO recycled_records (id, owner_id, entity, entity_id, payload, deleted_at) SELECT ?, owner_id, ?, id, json_object(${jsonFields}), ? FROM ${table} WHERE id = ? AND owner_id = ? ON CONFLICT(owner_id,entity,entity_id) DO UPDATE SET payload=excluded.payload, deleted_at=excluded.deleted_at`).bind(crypto.randomUUID(), entity, new Date().toISOString(), id, owner),
        db.prepare(`DELETE FROM ${table} WHERE id = ? AND owner_id = ?`).bind(id, owner),
    ]);
    return true;
}
export async function restoreRecycled(db: D1Database, owner: string, id: string) {
    const record = await db.prepare('SELECT * FROM recycled_records WHERE id = ? AND owner_id = ?').bind(id, owner).first<{
        id: string;
        entity: string;
        entity_id: number;
        payload: string;
    }>();
    if (!record)
        throw new Error('回收记录不存在');
    const table = RECYCLE_ENTITIES[record.entity];
    if (!table)
        throw new Error('回收记录类型无效');
    if (await db.prepare(`SELECT id FROM ${table} WHERE id = ?`).bind(record.entity_id).first())
        throw new Error('原编号已存在，未覆盖现有记录');
    const row = JSON.parse(record.payload) as ArchiveRow;
    const allowed = new Set((await db.prepare(`PRAGMA table_info(${table})`).all<Column>()).results.map(column => column.name));
    if (Object.keys(row).some(name => !allowed.has(name)))
        throw new Error('回收记录版本不兼容');
    row.owner_id = owner;
    row.id = record.entity_id;
    const names = Object.keys(row);
    await db.batch([
        db.prepare(`INSERT INTO ${table} (${names.map(quoteColumn).join(',')}) VALUES (${names.map(() => '?').join(',')})`).bind(...names.map(name => row[name])),
        db.prepare('DELETE FROM recycled_records WHERE id = ? AND owner_id = ?').bind(id, owner),
    ]);
}
