import {
  createClient,
  type SupabaseClient,
} from "npm:@supabase/supabase-js@2.118.0";
export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
export function sourceError(error: unknown): string {
  const message = error instanceof Error ? error.message : "采集失败。";
  if (/certificate|tls|ssl/i.test(message)) {
    return "来源 HTTPS 证书校验失败，已停止采集，请核对官网网址或改用其他公开来源。";
  }
  if (/timed?\s*out|timeout|aborted/i.test(message)) {
    return "来源连接超时，请稍后重试或改用其他公开来源。";
  }
  return message.slice(0, 300);
}
export async function authenticated(request: Request) {
  const authorization = request.headers.get("Authorization");
  if (!authorization) throw new Error("请先登录。");
  const client = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false },
    },
  );
  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user) throw new Error("登录已失效。");
  return { client, user };
}
export async function runtimeMode(client: SupabaseClient, userId: string) {
  const { data, error } = await client.from("atlas_entities").select("payload")
    .eq("user_id", userId)
    .eq("kind", "workspace_settings").is("deleted_at", null).contains(
      "payload",
      { key: "runtime-policy" },
    ).limit(1);
  if (error) throw new Error("无法读取运行策略。");
  if (!data?.length) return "public";
  try {
    const v = data[0].payload.value;
    return (typeof v === "string" ? JSON.parse(v) : v)?.mode ?? "offline";
  } catch {
    return "offline";
  }
}
export function publicAddress(ip: string): boolean {
  if (ip.includes(":")) {
    return /^[23][0-9a-f]{3}:/i.test(ip) &&
      !ip.toLowerCase().startsWith("2001:db8:");
  }
  const b = ip.split(".").map(Number);
  return b.length === 4 &&
    b.every((v) => Number.isInteger(v) && v >= 0 && v <= 255) &&
    ![0, 10, 127].includes(b[0]) && b[0] < 224 &&
    !(b[0] === 169 && b[1] === 254) &&
    !(b[0] === 172 && b[1] >= 16 && b[1] <= 31) &&
    !(b[0] === 192 && [0, 168].includes(b[1])) &&
    !(b[0] === 100 && b[1] >= 64 && b[1] <= 127) &&
    !(b[0] === 198 && [18, 19].includes(b[1]));
}
export async function checkedUrl(value: string) {
  const url = new URL(value);
  if (
    url.protocol !== "https:" || url.username || url.password ||
    (url.port && url.port !== "443")
  ) throw new Error("仅支持 HTTPS 公网地址。");
  const [v4, v6] = await Promise.all([
    Deno.resolveDns(url.hostname, "A").catch(() => []),
    Deno.resolveDns(url.hostname, "AAAA").catch(() => []),
  ]);
  const ips = [...v4, ...v6];
  if (!ips.length) throw new Error("来源 DNS 解析失败，请检查服务器网络。");
  if (!ips.every(publicAddress)) {
    throw new Error("不允许访问内网地址。");
  }
  return url;
}
export async function publicFetch(
  value: string,
  init: RequestInit = {},
  limit = 2 * 1024 * 1024,
) {
  let url = await checkedUrl(value);
  for (let n = 0; n < 5; n++) {
    const response = await fetch(url, {
      ...init,
      redirect: "manual",
      signal: AbortSignal.timeout(20000),
    });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      await response.body?.cancel();
      if (init.method === "POST") {
        throw new Error("模型接口重定向被拒绝，请填写最终 API 地址。");
      }
      url = await checkedUrl(
        new URL(response.headers.get("location") || "", url).href,
      );
      continue;
    }
    if (!response.ok) {
      await response.body?.cancel();
      throw new Error(`来源返回 HTTP ${response.status}。`);
    }
    const reader = response.body!.getReader();
    let size = 0;
    const chunks: Uint8Array[] = [];
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.length;
        if (size > limit) throw new Error("来源超过大小限制。");
        chunks.push(value);
      }
    } finally {
      await reader.cancel();
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const c of chunks) {
      bytes.set(c, offset);
      offset += c.length;
    }
    const charset =
      /charset=([\w-]+)/i.exec(response.headers.get("content-type") || "")
        ?.[1] || "utf-8";
    return new TextDecoder(charset).decode(bytes);
  }
  throw new Error("来源重定向过多。");
}
