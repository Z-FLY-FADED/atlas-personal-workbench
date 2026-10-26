"use client";
import { useEffect, useMemo } from "react";
import type { WorkspaceState } from "../../../shell/useWorkspaceState";
import type { LearningLanguage } from "../domain/lessons";
import { getDailyLanguageLesson } from "../domain/lessons";
type Dependencies = Pick<WorkspaceState, "view" | "currentTaskDay" | "setTranslationDraft" | "setWritingDraft" | "setTranslationRevealed" | "writingDraft" | "setToast" | "setActiveLanguageRoute">;
export function useLanguageLearning(dependencies: Dependencies) {
    const { view, currentTaskDay, setTranslationDraft, setWritingDraft, setTranslationRevealed, writingDraft, setToast, setActiveLanguageRoute } = dependencies;
    const currentLanguage: LearningLanguage = view === "日语学习" ? "日语学习" : "英语学习";
    const dailyLanguage = useMemo(() => getDailyLanguageLesson(currentLanguage, currentTaskDay), [currentLanguage, currentTaskDay]);
    useEffect(() => {
        if (currentLanguage !== "英语学习")
            return;
        const timer = window.setTimeout(() => {
            try {
                setTranslationDraft(localStorage.getItem(`atlas-translation-${dailyLanguage.dateKey}`) || '');
                setWritingDraft(localStorage.getItem(`atlas-writing-${dailyLanguage.dateKey}`) || '');
            }
            catch { /* Storage unavailable. */ }
            setTranslationRevealed(false);
        }, 0);
        return () => clearTimeout(timer);
    }, [currentLanguage, dailyLanguage.dateKey, setTranslationDraft, setTranslationRevealed, setWritingDraft]);
    const languageExam = currentLanguage === "英语学习"
        ? {
            target: "CET-6 + 日常英语",
            stage: "六级备考 · 日常会话",
            description: "围绕 CET-6 核心能力训练，同时补充真实生活场景中的听说对话。",
            routes: [
                { label: "CET-6 核心词汇", target: "language-vocabulary" },
                { label: "日常对话听力", target: "language-conversation" },
                { label: "阅读与翻译", target: "language-reading" },
                { label: "写作输出", target: "language-writing" },
            ],
        }
        : {
            target: "JLPT N5 入门",
            stage: "零基础 · 从五十音开始",
            description: "先建立假名、发音和基本句型，再进入 N5 词汇、语法、听力与日常会话。",
            routes: [
                { label: "五十音与发音", target: "language-vocabulary" },
                { label: "假名基础词汇", target: "language-vocabulary" },
                { label: "基础助词句型", target: "language-conversation" },
                { label: "日常听力会话", target: "language-output" },
            ],
        };
    const writingWordCount = writingDraft.trim()
        ? writingDraft.trim().split(/\s+/).length
        : 0;
    function speakLanguage(text: string) {
        if (!("speechSynthesis" in window)) {
            setToast("当前浏览器暂不支持语音朗读");
            return;
        }
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = currentLanguage === "英语学习" ? "en-US" : "ja-JP";
        utterance.rate = currentLanguage === "英语学习" ? 0.86 : 0.78;
        window.speechSynthesis.speak(utterance);
    }
    function openLanguageRoute(index: number, target: string) {
        setActiveLanguageRoute((routes) => ({ ...routes, [currentLanguage]: index }));
        window.requestAnimationFrame(() => {
            document.getElementById(target)?.scrollIntoView({ behavior: "smooth", block: "start" });
        });
    }
    function saveLanguageDraft(kind: "translation" | "writing", content: string) {
        const value = content.trim();
        if (!value) {
            setToast(kind === "translation" ? "请先填写翻译内容" : "请先填写写作内容");
            return;
        }
        try {
            localStorage.setItem(`atlas-${kind}-${dailyLanguage.dateKey}`, value);
            setToast(kind === "translation" ? "今日翻译练习已保存" : "今日写作练习已保存");
        }
        catch {
            setToast('本机存储不可用，请复制练习内容保存');
        }
    }
    return { currentLanguage, dailyLanguage, languageExam, writingWordCount, speakLanguage, openLanguageRoute, saveLanguageDraft };
}
export type LanguageLearningResult = ReturnType<typeof useLanguageLearning>;
