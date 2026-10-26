export type DailyLanguageWord = {
    term: string;
    reading?: string;
    meaning: string;
    example: string;
    translation: string;
    tag: string;
};
export type DailyLanguageCase = {
    title: string;
    scene: string;
    original: string;
    translation: string;
    tasks: string[];
};
export type LearningLanguage = "英语学习" | "日语学习";
export const languageWordBank: Record<LearningLanguage, DailyLanguageWord[]> = {
    英语学习: [
        {
            term: "analyze",
            meaning: "分析；解析",
            example: "Students should analyze the evidence before reaching a conclusion.",
            translation: "学生在得出结论前应当分析证据。",
            tag: "CET-6 高频",
        },
        {
            term: "significant",
            meaning: "重要的；显著的",
            example: "Regular reading can make a significant difference to vocabulary growth.",
            translation: "规律阅读能显著促进词汇增长。",
            tag: "阅读",
        },
        {
            term: "maintain",
            meaning: "保持；维护",
            example: "It is difficult to maintain concentration without enough sleep.",
            translation: "睡眠不足时很难保持专注。",
            tag: "完形",
        },
        {
            term: "evidence",
            meaning: "证据；依据",
            example: "There is growing evidence that exercise improves memory.",
            translation: "越来越多证据表明运动能够改善记忆。",
            tag: "阅读",
        },
        {
            term: "impact",
            meaning: "影响；冲击",
            example: "Technology has a major impact on the way people communicate.",
            translation: "技术对人们的沟通方式产生重大影响。",
            tag: "写作",
        },
        {
            term: "require",
            meaning: "需要；要求",
            example: "The task requires both patience and careful planning.",
            translation: "这项任务既需要耐心，也需要周密规划。",
            tag: "CET-6 高频",
        },
        {
            term: "indicate",
            meaning: "表明；指出",
            example: "The survey results indicate a change in consumer habits.",
            translation: "调查结果表明消费者习惯发生了变化。",
            tag: "阅读",
        },
        {
            term: "approach",
            meaning: "方法；接近",
            example: "A practical approach is to review new words in context.",
            translation: "一种实用方法是在语境中复习新单词。",
            tag: "写作",
        },
        {
            term: "available",
            meaning: "可获得的；有空的",
            example: "More learning resources are now available online.",
            translation: "现在网上可以获得更多学习资源。",
            tag: "听力",
        },
        {
            term: "contribute",
            meaning: "贡献；促成",
            example: "Good study habits contribute to long-term progress.",
            translation: "良好的学习习惯有助于长期进步。",
            tag: "搭配",
        },
        {
            term: "establish",
            meaning: "建立；确立",
            example: "The school established a program to support new students.",
            translation: "学校设立了帮助新生的项目。",
            tag: "CET-6 高频",
        },
        {
            term: "respond",
            meaning: "回答；作出反应",
            example: "Please respond to the question in no more than two sentences.",
            translation: "请用不超过两句话回答问题。",
            tag: "听力",
        },
    ],
    日语学习: [
        {
            term: "あ",
            reading: "a",
            meaning: "平假名 a",
            example: "あさ（朝）",
            translation: "早晨",
            tag: "あ行",
        },
        {
            term: "い",
            reading: "i",
            meaning: "平假名 i",
            example: "いえ（家）",
            translation: "家",
            tag: "あ行",
        },
        {
            term: "う",
            reading: "u",
            meaning: "平假名 u",
            example: "うみ（海）",
            translation: "海",
            tag: "あ行",
        },
        {
            term: "え",
            reading: "e",
            meaning: "平假名 e",
            example: "えき（駅）",
            translation: "车站",
            tag: "あ行",
        },
        {
            term: "お",
            reading: "o",
            meaning: "平假名 o",
            example: "おと（音）",
            translation: "声音",
            tag: "あ行",
        },
        {
            term: "か",
            reading: "ka",
            meaning: "平假名 ka",
            example: "かさ（傘）",
            translation: "伞",
            tag: "か行",
        },
        {
            term: "き",
            reading: "ki",
            meaning: "平假名 ki",
            example: "き（木）",
            translation: "树；木头",
            tag: "か行",
        },
        {
            term: "く",
            reading: "ku",
            meaning: "平假名 ku",
            example: "くつ（靴）",
            translation: "鞋",
            tag: "か行",
        },
        {
            term: "け",
            reading: "ke",
            meaning: "平假名 ke",
            example: "けさ（今朝）",
            translation: "今天早晨",
            tag: "か行",
        },
        {
            term: "こ",
            reading: "ko",
            meaning: "平假名 ko",
            example: "こえ（声）",
            translation: "声音；嗓音",
            tag: "か行",
        },
        {
            term: "さ",
            reading: "sa",
            meaning: "平假名 sa",
            example: "さかな（魚）",
            translation: "鱼",
            tag: "さ行",
        },
        {
            term: "し",
            reading: "shi",
            meaning: "平假名 shi",
            example: "しお（塩）",
            translation: "盐",
            tag: "さ行",
        },
    ],
};
export const languageCaseBank: Record<LearningLanguage, DailyLanguageCase[]> = {
    英语学习: [
        {
            title: "CET-6 阅读：规律运动与学习效率",
            scene: "六级阅读与翻译训练：识别主题句、因果关系和作者观点。",
            original: "Many students believe that studying longer always leads to better results. However, research suggests that short periods of regular exercise can improve attention and memory. The key is not to replace study time, but to arrange both activities in a balanced way.",
            translation: "许多学生认为学习时间越长，效果就越好。然而研究表明，短时间的规律运动可以改善注意力和记忆力。关键不是用运动取代学习，而是平衡安排两类活动。",
            tasks: [
                "用一句英文概括文章主旨",
                "找出转折词并判断作者观点",
                "完成一段 150 词的观点写作",
            ],
        },
        {
            title: "日常对话：图书馆服务咨询",
            scene: "生活英语对话训练：抓取地点、时间、目的与解决方案。",
            original: "The library will extend its opening hours during the exam week. Students may reserve a study room online, but each reservation is limited to two hours. Those who need help can ask at the information desk on the first floor.",
            translation: "考试周期间图书馆将延长开放时间。学生可以在线预约自习室，但每次预约限两小时；需要帮助可前往一楼咨询台。",
            tasks: [
                "记录三个关键信息点",
                "复述预约限制",
                "模拟回答一道主旨题和一道细节题",
            ],
        },
        {
            title: "CET-6 写作：合理使用智能工具",
            scene: "六级写作训练：建立观点、理由、例证和结论。",
            original: "Intelligent tools can make learning more efficient, but they should be used as assistants rather than substitutes for thinking. Students need to check information, compare different sources, and explain ideas in their own words.",
            translation: "智能工具能够提高学习效率，但应作为辅助工具，而不是思考的替代品。学生需要核对信息、比较不同来源，并用自己的语言解释观点。",
            tasks: [
                "提取中心论点和两个支撑点",
                "补写一个具体例子",
                "完成 120—150 词考试作文",
            ],
        },
    ],
    日语学习: [
        {
            title: "五十音入门：あ行",
            scene: "零基础第一课：识别并准确读出 あ、い、う、え、お。",
            original: "あ・い・う・え・お。あさ、いえ、うみ、えき、おと。",
            translation: "a、i、u、e、o。早晨、家、海、车站、声音。",
            tasks: [
                "按顺序跟读あ行五个假名三遍",
                "遮住罗马音后独立认读",
                "各抄写五遍并说出对应基础词",
            ],
        },
        {
            title: "五十音入门：か行",
            scene: "零基础第二课：掌握清音 か、き、く、け、こ。",
            original: "か・き・く・け・こ。かさ、き、くつ、けさ、こえ。",
            translation: "ka、ki、ku、ke、ko。伞、树、鞋、今天早晨、声音。",
            tasks: [
                "对比あ行与か行的口型和送气",
                "听音后指出正确假名",
                "各抄写五遍并完成あ行、か行混合认读",
            ],
        },
        {
            title: "五十音入门：さ行",
            scene: "零基础第三课：学习 さ、し、す、せ、そ，重点区分 shi 的发音。",
            original: "さ・し・す・せ・そ。さかな、しお、すし、せかい、そら。",
            translation: "sa、shi、su、se、so。鱼、盐、寿司、世界、天空。",
            tasks: [
                "慢速跟读さ行并重点练习し",
                "随机认读あ行、か行、さ行",
                "用假名卡完成听音选字练习",
            ],
        },
    ],
};
export function getDailyLanguageLesson(language: LearningLanguage, dateKey: string) {
    const seed = Number(dateKey.replace(/\D/g, ""));
    const bank = languageWordBank[language];
    const start = seed % bank.length;
    const words = Array.from({ length: 6 }, (_, index) => bank[(start + index) % bank.length]);
    const caseStudy = language === "日语学习"
        ? languageCaseBank[language][seed % languageCaseBank[language].length]
        : languageCaseBank[language][seed % languageCaseBank[language].length];
    return { dateKey, words, caseStudy };
}
