export async function cryptKey(secret: string, owner: string, decrypt = false) {
  const master = Deno.env.get("ATLAS_CREDENTIAL_SECRET");
  if (!master || master.length < 32) {
    throw new Error("服务器尚未配置凭据加密密钥。");
  }
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    await crypto.subtle.digest("SHA-256", enc.encode(master)),
    "AES-GCM",
    false,
    ["encrypt", "decrypt"],
  );
  if (decrypt) {
    const bytes = Uint8Array.from(atob(secret), (c) => c.charCodeAt(0));
    return new TextDecoder().decode(
      await crypto.subtle.decrypt(
        {
          name: "AES-GCM",
          iv: bytes.slice(0, 12),
          additionalData: enc.encode(owner),
        },
        key,
        bytes.slice(12),
      ),
    );
  }
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv, additionalData: enc.encode(owner) },
      key,
      enc.encode(secret),
    ),
  );
  const joined = new Uint8Array(12 + encrypted.length);
  joined.set(iv);
  joined.set(encrypted, 12);
  return btoa(String.fromCharCode(...joined));
}
