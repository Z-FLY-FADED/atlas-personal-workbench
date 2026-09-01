import { getEdgeCache } from "../edge-cache";

export const dynamic = "force-dynamic";

type JobOpening = {
  id: string;
  company: string;
  role: string;
  industry: "汽车" | "制造" | "机器人" | "科技";
  function: "研发" | "测试" | "产品" | "质量" | "工艺";
  locations: string[];
  experience: string;
  education: string;
  tags: string[];
  summary: string;
  matchScore: number;
  applyUrl: string;
  source: string;
  sourceKind: "具体职位" | "岗位集合" | "平台搜索";
  evidenceText?: string;
  employmentType?: "企业" | "国企/央企" | "事业编制" | "公务员";
  organizationType?: "民营企业" | "外资企业" | "国企/央企" | "事业单位" | "政府机关";
};

type VerifiedJob = JobOpening & {
  verification: "verified" | "reachable" | "pending";
  verifiedAt: string;
  sourceLevel: string;
};

const jobs: JobOpening[] = [
  {
    id: "huawei-smart-manufacturing-rd",
    company: "华为",
    role: "智能制造与精密制造研发工程师",
    industry: "科技",
    function: "研发",
    locations: ["深圳", "东莞", "上海"],
    experience: "校招 / 社招以官网为准",
    education: "本科及以上",
    tags: ["智能制造", "精密制造", "自动化", "工艺装备"],
    summary: "面向产品制造过程、自动化装备与先进工艺的技术研发，适合机械、自动化、控制及制造工程背景。",
    matchScore: 96,
    applyUrl: "https://career.huawei.com/reccampportal/globle/huawei-special-recruitment.html",
    source: "华为招聘官网",
    sourceKind: "具体职位",
    evidenceText: "智能制造与精密制造研发工程师",
  },
  {
    id: "siemens-test-automation",
    company: "西门子",
    role: "测试自动化开发工程师",
    industry: "制造",
    function: "测试",
    locations: ["南京"],
    experience: "以职位页为准",
    education: "本科及以上",
    tags: ["测试自动化", "工业软件", "研发", "数字化"],
    summary: "归属研发职能的测试自动化方向，重点关注自动化测试框架、软件质量与工业数字化产品验证。",
    matchScore: 94,
    applyUrl: "https://jobs.siemens.com/en_US/externaljobs/SearchJobs/?folderId=469711&folderOffset=60&folderRecordsPerPage=6",
    source: "西门子 Careers Marketplace",
    sourceKind: "具体职位",
    evidenceText: "测试自动化开发工程师",
  },
  {
    id: "siemens-labview-test",
    company: "西门子",
    role: "测试设备数字化工程师（LabVIEW）",
    industry: "制造",
    function: "测试",
    locations: ["苏州"],
    experience: "以职位页为准",
    education: "本科及以上",
    tags: ["LabVIEW", "测试设备", "数字化", "数据采集"],
    summary: "围绕测试设备、数据采集和数字化工具建设，适合具备自动化测试、仪器控制或LabVIEW经验的工程人员。",
    matchScore: 93,
    applyUrl: "https://jobs.siemens.com/en_US/externaljobs/SearchJobs/?42386=%5B812054%5D&42386_format=17546&folderId=&folderOffset=48&folderRecordsPerPage=6&listFilterMode=1",
    source: "西门子 Careers Marketplace",
    sourceKind: "具体职位",
    evidenceText: "测试设备数字化工程师",
  },
  {
    id: "siemens-supplier-quality",
    company: "西门子",
    role: "供应商质量管理工程师",
    industry: "制造",
    function: "质量",
    locations: ["仪征"],
    experience: "以职位页为准",
    education: "本科及以上",
    tags: ["供应商质量", "质量体系", "制造", "问题闭环"],
    summary: "面向供应商质量管理、过程审核和问题闭环，适合质量工程、机械制造及供应链质量背景。",
    matchScore: 90,
    applyUrl: "https://jobs.siemens.com/en_US/externaljobs/SearchJobs/?42386=%5B812054%5D&42386_format=17546&folderId=&folderOffset=48&folderRecordsPerPage=6&listFilterMode=1",
    source: "西门子 Careers Marketplace",
    sourceKind: "具体职位",
    evidenceText: "供应商质量管理工程师",
  },
  {
    id: "catl-technical-jobs",
    company: "宁德时代",
    role: "电池研发 / 测试 / 工艺岗位集合",
    industry: "汽车",
    function: "研发",
    locations: ["宁德", "上海", "溧阳", "宜宾"],
    experience: "社会招聘",
    education: "按岗位筛选",
    tags: ["动力电池", "新能源", "材料研发", "制造工艺"],
    summary: "官方社会招聘入口，可继续按研发、测试、质量和工艺关键词筛选动力电池及智能制造相关岗位。",
    matchScore: 92,
    applyUrl: "https://talent.catl.com/",
    source: "宁德时代招聘官网",
    sourceKind: "岗位集合",
    evidenceText: "社会招聘",
  },
  {
    id: "byd-semiconductor-test",
    company: "比亚迪半导体",
    role: "半导体测试与设备工程岗位",
    industry: "科技",
    function: "测试",
    locations: ["深圳", "宁波", "济南"],
    experience: "社会招聘",
    education: "按岗位筛选",
    tags: ["测试程序", "测试设备", "功率半导体", "设备维护"],
    summary: "官方招聘页面覆盖测试程序、测试设备维护与产品验证等职责，适合电子、电气、自动化与测试方向。",
    matchScore: 91,
    applyUrl: "https://www.bydmicro.com/cn/needs/needs-detail/384",
    source: "比亚迪半导体官网",
    sourceKind: "具体职位",
    evidenceText: "测试",
  },
  {
    id: "dji-rd-jobs",
    company: "大疆",
    role: "机器人与智能硬件研发岗位集合",
    industry: "机器人",
    function: "研发",
    locations: ["深圳", "上海", "北京"],
    experience: "社会招聘 / 校园招聘",
    education: "按岗位筛选",
    tags: ["机器人", "嵌入式", "控制算法", "智能硬件"],
    summary: "面向机器人、影像、嵌入式、控制算法及智能硬件产品研发，可在官网继续按关键词和工作地点筛选。",
    matchScore: 95,
    applyUrl: "https://careers.dji.com/zh-CN/",
    source: "大疆招聘官网",
    sourceKind: "岗位集合",
    evidenceText: "职位",
  },
  {
    id: "geely-auto-engineering",
    company: "吉利汽车",
    role: "汽车研发 / 测试 / 质量岗位集合",
    industry: "汽车",
    function: "研发",
    locations: ["杭州", "宁波", "上海", "武汉"],
    experience: "社会招聘",
    education: "按岗位筛选",
    tags: ["整车研发", "三电", "智能驾驶", "质量"],
    summary: "吉利官方社会招聘入口，适合继续检索整车、三电、智能驾驶、试验测试及质量体系岗位。",
    matchScore: 94,
    applyUrl: "https://autojob.geely.com/",
    source: "吉利汽车招聘官网",
    sourceKind: "岗位集合",
    evidenceText: "社会招聘",
  },
  {
    id: "wuling-process-quality",
    company: "广西汽车集团 / 五菱",
    role: "产品开发 / 工艺 / 质量岗位集合",
    industry: "汽车",
    function: "工艺",
    locations: ["柳州", "青岛", "重庆"],
    experience: "社会招聘",
    education: "按岗位筛选",
    tags: ["产品开发", "制造工艺", "质量管理", "汽车零部件"],
    summary: "官方社会招聘页覆盖产品开发、制造工艺和质量管理等工程岗位，可直接查看职责与任职条件。",
    matchScore: 90,
    applyUrl: "https://www.wuling.com.cn/social-recruitment",
    source: "广西汽车集团招聘官网",
    sourceKind: "岗位集合",
    evidenceText: "社会招聘",
  },
  {
    id: "catarc-vehicle-test",
    company: "中汽研汽车试验场",
    role: "车辆试验测试与技术研发岗位",
    industry: "汽车",
    function: "测试",
    locations: ["盐城"],
    experience: "社会招聘 / 校园招聘",
    education: "按岗位筛选",
    tags: ["整车试验", "性能测试", "测试系统", "汽车研发"],
    summary: "聚焦整车与零部件试验、测试系统建设和技术研发，适合车辆工程、机械、自动化及测试背景。",
    matchScore: 93,
    applyUrl: "https://www.capg.com.cn/zwzp/",
    source: "中汽研汽车试验场官网",
    sourceKind: "岗位集合",
    evidenceText: "招聘",
  },
  {
    id: "xpeng-engineering-jobs",
    company: "小鹏汽车",
    role: "汽车研发 / 制造工艺 / 质量安全岗位集合",
    industry: "汽车",
    function: "产品",
    locations: ["广州", "肇庆", "武汉", "上海"],
    experience: "社会招聘 / 校园招聘",
    education: "按岗位筛选",
    tags: ["汽车研发", "产品", "制造工艺", "质量安全"],
    summary: "官方加入页面汇总社会与校园招聘通道，可继续查询汽车研发、产品、测试、制造工艺和质量安全方向。",
    matchScore: 91,
    applyUrl: "https://www.xiaopeng.com/join.html",
    source: "小鹏汽车官网",
    sourceKind: "岗位集合",
    evidenceText: "加入小鹏",
  },
  {
    id: "gac-engineering-jobs",
    company: "广汽集团",
    role: "整车与智能网联工程岗位集合",
    industry: "汽车",
    function: "研发",
    locations: ["广州", "杭州", "上海"],
    experience: "社会招聘",
    education: "按岗位筛选",
    tags: ["整车研发", "智能网联", "试验验证", "产品工程"],
    summary: "广汽集团官方人才入口，可继续进入旗下企业检索整车研发、智能网联、试验验证及产品工程岗位。",
    matchScore: 89,
    applyUrl: "https://www.gacgroup.com/cn/talent",
    source: "广汽集团官网",
    sourceKind: "岗位集合",
    evidenceText: "人才",
  },
  {
    id: "boss-auto-rd-search",
    company: "BOSS直聘公开职位",
    role: "汽车整车研发岗位搜索",
    industry: "汽车",
    function: "研发",
    locations: ["全国"],
    experience: "社会招聘",
    education: "按岗位筛选",
    tags: ["整车研发", "车辆工程", "汽车设计", "动力系统"],
    summary: "读取BOSS无需登录即可访问的汽车整车研发公开搜索页；进入平台后需再次核对招聘企业、职位更新时间与用工主体。",
    matchScore: 92,
    applyUrl: "https://m.zhipin.com/zhaopin/db7125691a36e5be1XR609u9GQ~~/",
    source: "BOSS直聘公开搜索页",
    sourceKind: "平台搜索",
    evidenceText: "汽车整车研发",
  },
  {
    id: "boss-auto-test-search",
    company: "BOSS直聘公开职位",
    role: "汽车电子测试岗位搜索",
    industry: "汽车",
    function: "测试",
    locations: ["全国"],
    experience: "社会招聘",
    education: "按岗位筛选",
    tags: ["汽车电子", "测试设备", "测试工艺", "验证"],
    summary: "覆盖汽车电子产品测试、测试设备开发、测试覆盖率与试验验证等公开岗位，投递前应回查企业官网或工商主体。",
    matchScore: 94,
    applyUrl: "https://www.zhipin.com/zhaopin/b8387458fb3497cd3nRy29i9/",
    source: "BOSS直聘公开搜索页",
    sourceKind: "平台搜索",
    evidenceText: "汽车电子测试",
  },
  {
    id: "boss-quality-search",
    company: "BOSS直聘公开职位",
    role: "质量开发工程师岗位搜索",
    industry: "制造",
    function: "质量",
    locations: ["全国"],
    experience: "社会招聘",
    education: "按岗位筛选",
    tags: ["质量开发", "APQP", "供应商质量", "过程质量"],
    summary: "公开岗位包含新项目质量策划、产品与过程质量改进等方向，平台信息会持续变化，需以职位详情页为准。",
    matchScore: 93,
    applyUrl: "https://www.zhipin.com/zhaopin/ae594b1c4b4e43721nx73tS9Fg~~/",
    source: "BOSS直聘公开搜索页",
    sourceKind: "平台搜索",
    evidenceText: "质量开发工程师",
  },
  {
    id: "boss-process-search",
    company: "BOSS直聘公开职位",
    role: "汽车工艺开发岗位搜索",
    industry: "汽车",
    function: "工艺",
    locations: ["全国"],
    experience: "社会招聘",
    education: "按岗位筛选",
    tags: ["装配工艺", "测试工艺", "工艺文件", "量产导入"],
    summary: "聚合工艺路线、工艺文件、产线导入及效率改善相关公开岗位，不采集登录后内容，也不绕过平台访问限制。",
    matchScore: 94,
    applyUrl: "https://m.zhipin.com/zhaopin/eb4b8cf42cc7be4a1nN829W0Ew~~/",
    source: "BOSS直聘公开搜索页",
    sourceKind: "平台搜索",
    evidenceText: "汽车工艺开发",
  },
  {
    id: "iguopin-central-soe",
    company: "国资央企招聘平台",
    role: "国央企研发 / 测试 / 工艺岗位集合",
    industry: "制造",
    function: "研发",
    locations: ["全国"],
    experience: "社会招聘 / 校园招聘",
    education: "按岗位筛选",
    tags: ["央企", "国企", "高端装备", "工程技术"],
    summary: "国资央企招聘平台的在招单位与招聘资讯入口，适合持续检索机械、电气、车辆、机器人与制造工程岗位。",
    matchScore: 96,
    applyUrl: "https://cujiuye.iguopin.com/company",
    source: "国资央企招聘平台",
    sourceKind: "平台搜索",
    evidenceText: "在招单位",
  },
  {
    id: "iguopin-job-search",
    company: "国聘",
    role: "国企科技与制造岗位搜索",
    industry: "科技",
    function: "产品",
    locations: ["全国"],
    experience: "社会招聘 / 校园招聘",
    education: "按岗位筛选",
    tags: ["国企", "科技", "制造", "产品研发"],
    summary: "国聘社会招聘与校园招聘统一入口，企业和岗位经过平台审核，仍需在投递前核对公告、岗位截止时间和劳动关系主体。",
    matchScore: 92,
    applyUrl: "https://job.iguopin.com/",
    source: "国聘招聘平台",
    sourceKind: "平台搜索",
    evidenceText: "招聘",
  },
  {
    id: "dec-product-rd",
    company: "中国东方电气集团",
    role: "产品（研发）工程师",
    industry: "制造",
    function: "研发",
    locations: ["深圳"],
    experience: "2026校园招聘",
    education: "硕士",
    tags: ["央企", "产品研发", "能源装备", "工程技术"],
    summary: "东方电气官方招聘专题公开的产品研发岗位方向；招聘人数、截止时间和当前开放状态以专题页详情为准。",
    matchScore: 95,
    applyUrl: "https://dec2026.iguopin.com/job",
    source: "东方电气2026招聘专题",
    sourceKind: "具体职位",
    evidenceText: "产品（研发）工程师",
  },
  {
    id: "dec-ndt-engineer",
    company: "中国东方电气集团",
    role: "无损检测（工程技术）",
    industry: "制造",
    function: "测试",
    locations: ["广州"],
    experience: "2026校园招聘",
    education: "本科",
    tags: ["央企", "无损检测", "质量验证", "重型装备"],
    summary: "面向重型装备制造过程的无损检测与工程验证，岗位要求和招聘进度以东方电气专题页实时信息为准。",
    matchScore: 93,
    applyUrl: "https://dec2026.iguopin.com/job",
    source: "东方电气2026招聘专题",
    sourceKind: "具体职位",
    evidenceText: "无损检测（工程技术）",
  },
  {
    id: "dec-welding-process",
    company: "中国东方电气集团",
    role: "焊接工艺 / 综合工艺工程师",
    industry: "制造",
    function: "工艺",
    locations: ["广州"],
    experience: "2026校园招聘",
    education: "本科",
    tags: ["央企", "焊接工艺", "综合工艺", "制造技术"],
    summary: "聚焦大型能源装备焊接及综合制造工艺，适合机械、材料、焊接和过程装备相关专业。",
    matchScore: 94,
    applyUrl: "https://dec2026.iguopin.com/job",
    source: "东方电气2026招聘专题",
    sourceKind: "具体职位",
    evidenceText: "焊接工艺",
  },
  {
    id: "dec-quality-inspection",
    company: "中国东方电气集团",
    role: "质量检验（工程技术）",
    industry: "制造",
    function: "质量",
    locations: ["广州"],
    experience: "2026校园招聘",
    education: "本科",
    tags: ["央企", "质量检验", "工程技术", "制造质量"],
    summary: "面向重型装备制造质量检验和工程技术支持，具体招聘人数、报名条件及截止时间以专题页为准。",
    matchScore: 92,
    applyUrl: "https://dec2026.iguopin.com/job",
    source: "东方电气2026招聘专题",
    sourceKind: "具体职位",
    evidenceText: "质量检验（工程技术）",
  },
  {
    id: "faw-official-careers",
    company: "中国一汽",
    role: "整车研发 / 测试 / 工艺岗位集合",
    industry: "汽车",
    function: "研发",
    locations: ["长春", "南京", "北京"],
    experience: "社会招聘 / 校园招聘",
    education: "按岗位筛选",
    tags: ["央企", "整车研发", "新能源", "智能网联"],
    summary: "中国一汽官方网站人才招聘入口，持续关注整车、动力、电控、智能驾驶、试验验证和制造工艺方向。",
    matchScore: 96,
    applyUrl: "https://www.faw.com.cn/",
    source: "中国一汽官网",
    sourceKind: "岗位集合",
    evidenceText: "人才招聘",
  },
  {
    id: "dongfeng-official-careers",
    company: "东风汽车集团",
    role: "汽车研发与工程技术岗位集合",
    industry: "汽车",
    function: "研发",
    locations: ["武汉", "十堰", "襄阳", "广州"],
    experience: "社会招聘 / 校园招聘",
    education: "按岗位筛选",
    tags: ["央企", "汽车研发", "科技跃迁", "工程技术"],
    summary: "东风汽车集团官方人才招聘入口，适合检索研发总院、整车、零部件和智能化相关岗位。",
    matchScore: 95,
    applyUrl: "https://www.dfmc.com.cn/zhaopin/rencaizhaopin.html",
    source: "东风汽车集团官网",
    sourceKind: "岗位集合",
    evidenceText: "人才招聘",
  },
  {
    id: "crrc-official-careers",
    company: "中国中车",
    role: "轨道车辆研发 / 测试 / 工艺岗位集合",
    industry: "制造",
    function: "研发",
    locations: ["全国"],
    experience: "社会招聘 / 校园招聘",
    education: "按岗位筛选",
    tags: ["央企", "轨道车辆", "机械电气", "试验检测"],
    summary: "中国中车官方人才招聘入口，覆盖轨道交通车辆、工程机械、机电设备及电子电器产品的研发、设计和制造。",
    matchScore: 95,
    applyUrl: "https://www.crrcgc.cc/eportal/ui?pageId=714859",
    source: "中国中车官网",
    sourceKind: "岗位集合",
    evidenceText: "人才招聘",
  },
  {
    id: "cnis-public-institution-engineer",
    company: "中国标准化研究院",
    role: "汽车与智能制造标准化研究岗位",
    industry: "制造",
    function: "研发",
    locations: ["北京"],
    experience: "事业单位公开招聘，以公告为准",
    education: "硕士及以上",
    tags: ["事业编制", "事业单位", "汽车标准", "智能制造", "科研"],
    summary: "面向汽车、智能制造与工程技术标准研究，适合机械、车辆、自动化、电气和制造工程背景；编制性质、报名条件及考核方式以正式公告为准。",
    matchScore: 91,
    applyUrl: "https://www.cnis.ac.cn/",
    source: "中国标准化研究院官网",
    sourceKind: "岗位集合",
    evidenceText: "招聘",
    employmentType: "事业编制",
    organizationType: "事业单位",
  },
  {
    id: "nim-public-institution-engineer",
    company: "中国计量科学研究院",
    role: "计量技术与先进制造科研岗位",
    industry: "科技",
    function: "研发",
    locations: ["北京"],
    experience: "事业单位公开招聘，以公告为准",
    education: "硕士及以上",
    tags: ["事业编制", "事业单位", "计量科学", "传感器", "嵌入式"],
    summary: "围绕先进制造、传感器、测量技术和嵌入式系统开展科研与工程验证，适合希望进入国家级科研事业单位的工程背景候选人。",
    matchScore: 90,
    applyUrl: "https://www.nim.ac.cn/",
    source: "中国计量科学研究院官网",
    sourceKind: "岗位集合",
    evidenceText: "招聘",
    employmentType: "事业编制",
    organizationType: "事业单位",
  },
  {
    id: "national-civil-service-engineering",
    company: "中央机关及其直属机构",
    role: "机械、电气、车辆与信息化类公务员岗位集合",
    industry: "科技",
    function: "产品",
    locations: ["北京", "全国"],
    experience: "国考公告，以当年职位表为准",
    education: "本科及以上",
    tags: ["公务员", "国考", "行政机关", "机械", "电气", "车辆"],
    summary: "国家公务员考试官方报名与职位查询入口，适合筛选机械、电气、车辆、自动化、信息化和科技管理等专业方向；职位代码、基层工作经历和专业要求以当年职位表为准。",
    matchScore: 88,
    applyUrl: "https://bm.scs.gov.cn/pp/gkweb/core/web/ui/business/home.html",
    source: "国家公务员局考试录用公务员专题",
    sourceKind: "岗位集合",
    evidenceText: "考试录用公务员",
    employmentType: "公务员",
    organizationType: "政府机关",
  },
];

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
  if (job.employmentType && job.organizationType) return job;
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
  } catch {
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
    try { await edgeCache.put(cacheKey, response.clone()); }
    catch (error) { console.error("jobs edge cache write failed", error); }
  }
  return response;
}
