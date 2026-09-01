type CloudflareCacheStorage = CacheStorage & { default: Cache };

export function getEdgeCache() {
  const storage = (globalThis as typeof globalThis & { caches?: CloudflareCacheStorage }).caches;
  return storage?.default ?? null;
}
