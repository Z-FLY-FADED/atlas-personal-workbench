import type { IndustryCategory, IndustryTopic, IndustryTrustLevel } from "./types";

export type IndustrySourceSeed = {
  name: string;
  url: string;
  kind: "seed" | "rss";
  industry: IndustryCategory;
  topic: IndustryTopic;
  company: string;
  trustLevel: IndustryTrustLevel;
  priority: number;
  pollIntervalMinutes: number;
  enabled: boolean;
};

export type IndustryArticleSeed = {
  industry: IndustryCategory;
  title: string;
  summary: string;
  source: string;
  publishedAt: string;
  url: string;
  topic: IndustryTopic;
  company?: string;
  importanceScore: number;
};

export const INDUSTRY_SOURCE_SEEDS: IndustrySourceSeed[] = [
  { name: "ATLAS 已核验种子资料", url: "https://atlas.local/industry-seed", kind: "seed", industry: "汽车", topic: "industry", company: "", trustLevel: "official", priority: 100, pollIntervalMinutes: 1440, enabled: false },
  { name: "NVIDIA Developer Blog", url: "https://developer.nvidia.com/blog/feed/", kind: "rss", industry: "半导体", topic: "company", company: "NVIDIA", trustLevel: "official", priority: 90, pollIntervalMinutes: 120, enabled: true },
  { name: "Intel Newsroom", url: "https://newsroom.intel.com/feed/", kind: "rss", industry: "半导体", topic: "company", company: "Intel", trustLevel: "official", priority: 90, pollIntervalMinutes: 120, enabled: true },
  { name: "Google DeepMind Blog", url: "https://deepmind.google/blog/rss.xml", kind: "rss", industry: "互联网大厂", topic: "company", company: "Google DeepMind", trustLevel: "official", priority: 88, pollIntervalMinutes: 180, enabled: true },
  { name: "Microsoft Blog", url: "https://blogs.microsoft.com/feed/", kind: "rss", industry: "互联网大厂", topic: "company", company: "Microsoft", trustLevel: "official", priority: 86, pollIntervalMinutes: 180, enabled: false },
];

