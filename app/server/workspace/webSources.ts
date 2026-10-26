import { fetchPublicFeed, isSafePublicUrl } from '../industry/feed';
export { isSafePublicUrl } from '../industry/feed';
export function decodeEntities(value: string) {
    return value.replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/&lt;/gi, '<').replace(/&gt;/gi, '>').replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'")
        .replace(/&#(x[0-9a-f]+|\d+);/gi, (entity, code: string) => {
            const point = code.toLowerCase().startsWith('x') ? parseInt(code.slice(1), 16) : Number(code);
            return point >= 0 && point <= 0x10ffff ? String.fromCodePoint(point) : entity;
        });
}
export function extractPublicPage(html: string) {
    const clean = (value: string) => decodeEntities(value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
    const title = clean(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '').slice(0, 300);
    const metas = html.match(/<meta\b[^>]*>/gi) || [];
    const meta = metas.find(tag => /(?:name|property)\s*=\s*["'](?:description|og:description)["']/i.test(tag));
    const summary = clean(meta?.match(/content\s*=\s*["']([\s\S]*?)["']/i)?.[1] || '').slice(0, 1500);
    const withoutScripts = html.replace(/<(script|style|noscript)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ');
    const main = withoutScripts.match(/<(article|main)\b[^>]*>([\s\S]*?)<\/\1>/i)?.[2] || withoutScripts;
    const extracted = clean(main.replace(/<(nav|header|footer)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ')).slice(0, 12000);
    return { title, summary, extracted };
}
async function boundedText(response: Response) {
    if (!response.body) return '';
    const reader = response.body.getReader(), decoder = new TextDecoder();
    let bytes = 0, text = '';
    try {
        for (;;) {
            const chunk = await reader.read();
            if (chunk.done) break;
            bytes += chunk.value.length;
            if (bytes > 2000000) { await reader.cancel(); throw new Error('网页超过 2MB 限制'); }
            text += decoder.decode(chunk.value, { stream: true });
        }
        return text + decoder.decode();
    } finally { reader.releaseLock(); }
}
export async function crawlPublicSource(input: string) {
    const matchedUrl = input.match(/https?:\/\/[^\s<>"']+/)?.[0];
    if (!matchedUrl || !isSafePublicUrl(matchedUrl))
        return null;
    try {
        const { response, finalUrl } = await fetchPublicFeed(matchedUrl, { 'User-Agent': 'Atlas-Workspace-Research-Crawler/2.0', Accept: 'text/html, application/xhtml+xml' });
        if (!response.ok || !/text\/html|application\/xhtml\+xml/i.test(response.headers.get('content-type') || ''))
            return null;
        return { url: finalUrl, host: new URL(finalUrl).hostname, ...extractPublicPage(await boundedText(response)) };
    }
    catch {
        return null;
    }
}
