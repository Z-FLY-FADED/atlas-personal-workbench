import { createClient } from 'npm:@supabase/supabase-js@2';

// Secrets are configured with Supabase secrets; they never enter a client build.
Deno.serve(async (request: Request) => {
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
    status, headers: { 'Content-Type': 'application/json' },
  });
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  const authorization = request.headers.get('Authorization');
  if (!authorization) return json({ error: '请先登录。' }, 401);
  const client = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authorization } }, auth: { persistSession: false },
  });
  const { data: { user }, error: authError } = await client.auth.getUser();
  if (authError || !user) return json({ error: '登录已失效。' }, 401);
  const { data: settings, error } = await client.from('atlas_entities').select('payload')
    .eq('user_id', user.id).eq('kind', 'workspace_settings').is('deleted_at', null)
    .contains('payload', { key: 'runtime-policy' }).limit(1);
  let mode = 'public';
  try { const value = settings?.[0]?.payload?.value; mode = (typeof value === 'string' ? JSON.parse(value) : value)?.mode; }
  catch { mode = 'offline'; }
  if (error || mode !== 'ai') return json({ error: '当前账号未启用 AI。' }, 403);
  let prompt: unknown;
  try { prompt = (await request.json()).prompt; } catch { return json({ error: '无效请求。' }, 400); }
  if (typeof prompt !== 'string' || !prompt.trim() || prompt.length > 12000) return json({ error: '提问长度应为 1–12000 字。' }, 400);
  const apiKey = Deno.env.get('ATLAS_AI_API_KEY');
  const base = Deno.env.get('ATLAS_AI_BASE_URL') || 'https://api.openai.com/v1';
  const model = Deno.env.get('ATLAS_AI_MODEL');
  if (!apiKey || !model || !base.startsWith('https://')) return json({ error: '管理员尚未配置模型服务。' }, 503);
  const { data: accepted, error: budgetError } = await client.rpc('atlas_consume_ai_budget');
  if (budgetError || accepted !== true) return json({ error: '本账号本小时请求次数已用完，请稍后再试。' }, 429);
  try {
    const response = await fetch(`${base.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST', headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages: [{ role: 'user', content: prompt }], max_tokens: 2048 }),
      signal: AbortSignal.timeout(45000),
    });
    if (!response.ok) return json({ error: '模型服务暂时不可用，请稍后重试。' }, 502);
    const result = (await response.json()).choices?.[0]?.message?.content;
    return typeof result === 'string' ? json({ result }) : json({ error: '模型没有返回文本。' }, 502);
  } catch { return json({ error: '模型请求超时或连接失败。' }, 504); }
});
