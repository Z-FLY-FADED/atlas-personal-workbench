import { env } from 'cloudflare:workers';
import { getOwnerId } from '../auth';
import { GET as loadJobs, offlineJobs } from '../jobs/handlers';
import { GET as loadMarket, offlineMarket } from '../market/handlers';
import { GET as loadUniverse } from '../market/universe/handlers';
import { publicSnapshotResponse } from './snapshots';
export function jobsGET(request: Request) {
    return publicSnapshotResponse(env.DB, getOwnerId(request), request, () => loadJobs(request), offlineJobs(request), 1800000);
}
export function marketGET(request: Request) {
    return publicSnapshotResponse(env.DB, getOwnerId(request), request, () => loadMarket(request), offlineMarket(), 90000);
}
export function universeGET(request: Request) {
    return publicSnapshotResponse(env.DB, getOwnerId(request), request, () => loadUniverse(request), {
        instruments: [], total: 0, page: Number(new URL(request.url).searchParams.get('page')) || 1, hasMore: false,
    }, 180000);
}
