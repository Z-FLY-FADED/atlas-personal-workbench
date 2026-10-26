import assert from 'node:assert/strict';
import test from 'node:test';
import { testDatabase } from './helpers/sqlite-d1';
import { getIndustryPayload } from "../app/server/industry/storage";

test('industry cursor follows publication order even when ids were inserted out of order', async () => {
  const { sqlite, d1 } = testDatabase();
  try {
    const statement = sqlite.prepare("INSERT INTO industry_articles (owner_id, industry, title, canonical_url, url_hash, published_at, discovered_at) VALUES ('test', ?, ?, ?, ?, ?, ?)");
    for (const [id, date] of [[1, '2026-09-14'], [2, '2026-09-12'], [3, '2026-09-15'], [4, '2026-09-13'], [5, '2026-09-14']] as const) statement.run('汽车', `资讯${id}`, `https://example.com/${id}`, `hash${id}`, date, date);
    statement.run('机器人', '另一个分类', 'https://example.com/6', 'hash6', '2026-09-20', '2026-09-20');
    const first = await getIndustryPayload(d1, 'test', { industry: '汽车', limit: 2 });
    const second = await getIndustryPayload(d1, 'test', { industry: '汽车', limit: 2, cursor: first.nextCursor! });
    const third = await getIndustryPayload(d1, 'test', { industry: '汽车', limit: 2, cursor: second.nextCursor! });
    assert.deepEqual([...first.articles, ...second.articles, ...third.articles].map(item => item.id), [3, 5, 1, 4, 2]);
    assert.equal(third.nextCursor, null);
    const search = await getIndustryPayload(d1, 'test', { query: '另一个分类' });
    assert.equal(search.articles.length, 1);
    assert.equal((await getIndustryPayload(d1, 'different-owner')).articles.length, 0);
  } finally { sqlite.close(); }
});
