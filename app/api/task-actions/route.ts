// HTTP adapters only. Business logic is owned by the server module.
import { POST as handlePOST } from "../../server/task-actions/handlers";

export const dynamic = 'force-dynamic';

export function POST(request: Request) {
  return handlePOST(request);
}
