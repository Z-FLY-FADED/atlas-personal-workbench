"use client";
import { useMemo } from "react";
import type { WorkspaceState } from "../../../shell/useWorkspaceState";
import type { SemanticTopic } from "../domain/graph";
import { distributeGraphTopics, optimizedGraphCategories, semanticTopics } from "../domain/graph";
import { analyzeKnowledgeContent, rankKnowledgeRelations } from "../domain/intelligence";
import { KNOWLEDGE_TAXONOMY } from "../domain/taxonomy";
import { buildKnowledgeDigest, buildTextbookFrame } from "../domain/textbook";
import { getKnowledgeVisualProfile } from "../domain/visualProfiles";
type Dependencies = Pick<WorkspaceState, "knowledge" | "activeCategory" | "selectedKnowledge" | "documentDraft" | "documentTitle" | "documentFileName">;
export function useKnowledgeSelectors(dependencies: Dependencies) {
    const { knowledge, activeCategory, selectedKnowledge, documentDraft, documentTitle, documentFileName } = dependencies;
    const categoryCounts = useMemo(() => Object.fromEntries(KNOWLEDGE_TAXONOMY.map((category) => [
        category.name,
        knowledge.filter((item) => item.primaryCategory === category.name)
            .length,
    ])), [knowledge]);
    const secondaryGroups = useMemo(() => {
        const selected = activeCategory === "全部"
            ? knowledge
            : knowledge.filter((item) => item.primaryCategory === activeCategory);
        return Object.entries(selected.reduce<Record<string, number>>((groups, item) => {
            groups[item.secondaryCategory] =
                (groups[item.secondaryCategory] || 0) + 1;
            return groups;
        }, {})).sort((a, b) => b[1] - a[1]);
    }, [knowledge, activeCategory]);
    const semanticGraph = useMemo(() => {
        const discoveredNames = [
            ...new Set(knowledge.flatMap((item) => item.relatedTopics || [])),
        ]
            .filter((name) => !semanticTopics.some((topic) => topic.name === name))
            .slice(0, 10);
        const discoveredTopics: SemanticTopic[] = discoveredNames.map((name, index) => {
            const relatedItems = knowledge.filter((item) => item.relatedTopics?.includes(name));
            const categories = [
                ...new Set(relatedItems.map((item) => item.primaryCategory)),
            ].slice(0, 4);
            const meta = KNOWLEDGE_TAXONOMY.find((item) => item.name === categories[0]);
            const angle = index * 2.399 + 0.55;
            const radius = 0.48 + (index % 3) * 0.08;
            return {
                id: `auto-${encodeURIComponent(name)}`,
                name,
                x: Math.cos(angle) * radius,
                y: Math.sin(angle) * radius,
                z: 0.12 + (index % 4) * 0.12,
                categories: categories.length ? categories : ["通用"],
                keywords: [
                    name,
                    ...relatedItems.flatMap((item) => item.keywords || []).slice(0, 5),
                ],
                color: meta?.color || "#c6a76d",
            };
        });
        const topicSeeds = [...semanticTopics, ...discoveredTopics].map((topic) => ({
            ...topic,
            items: knowledge.filter((item) => item.relatedTopics?.includes(topic.name) ||
                topic.keywords.some((keyword) => `${item.title}${item.summary}${item.content || ""}${item.secondaryCategory}`
                    .toLowerCase()
                    .includes(keyword.toLowerCase()))),
        }));
        const topics = distributeGraphTopics(topicSeeds);
        const graphKnowledge = [...knowledge]
            .sort((a, b) => a.primaryCategory.localeCompare(b.primaryCategory, "zh-CN") ||
            a.secondaryCategory.localeCompare(b.secondaryCategory, "zh-CN") ||
            a.id - b.id)
            .slice(0, 30);
        const articleSlots = graphKnowledge.map((_, index) => {
            const angle = -Math.PI / 2 +
                (index * Math.PI * 2) / Math.max(1, graphKnowledge.length);
            const band = index % 3;
            const radius = 0.24 + band * 0.055;
            return {
                x: Math.cos(angle) * radius,
                y: Math.sin(angle) * radius * 0.88,
                z: ((index % 5) - 2) * 0.075,
            };
        });
        const articles = graphKnowledge.map((item, index) => {
            const matched = topics.find((topic) => item.relatedTopics?.includes(topic.name)) ||
                topics.find((topic) => topic.items.some((entry) => entry.id === item.id));
            const category = optimizedGraphCategories.find((entry) => entry.name === item.primaryCategory) || optimizedGraphCategories[index % optimizedGraphCategories.length];
            const anchor = matched || category;
            const anchorId = matched?.id || category.name;
            let bestIndex = 0;
            let bestDistance = Number.POSITIVE_INFINITY;
            articleSlots.forEach((slot, slotIndex) => {
                const distance = Math.hypot(slot.x - anchor.x, slot.y - anchor.y);
                if (distance < bestDistance) {
                    bestDistance = distance;
                    bestIndex = slotIndex;
                }
            });
            const slot = articleSlots.splice(bestIndex, 1)[0];
            return { item, anchorId, ...slot };
        });
        const visibleIds = new Set(articles.map((article) => article.item.id));
        const seenRelations = new Set<string>();
        const relationEdges = articles.flatMap(({ item }) => {
            const relatedIds = [
                ...new Set([
                    ...(item.relatedIds || []),
                    ...rankKnowledgeRelations(item, knowledge, 3).map((relation) => relation.id),
                ]),
            ];
            return relatedIds
                .filter((id) => visibleIds.has(id))
                .slice(0, 3)
                .flatMap((id) => {
                const key = [item.id, id].sort((a, b) => a - b).join("-");
                if (seenRelations.has(key))
                    return [];
                seenRelations.add(key);
                return [{ fromId: item.id, toId: id }];
            });
        });
        const topicEdges = topics
            .flatMap((topic, topicIndex) => topics.slice(topicIndex + 1).flatMap((candidate) => {
            const sharedCategories = topic.categories.filter((category) => candidate.categories.includes(category));
            const sharedItems = topic.items.filter((item) => candidate.items.some((candidateItem) => candidateItem.id === item.id));
            return sharedCategories.length >= 2 || sharedItems.length
                ? [{ fromId: topic.id, toId: candidate.id }]
                : [];
        }))
            .slice(0, 14);
        return { topics, articles, relationEdges, topicEdges };
    }, [knowledge]);
    const selectedDigest = selectedKnowledge
        ? buildKnowledgeDigest(selectedKnowledge)
        : null;
    const selectedTextbook = selectedKnowledge && selectedDigest
        ? buildTextbookFrame(selectedKnowledge, selectedDigest)
        : null;
    const knowledgeVisualProfile = selectedKnowledge
        ? getKnowledgeVisualProfile(selectedKnowledge.title, `${selectedKnowledge.primaryCategory} ${selectedKnowledge.secondaryCategory}`)
        : null;
    const documentPreview = useMemo(() => {
        if (!documentDraft.trim())
            return null;
        const title = documentTitle.trim() ||
            documentFileName.replace(/\.[^.]+$/, "") ||
            "未命名文档";
        return analyzeKnowledgeContent({
            title,
            content: documentDraft,
            sourceType: "文档",
        });
    }, [documentDraft, documentFileName, documentTitle]);
    return { categoryCounts, secondaryGroups, semanticGraph, selectedDigest, selectedTextbook, knowledgeVisualProfile, documentPreview };
}
export type KnowledgeSelectorsResult = ReturnType<typeof useKnowledgeSelectors>;
