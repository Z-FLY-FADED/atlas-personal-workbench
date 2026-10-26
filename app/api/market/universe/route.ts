// HTTP adapters only. Business logic is owned by the server module.
import { universeGET as handleGET } from "../../../server/runtime/publicSources";

export const dynamic = 'force-dynamic';

export function GET(request: Request) {
  return handleGET(request);
}
