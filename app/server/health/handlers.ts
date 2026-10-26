import { env } from 'cloudflare:workers';
import { isLocalRequest, unauthorizedResponse } from '../auth';
// Startup probes never seed or change personal records.
export async function GET(request: Request) {
    if (!isLocalRequest(request))
        return unauthorizedResponse();
    try {
        await env.DB.prepare('SELECT id FROM tasks LIMIT 1').first();
        return Response.json({ service: 'atlas-workspace', ready: true }, { headers: { 'Cache-Control': 'no-store' } });
    }
    catch {
        return Response.json({ service: 'atlas-workspace', ready: false }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
    }
}
