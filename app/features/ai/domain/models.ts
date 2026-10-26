export function providerLabel(provider: string) {
    return (({
        openai: "OpenAI",
        deepseek: "DeepSeek",
        anthropic: "Claude",
        gemini: "Gemini",
        custom: "兼容接口",
    } as Record<string, string>)[provider] || provider);
}
export function formatAIRunTime(value: string) {
    if (!value)
        return "尚未执行";
    try {
        return new Intl.DateTimeFormat("zh-CN", {
            timeZone: "Asia/Shanghai",
            month: "numeric",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        }).format(new Date(value));
    }
    catch {
        return value;
    }
}
