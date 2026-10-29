import { publicFetch } from "../functions/_shared/http.ts";
import { parseSource } from "../functions/_shared/source_parser.ts";
const probes = [
  ["金十", "https://www.jin10.com/flash_newest.js", "jin10", "market"],
  ["BOSS", "https://www.zhipin.com/", "html", "career"],
  ["智联", "https://www.zhaopin.com/", "html", "career"],
  ["国家公务员局", "https://www.scs.gov.cn/", "html", "career"],
  ["人社部", "https://www.mohrss.gov.cn/", "html", "career"],
];
const results = await Promise.all(
  probes.map(async ([name, url, adapter, purpose]) => {
    try {
      const raw = await publicFetch(url);
      const rows = parseSource(raw, url, adapter, purpose);
      return {
        name,
        url,
        status: "reachable",
        parsed: rows.length,
        sample: rows[0]?.title,
      };
    } catch (e) {
      return { name, url, status: "failed", error: String(e) };
    }
  }),
);
console.log(JSON.stringify(results, null, 2));
await Deno.writeTextFile(
  "outputs/explore-20261028/live-sources.json",
  JSON.stringify(results, null, 2),
);
