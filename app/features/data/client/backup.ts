import type { WorkspaceArchive } from "../../../contracts/archive";
const allowedKey = (key: string) => /^atlas-(theme$|recent-knowledge(?:-v2)?$|learning-review-|focus-history$|translation-|writing-|weekly-draft-|task-draft-|project-draft-|note-draft-|capture-draft-|document-draft$|overview-note-draft$|web-clip-draft$|resume-version-draft-)/.test(key);
export function collectLocalState() {
    const values: Record<string, string> = {};
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && allowedKey(key))
            values[key] = localStorage.getItem(key)!;
    }
    return values;
}
export function restoreLocalState(values: Record<string, string> = {}) {
    let restored = 0, retained = 0, failed = 0;
    if (!values || typeof values !== 'object' || Array.isArray(values))
        return { restored, retained, failed: 1 };
    for (const [key, value] of Object.entries(values)) {
        if (!allowedKey(key) || typeof value !== 'string' || value.length > 2000000)
            continue;
        try {
            if (localStorage.getItem(key) !== null) {
                retained++;
                continue;
            }
            localStorage.setItem(key, value);
            restored++;
        }
        catch {
            failed++;
        }
    }
    return { restored, retained, failed };
}
const encode = (bytes: Uint8Array) => {
    let binary = '';
    for (const byte of bytes)
        binary += String.fromCharCode(byte);
    return btoa(binary);
};
const decode = (value: string) => Uint8Array.from(atob(value), char => char.charCodeAt(0));
async function passwordKey(password: string, salt: Uint8Array<ArrayBuffer>) {
    const source = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: 210000, hash: 'SHA-256' }, source, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}
export async function encodeBackup(archive: WorkspaceArchive, password: string) {
    if (!password)
        return JSON.stringify(archive, null, 2);
    const salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await passwordKey(password, salt), new TextEncoder().encode(JSON.stringify(archive)));
    return JSON.stringify({ format: 'atlas-encrypted', version: 1, salt: encode(salt), iv: encode(iv), data: encode(new Uint8Array(encrypted)) });
}
export async function decodeBackup(text: string, password: string): Promise<WorkspaceArchive> {
    const file = JSON.parse(text);
    if (!file || typeof file !== 'object' || Array.isArray(file))
        throw new Error('不是受支持的 ATLAS 备份文件');
    if (file.format !== 'atlas-encrypted')
        return file;
    if (file.version !== 1 || !password || typeof file.salt !== 'string' || typeof file.iv !== 'string' || typeof file.data !== 'string')
        throw new Error('请填写此备份的密码');
    try {
        const salt = decode(file.salt), iv = decode(file.iv), encrypted = decode(file.data);
        if (salt.length !== 16 || iv.length !== 12)
            throw new Error('invalid envelope');
        const decoded = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, await passwordKey(password, salt), encrypted);
        return JSON.parse(new TextDecoder().decode(decoded));
    }
    catch {
        throw new Error('密码不正确或加密备份已损坏');
    }
}
