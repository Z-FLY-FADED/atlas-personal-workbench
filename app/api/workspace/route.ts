// HTTP adapters only. Business logic is owned by the server module.
import { DELETE as handleDELETE,GET as handleGET,PATCH as handlePATCH,POST as handlePOST } from "../../server/workspace/handlers";

export const dynamic = 'force-dynamic';

export function GET(request: Request) {
  return handleGET(request);
}

export function POST(request: Request) {
  return handlePOST(request);
}

export function PATCH(request: Request) {
  return handlePATCH(request);
}

export function DELETE(request: Request) {
  return handleDELETE(request);
}
