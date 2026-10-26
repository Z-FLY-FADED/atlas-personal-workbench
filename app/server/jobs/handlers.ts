import { getEdgeCache } from "../edgeCache";
import { jobs, type JobOpening } from './catalog';
type VerifiedJob = JobOpening & {
    verification: "verified" | "reachable" | "pending";
    verifiedAt: string;
    sourceLevel: string;
};
const trustedHosts = new Set([
    "career.huawei.com",
    "jobs.siemens.com",
    "talent.catl.com",
    "www.bydmicro.com",
    "careers.dji.com",
    "autojob.geely.com",
    "www.wuling.com.cn",
    "www.capg.com.cn",
    "www.xiaopeng.com",
    "www.gacgroup.com",
    "www.zhipin.com",
    "m.zhipin.com",
    "job.iguopin.com",
    "cujiuye.iguopin.com",
    "dec2026.iguopin.com",
    "www.faw.com.cn",
    "www.dfmc.com.cn",
    "www.crrcgc.cc",
    "www.cnis.ac.cn",
    "www.nim.ac.cn",
    "bm.scs.gov.cn",
]);
function classifyJob(job: JobOpening): JobOpening {
    if (job.employmentType && job.organizationType)
        return job;
    const tags = job.tags.join(" ");
    const isCivilService = job.employmentType === "公务员" || /公务员|国考|行政机关/.test(`${job.company} ${job.role} ${tags}`);
    const isInstitution = job.employmentType === "事业编制" || /事业编制|事业单位/.test(`${job.company} ${job.role} ${tags}`);
    const isStateOwned = job.employmentType === "国企/央企" || /央企|国企|国资|国聘/.test(`${job.company} ${job.role} ${tags} ${job.source}`);
    return {
        ...job,
        employmentType: isCivilService ? "公务员" : isInstitution ? "事业编制" : isStateOwned ? "国企/央企" : "企业",
        organizationType: isCivilService ? "政府机关" : isInstitution ? "事业单位" : isStateOwned ? "国企/央企" : /西门子|Siemens/.test(job.company) ? "外资企业" : "民营企业",
    };
}
function verificationDate() {
    return new Intl.DateTimeFormat("zh-CN", {
        timeZone: "Asia/Shanghai",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    }).format(new Date());
}
async function verifyJob(job: JobOpening): Promise<VerifiedJob> {
    job = classifyJob(job);
    const verifiedAt = verificationDate();
    try {
        const parsed = new URL(job.applyUrl);
        if (!trustedHosts.has(parsed.hostname)) {
            return { ...job, verification: "pending", verifiedAt, sourceLevel: "来源域名待审核" };
        }
        const response = await fetch(job.applyUrl, {
            signal: AbortSignal.timeout(6500),
            redirect: "follow",
            headers: { "User-Agent": "Atlas-Workspace-Job-Validator/1.0" },
        });
        if (!response.ok) {
            return { ...job, verification: "pending", verifiedAt, sourceLevel: job.sourceKind === "平台搜索" ? "公开平台页面暂不可访问" : "官方域名已确认，页面暂不可访问" };
        }
        const html = await response.text();
        const normalized = html.replace(/<[^>]+>/g, "").replace(/\s+/g, "");
        const matched = Boolean(job.evidenceText && normalized.includes(job.evidenceText.replace(/\s+/g, "")));
        const platformSource = job.sourceKind === "平台搜索";
        return {
            ...job,
            verification: matched ? "verified" : "reachable",
            verifiedAt,
            sourceLevel: platformSource
                ? matched ? "公开招聘页面与关键词已读取" : "公开招聘平台入口可访问"
                : matched ? "官方原文与岗位名称已核对" : "官方招聘入口可访问",
        };
    }
    catch {
        return { ...job, verification: "pending", verifiedAt, sourceLevel: job.sourceKind === "平台搜索" ? "平台公开页面实时访问待重试" : "官方域名已确认，实时访问待重试" };
    }
}
export async function GET(request: Request) {
    const edgeCache = getEdgeCache();
    const cacheKey = new Request(request.url, { method: "GET" });
    const cached = await edgeCache?.match(cacheKey);
    if (cached) {
        return new Response(cached.body, {
            status: cached.status,
            statusText: cached.statusText,
            headers: new Headers(cached.headers),
        });
    }
    const url = new URL(request.url);
    const cursor = Math.max(0, Number.parseInt(url.searchParams.get("cursor") || "0", 10) || 0);
    const pageSize = Math.min(18, Math.max(6, Number.parseInt(url.searchParams.get("pageSize") || "12", 10) || 12));
    const page = jobs.slice(cursor, cursor + pageSize);
    const items = await Promise.all(page.map(verifyJob));
    const updatedAt = verificationDate();
    const verifiedCount = items.filter((item) => item.verification !== "pending").length;
    const nextOffset = cursor + page.length;
    const response = Response.json({
        jobs: items,
        updatedAt,
        verifiedCount,
        nextCursor: nextOffset < jobs.length ? String(nextOffset) : null,
        totalKnown: jobs.length,
        sourceSummary: { official: jobs.filter((item) => item.sourceKind !== "平台搜索").length, platform: jobs.filter((item) => item.sourceKind === "平台搜索").length },
        methodology: "招聘收录不设置总量上限，使用游标分页持续追加来源；当前接入企业官网、国聘/国资央企平台和BOSS无需登录的公开搜索页。每30分钟重新访问入口并匹配关键词，不绕过登录、验证码或反爬限制。平台岗位需再次核对企业主体，职位状态、地点和截止日期以最终投递页为准。",
    }, { headers: { "Cache-Control": "public, max-age=120, s-maxage=900" } });
    if (edgeCache) {
        try {
            await edgeCache.put(cacheKey, response.clone());
        }
        catch (error) {
            console.error("jobs edge cache write failed", error);
        }
    }
    return response;
}
export function offlineJobs(request: Request) {
    const url = new URL(request.url);
    const cursor = Math.max(0, Number.parseInt(url.searchParams.get('cursor') || '0', 10) || 0);
    const size = Math.min(18, Math.max(6, Number.parseInt(url.searchParams.get('pageSize') || '12', 10) || 12));
    const page = jobs.slice(cursor, cursor + size);
    return {
        jobs: page.map(job => ({ ...classifyJob(job), verification: 'pending', verifiedAt: '', sourceLevel: '本机岗位目录，在线状态待核验' })),
        updatedAt: '', verifiedCount: 0, totalKnown: jobs.length, nextCursor: cursor + size < jobs.length ? String(cursor + size) : null,
        sourceSummary: { official: jobs.filter(job => job.sourceKind !== '平台搜索').length, platform: jobs.filter(job => job.sourceKind === '平台搜索').length },
        methodology: '本机公开招聘入口目录，不代表岗位仍开放。简历匹配使用本地关键词与规则，未调用 AI。',
    };
}
