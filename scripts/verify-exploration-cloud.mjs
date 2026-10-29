import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { randomBytes, randomUUID } from "node:crypto";
const project = "rvlnipmvhsodvjjfwirg", base = `https://${project}.supabase.co`;
const cli = spawnSync("cmd.exe", [
  "/d",
  "/s",
  "/c",
  "npx --yes supabase projects api-keys --project-ref rvlnipmvhsodvjjfwirg --reveal --output json",
], { encoding: "utf8" });
if (cli.status !== 0) {
  throw new Error("Could not load deployment test credentials.");
}
const keys = JSON.parse(cli.stdout),
  service = keys.find((x) => x.name === "service_role").api_key,
  anon = keys.find((x) => x.name === "anon").api_key;
const report = {
  at: new Date().toISOString(),
  project,
  checks: [],
  sources: [],
  cleanup: [],
};
const users = [];
async function api(path, body, token = service, method = "POST") {
  const response = await fetch(base + path, {
    method,
    headers: {
      apikey: token === service ? service : anon,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(100000),
  });
  const raw = await response.text();
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    data = { error: raw.slice(0, 300) };
  }
  return { status: response.status, data };
}
function check(name, ok, details) {
  report.checks.push({ name, passed: !!ok, ...(details ? { details } : {}) });
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${details ? " " + details : ""}`);
}
async function save(token, kind, payload) {
  const id = randomUUID();
  const r = await api("/rest/v1/rpc/atlas_save_entity", {
    p_id: id,
    p_kind: kind,
    p_payload: payload,
    p_version: 0,
  }, token);
  if (r.status !== 200) throw new Error(`Fixture save failed: ${r.status}`);
  return { id, ...r.data };
}
try {
  for (let i = 0; i < 2; i++) {
    const email = `workspace-explore-${Date.now()}-${i}@example.invalid`,
      password = randomBytes(24).toString("base64url");
    const created = await api("/auth/v1/admin/users", {
      email,
      password,
      email_confirm: true,
      user_metadata: { purpose: "temporary-exploration-acceptance" },
    });
    if (created.status !== 200) {
      throw new Error(`Test user creation failed: ${created.status}`);
    }
    users.push({ id: created.data.id, email });
    const login = await api("/auth/v1/token?grant_type=password", {
      email,
      password,
    }, anon);
    if (login.status !== 200) {
      throw new Error(`Test user login failed: ${login.status}`);
    }
    users[i].token = login.data.access_token;
  }
  const [a, b] = users;
  for (const fn of ["atlas-assistant", "atlas-collect"]) {
    const r = await api(`/functions/v1/${fn}`, {}, anon);
    check(`${fn}: anonymous denied`, r.status === 401, `HTTP ${r.status}`);
  }
  const list = await api("/functions/v1/atlas-assistant", {
    action: "connections",
  }, a.token);
  check(
    "authenticated model list",
    list.status === 200 && Array.isArray(list.data.connections),
    JSON.stringify(list),
  );
  const blocked = await api(
    "/functions/v1/atlas-assistant",
    { prompt: "test" },
    a.token,
  );
  check("AI defaults off", blocked.status === 403, `HTTP ${blocked.status}`);
  const secretTitle = `private-material-${randomUUID()}`;
  const doc = await save(a.token, "knowledge", {
    title: secretTitle,
    content: "Temporary private test material.",
  });
  const other = await api(
    `/rest/v1/atlas_entities?id=eq.${doc.id}&select=id`,
    undefined,
    b.token,
    "GET",
  );
  check(
    "cross-account entity invisible",
    other.status === 200 && other.data.length === 0,
  );
  const search = await api("/rest/v1/rpc/atlas_search_materials", {
    p_query: secretTitle,
    p_limit: 8,
  }, b.token);
  check(
    "cross-account search empty",
    search.status === 200 && search.data.length === 0,
  );
  const own = await api("/rest/v1/rpc/atlas_search_materials", {
    p_query: secretTitle,
    p_limit: 8,
  }, a.token);
  check(
    "own material searchable",
    own.status === 200 && own.data.some((x) => x.id === doc.id),
  );
  const connection = await api("/functions/v1/atlas-assistant", {
    action: "save_connection",
    name: "Disposable API test",
    base_url: "https://api.deepseek.com/v1",
    model: "test-not-invoked",
    api_key: "test-only-" + randomBytes(24).toString("hex"),
  }, a.token);
  check(
    "save encrypted personal API",
    connection.status === 200 && connection.data.saved === true,
    JSON.stringify(connection),
  );
  const alist = await api("/functions/v1/atlas-assistant", {
    action: "connections",
  }, a.token);
  const blist = await api("/functions/v1/atlas-assistant", {
    action: "connections",
  }, b.token);
  check(
    "API metadata is account isolated",
    alist.status === 200 && alist.data.connections?.length === 1 &&
      blist.data.connections?.length === 0,
  );
  if (alist.data.connections?.[0]) {
    await api("/functions/v1/atlas-assistant", {
      action: "delete_connection",
      connection_id: alist.data.connections[0].id,
    }, b.token);
    const stillOwn = await api("/functions/v1/atlas-assistant", {
      action: "connections",
    }, a.token);
    check(
      "foreign API deletion cannot affect owner",
      stillOwn.data.connections?.length === 1,
    );
  }
  await save(b.token, "workspace_settings", {
    key: "runtime-policy",
    value: JSON.stringify({ mode: "ai" }),
  });
  const foreignTarget = await api("/functions/v1/atlas-assistant", {
    task: "rewrite",
    prompt: "test",
    target_id: doc.id,
  }, b.token);
  check(
    "AI cannot read another account knowledge",
    foreignTarget.status === 404,
  );
  const policy = await save(a.token, "workspace_settings", {
    key: "runtime-policy",
    value: JSON.stringify({ mode: "offline" }),
  });
  const offline = await api("/functions/v1/atlas-collect", {
    action: "read",
    url: "https://example.com",
  }, a.token);
  check("server enforces offline source policy", offline.status === 403);
  await api("/rest/v1/rpc/atlas_save_entity", {
    p_id: policy.id,
    p_kind: "workspace_settings",
    p_version: policy.version,
    p_payload: {
      key: "runtime-policy",
      value: JSON.stringify({ mode: "public" }),
    },
  }, a.token);
  check(
    "API secret never returned",
    !JSON.stringify(alist.data).includes("encrypted_key") &&
      !JSON.stringify(alist.data).includes("api_key"),
  );
  const table = await api(
    "/rest/v1/atlas_ai_credentials?select=*",
    undefined,
    a.token,
    "GET",
  );
  check(
    "credential table denied to client",
    table.status === 401 || table.status === 403,
    `HTTP ${table.status}`,
  );
  const sources = [
    ["金十", "https://www.jin10.com/flash_newest.js", "jin10", "market"],
    ["BOSS直聘", "https://www.zhipin.com/", "html", "career"],
    ["智联招聘", "https://www.zhaopin.com/", "html", "career"],
    ["国家公务员局", "https://www.scs.gov.cn/", "html", "career"],
    ["人社部", "https://www.mohrss.gov.cn/", "html", "career"],
    [
      "RSSHub releases",
      "https://github.com/DIYgod/RSSHub/releases.atom",
      "feed",
      "industry",
    ],
  ];
  for (const [name, url, adapter, purpose] of sources) {
    const source = await save(a.token, "industry_sources", {
      name,
      url,
      adapter,
      purpose,
      enabled: true,
    });
    const r = await api(
      "/functions/v1/atlas-collect",
      { source_id: source.id },
      a.token,
    );
    let samples = [];
    if (r.data.status === "success") {
      const saved = await api(
        `/rest/v1/atlas_entities?kind=eq.industry_articles&payload->>source_id=eq.${source.id}&select=payload&limit=3`,
        undefined,
        a.token,
        "GET",
      );
      if (saved.status === 200) {
        samples = saved.data.map((x) => ({
          title: x.payload.title,
          url: x.payload.canonical_url,
          type: x.payload.record_type,
          company: x.payload.company,
        }));
      }
    }
    report.sources.push({ name, url, ...r, samples });
    if (name === "金十") {
      const cooldown = await api("/functions/v1/atlas-collect", {
        source_id: source.id,
      }, a.token);
      check("duplicate collection is throttled", cooldown.status === 429);
    }
    console.log(
      `SOURCE ${name}: HTTP ${r.status} ${
        r.data.message || r.data.error || JSON.stringify(r.data)
      }`,
    );
    const foreign = await api("/functions/v1/atlas-collect", {
      source_id: source.id,
    }, b.token);
    check(
      `${name}: foreign source denied`,
      foreign.status === 404,
      `HTTP ${foreign.status}`,
    );
  }
} catch (e) {
  report.error = String(e);
  console.log("TEST ERROR " + String(e));
} finally {
  for (const user of users) {
    try {
      const r = await api(
        `/auth/v1/admin/users/${user.id}`,
        undefined,
        service,
        "DELETE",
      );
      report.cleanup.push({
        user: user.id,
        deleted: r.status === 200,
        status: r.status,
      });
    } catch (e) {
      report.cleanup.push({ user: user.id, error: String(e) });
    }
  }
  writeFileSync(
    "outputs/explore-deploy-20261028/live-acceptance.json",
    JSON.stringify(report, null, 2),
  );
  console.log(
    `Cleanup: ${
      report.cleanup.filter((x) => x.deleted).length
    }/${users.length}`,
  );
}
if (
  report.error || report.checks.some((x) => !x.passed) ||
  report.cleanup.some((x) => !x.deleted)
) process.exitCode = 1;
