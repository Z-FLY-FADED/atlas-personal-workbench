const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

export function isLocalRequest(request: Request) {
  try {
    return LOCAL_HOSTS.has(new URL(request.url).hostname.toLowerCase());
  } catch {
    return false;
  }
}

export function getOwnerId(request: Request) {
  const authenticatedOwner = request.headers.get("oai-authenticated-user-id")?.trim();
  if (authenticatedOwner) return authenticatedOwner;
  return isLocalRequest(request) ? "atlas-local-user" : null;
}

export function unauthorizedResponse() {
  return Response.json({ error: "authentication required" }, { status: 401 });
}