export const INDUSTRY_ARTICLE_SEEDS: IndustryArticleSeed[] = [
  { industry: "汽车", title: "2026年汽车标准化工作要点发布", summary: "工作要点覆盖智能网联汽车、汽车芯片、新能源汽车、固态电池、数据治理与汽车人工智能等重点标准体系。", source: "工业和信息化部", publishedAt: "2026-05-26", url: "https://www.miit.gov.cn/xwfb/gxdt/sjdt/art/2026/art_202b76b65f354309a28d38686d988108.html", topic: "industry", importanceScore: 92 },
  { industry: "汽车", title: "九部门部署培育壮大汽车后市场消费", summary: "政策围绕汽车改装、赛事、房车露营、经典车与流通服务等场景提出配套措施，关注后市场制度与消费增量。", source: "商务部", publishedAt: "2026-06-23", url: "https://www.mofcom.gov.cn/zwgk/zcfb/art/2026/art_db5282fde5404e2b99678c152a36830c.html", topic: "industry", importanceScore: 86 },
  { industry: "汽车", title: "2026年5月汽车工业经济运行情况", summary: "用月度产销与出口数据观察需求、库存和新能源渗透率，适合作为行业景气跟踪入口。", source: "工业和信息化部", publishedAt: "2026-06-10", url: "https://www.miit.gov.cn/jgsj/zbys/qcgy/index.html", topic: "industry", importanceScore: 82 },
  { industry: "汽车", title: "比亚迪第1700万辆新能源汽车下线", summary: "比亚迪披露第1700万辆新能源汽车下线及上半年销量、海外销售和智能化技术进展，适合跟踪整车规模化与全球化。", source: "比亚迪", publishedAt: "2026-07-10", url: "https://www.byd.com/cn/detail630", topic: "company", company: "比亚迪", importanceScore: 78 },
  { industry: "汽车", title: "宁德时代延伸统一电芯合作", summary: "宁德时代披露获得大众集团奖，并将电池技术研发、供应链执行与统一电芯量产合作作为后续重点。", source: "宁德时代", publishedAt: "2026-07-12", url: "https://www.catl.com/news/6896.html", topic: "company", company: "宁德时代", importanceScore: 80 },
  { industry: "机器人", title: "人形机器人与具身智能实景实训专项行动启动", summary: "专项行动强调真实场景训练、真机数据、关键部件性能与常态部署。", source: "工业和信息化部", publishedAt: "2026-06-08", url: "https://www.miit.gov.cn/zwgk/zcwj/wjfb/tz/art/2026/art_f291ccd3da4c47ce95741de63cc088e6.html", topic: "industry", importanceScore: 92 },
  { industry: "机器人", title: "人形机器人变电站场景等行业标准征求意见", summary: "标准项目指向专业场景，观察重点逐步转向场景规范、数据采集与安全验证。", source: "工业和信息化部", publishedAt: "2026-06-18", url: "https://www.miit.gov.cn/jgsj/kjs/jscx/bzgf/art/2026/art_0aef187715f84bfd8c3581f5a5466955.html", topic: "industry", importanceScore: 90 },
  { industry: "机器人", title: "Figure与Catalyst Brands签署人形机器人部署协议", summary: "Figure宣布将人形机器人部署到配送物流网络，关注机器人从演示验证走向商业场景的节奏。", source: "Figure AI", publishedAt: "2026-05-26", url: "https://www.figure.ai/news/figure-signs-agreement-with-catalyst-brands", topic: "company", company: "Figure AI", importanceScore: 80 },
  { industry: "机器人", title: "Agility Robotics与丰田加拿大签署Digit商业部署协议", summary: "Agility Robotics披露丰田加拿大在试点后签署RaaS商业协议，Digit将用于制造、供应链与物流作业。", source: "Agility Robotics", publishedAt: "2026-02-19", url: "https://www.agilityrobotics.com/content/agility-robotics-announces-commercial-agreement-with-toyota-motor-manufacturing-canada", topic: "company", company: "Agility Robotics", importanceScore: 82 },
  { industry: "半导体", title: "电子信息制造业运行数据发布", summary: "官方数据覆盖集成电路产量与电子信息制造业增加值，可结合后续月份观察景气持续性。", source: "工业和信息化部", publishedAt: "2026-04-02", url: "https://www.miit.gov.cn/jgsj/yxj/xxfb/art/2026/art_3e7f61540ccc4dba87a3490423d5ac1f.html", topic: "industry", importanceScore: 86 },
  { industry: "半导体", title: "人工智能芯片兼容与RISC-V能力标准列入计划", summary: "行业标准计划涉及AI芯片兼容适配和RISC-V IP核企业能力评价。", source: "工业和信息化部", publishedAt: "2026-04-01", url: "https://www.miit.gov.cn/cms_files/filemanager/1226211233/attach/20264/f56078c08ae14e39b2e961153a4c6f87.pdf", topic: "industry", importanceScore: 90 },
  { industry: "半导体", title: "英特尔与蓝思科技合作推进AI时代先进封装", summary: "双方围绕玻璃基板、先进封装和精密加工开展合作，重点观察AI与数据中心工作负载带来的封装技术演进。", source: "Intel", publishedAt: "2026-07-24", url: "https://newsroom.intel.com/new-technologies/intel-and-lens-technology-collaborate-to-enable-advanced-semiconductor-packaging-for-the-ai-era", topic: "company", company: "Intel", importanceScore: 84 },
  { industry: "半导体", title: "英特尔宣布在爱尔兰扩充制造能力", summary: "英特尔宣布扩建爱尔兰Leixlip基地并升级先进制造设备，体现AI与高性能计算需求对晶圆制造资本开支的拉动。", source: "Intel", publishedAt: "2026-07-13", url: "https://newsroom.intel.com/intel-foundry/intel-invests-5-billion-euro-to-expand-manufacturing-in-europe", topic: "company", company: "Intel", importanceScore: 88 },
  { industry: "互联网大厂", title: "人工智能与产业互联网融合应用持续推进", summary: "官方信息聚焦人工智能与研发设计、生产制造、营销服务和运营管理的深度融合。", source: "工业和信息化部", publishedAt: "2026-07-09", url: "https://www.miit.gov.cn/xwfb/bldhd/art/2026/art_a1dcaacc0394430fa13197ef3946dece.html", topic: "industry", importanceScore: 88 },
  { industry: "互联网大厂", title: "腾讯云发布面向全球市场的AI工具与企业解决方案", summary: "腾讯披露模型、智能体、数据平台和云基础设施的新进展，关注企业AI从试验走向规模化部署的节奏。", source: "腾讯", publishedAt: "2026-05-28", url: "https://www.tencent.com/tencent-rolls-out-new-ai-tools-and-enterprise-solutions-for-global-markets-at-inaugural-tencent-cloud-day-hong-kong/", topic: "company", company: "腾讯", importanceScore: 78 },
  { industry: "互联网大厂", title: "阿里云外部收入增长提速，AI产品商业化继续扩大", summary: "阿里巴巴披露云智能业务与AI相关产品收入进展，可跟踪模型服务、云基础设施投入和企业客户采用情况。", source: "阿里巴巴", publishedAt: "2026-05-13", url: "https://www.alibabagroup.com/en-US/document-1991364841188622336", topic: "company", company: "阿里巴巴", importanceScore: 80 },
  { industry: "互联网大厂", title: "文心5.0正式版上线百度千帆", summary: "百度智能云发布原生全模态模型新版本，适合跟踪国产大模型在云平台、企业开发工具和多模态应用中的落地。", source: "百度智能云", publishedAt: "2026-01-23", url: "https://cloud.baidu.com/news/news", topic: "company", company: "百度", importanceScore: 76 },
  { industry: "制造业", title: "制造业数字化转型进入规模化评估阶段", summary: "工信部门总结制造业数字化改造、智能设备和人工智能应用进展，并提出面向2027年与2030年的转型评估目标。", source: "工业和信息化部", publishedAt: "2026-07-22", url: "https://wap.miit.gov.cn/jgsj/ghs/gzdt/art/2026/art_a132d7b17b774c6b9ff72d7a0befe158.html", topic: "industry", importanceScore: 92 },
  { industry: "制造业", title: "二季度制造业产能利用率及重点行业数据发布", summary: "国家统计数据覆盖通用设备、专用设备、汽车、电气机械和电子设备制造业，可用于判断生产景气、设备需求和产能变化。", source: "国家统计局", publishedAt: "2026-07-15", url: "https://www.stats.gov.cn/xxgk/sjfb/zxfb2020/202607/t20260715_1964130.html", topic: "industry", importanceScore: 88 },
  { industry: "制造业", title: "西门子与英伟达扩展工业AI合作", summary: "双方计划把AI、数字孪生、仿真和软件定义自动化贯穿设计、制造、运营与供应链。", source: "Siemens", publishedAt: "2026-01-06", url: "https://press.siemens.com/global/en/pressrelease/siemens-and-nvidia-expand-partnership-build-industrial-ai-operating-system", topic: "company", company: "西门子", importanceScore: 84 },
  { industry: "制造业", title: "三一巴西制造基地首批设备下线", summary: "三一官方动态反映工程机械企业的海外本地化制造、供应链建设和全球产能布局。", source: "SANY", publishedAt: "2026-07-14", url: "https://www.sanyglobal.com/news_list/", topic: "company", company: "三一集团", importanceScore: 76 },
];
