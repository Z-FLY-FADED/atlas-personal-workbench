// HTTP adapters only. Business logic is owned by the server module.
import { GET as handleGET,POST as handlePOST } from "../../server/learning/handlers";

export const dynamic = 'force-dynamic';

export function GET(request: Request) {
  return handleGET(request);
}

export function POST(request: Request) {
  return handlePOST(request);
}
