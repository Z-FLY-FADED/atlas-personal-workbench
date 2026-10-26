// HTTP adapters only. Business logic is owned by the server module.
import { GET as handleGET } from "../../server/health/handlers";

export const dynamic = 'force-dynamic';

export function GET(request: Request) {
  return handleGET(request);
}
