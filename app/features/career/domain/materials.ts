export const ATTACHMENT_MAX_BYTES = 1024 * 1024;
export const ATTACHMENT_TYPES: Record<string, string> = { pdf: 'application/pdf', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', txt: 'text/plain' };
export function validateAttachment(name: string, base64: string) {
    const ext = name.split('.').at(-1)?.toLowerCase() || '';
    const mime = ATTACHMENT_TYPES[ext];
    if (!mime || !/^[A-Za-z0-9+/]*={0,2}$/.test(base64) || base64.length > Math.ceil(ATTACHMENT_MAX_BYTES / 3) * 4)
        throw new Error('支持 PDF、DOCX、PNG、JPG、TXT，单个文件不超过 1 MB');
    let raw: string;
    try {
        raw = atob(base64);
    }
    catch {
        throw new Error('附件编码无效');
    }
    if (!raw.length || raw.length > ATTACHMENT_MAX_BYTES)
        throw new Error('文件为空或超过 1 MB');
    const magic: Record<string, string> = { pdf: '%PDF-', docx: 'PK\x03\x04', png: '\x89PNG\r\n\x1a\n', jpg: '\xff\xd8\xff', jpeg: '\xff\xd8\xff' };
    if (magic[ext] && !raw.startsWith(magic[ext]))
        throw new Error('文件内容与扩展名不符');
    return { mime, size: raw.length, raw };
}
export function escapeHtml(value: string) { return value.replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]!); }
export function resumePrintHtml(title: string, content: string) {
    return `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title><style>body{font:15px/1.8 "Microsoft YaHei",sans-serif;color:#222;max-width:800px;margin:30px auto;padding:24px}pre{font:inherit;white-space:pre-wrap;overflow-wrap:anywhere}button{padding:10px 20px;cursor:pointer}h1{font-size:24px}@page{size:A4;margin:18mm}@media print{.controls{display:none}body{margin:0;padding:0;max-width:none}}</style><div class="controls"><button onclick="window.print()">打印 / 保存为 PDF</button></div><h1>${escapeHtml(title)}</h1><pre>${escapeHtml(content)}</pre></html>`;
}
