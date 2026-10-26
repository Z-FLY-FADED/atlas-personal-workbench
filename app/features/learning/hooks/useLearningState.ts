"use client";
import { useState } from "react";
import type { LearningLanguage } from "../domain/lessons";
export function useLearningState() {
    const [activeLanguageRoute, setActiveLanguageRoute] = useState<Record<LearningLanguage, number>>({
        英语学习: 0,
        日语学习: 0,
    });
    const [translationDraft, setTranslationDraft] = useState("");
    const [writingDraft, setWritingDraft] = useState("");
    const [translationRevealed, setTranslationRevealed] = useState(false);
    return { activeLanguageRoute, setActiveLanguageRoute, translationDraft, setTranslationDraft, writingDraft, setWritingDraft, translationRevealed, setTranslationRevealed };
}
