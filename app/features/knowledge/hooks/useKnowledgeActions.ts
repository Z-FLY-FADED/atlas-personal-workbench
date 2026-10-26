"use client";
import type { ChangeEvent, FormEvent, PointerEvent as ReactPointerEvent, WheelEvent as ReactWheelEvent } from "react";
import type { Knowledge } from "../../../contracts/workspace";
import { clearFormDraft, writeLocal } from "../../../shared/hooks/useWorkspaceIO";
import { extractDocumentText } from "../../../shared/lib/documents";
import type { WorkspaceSessionResult } from "../../../shell/useWorkspaceSession";
import type { WorkspaceState } from "../../../shell/useWorkspaceState";
import { enrichKnowledge } from "../domain/enrichment";
import { analyzeKnowledgeContent, rankKnowledgeRelations } from "../domain/intelligence";
import type { KnowledgeSelectorsResult } from "./useKnowledgeSelectors";
type Dependencies = Pick<WorkspaceState & WorkspaceSessionResult & KnowledgeSelectorsResult, "mutationLocks" | "knowledge" | "workspaceRequest" | "setKnowledge" | "setCaptureModal" | "setCaptureSeed" | "setView" | "setActiveCategory" | "setToast" | "setDocumentParsing" | "setDocumentDraft" | "setDocumentFileName" | "setDocumentTitle" | "documentPreview" | "documentDraft" | "documentFileName" | "setDocumentModal" | "setGraphViewport" | "graphGesture" | "graphViewport" | "setGraphPanning" | "graphPanning">;
export function useKnowledgeActions(dependencies: Dependencies) {
    const { mutationLocks, knowledge, workspaceRequest, setKnowledge, setCaptureModal, setCaptureSeed, setView, setActiveCategory, setToast, setDocumentParsing, setDocumentDraft, setDocumentFileName, setDocumentTitle, documentPreview, documentDraft, documentFileName, setDocumentModal, setGraphViewport, graphGesture, graphViewport, setGraphPanning, graphPanning } = dependencies;
    async function addKnowledge(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (mutationLocks.current.has("save-knowledge"))
            return;
        const formElement = event.currentTarget;
        const form = new FormData(formElement);
        const sourceType = String(form.get("sourceType"));
        const content = String(form.get("content"));
        const source = String(form.get("source"));
        const submittedTitle = String(form.get("title")) || "新收录内容";
        const intelligence = analyzeKnowledgeContent({
            title: submittedTitle,
            content,
            sourceType,
        });
        const enrichment = enrichKnowledge({ ...intelligence, content });
        const draft: Knowledge = {
            id: Date.now(),
            ...intelligence,
            enrichment,
            completeness: enrichment.completeness,
            content,
            source,
            sourceType,
            createdAt: new Date().toISOString(),
            relatedIds: [],
        };
        draft.relatedIds = rankKnowledgeRelations(draft, knowledge).map((relation) => relation.id);
        mutationLocks.current.add('save-knowledge');
        try {
            const response = await workspaceRequest('/api/workspace', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'knowledge', ...draft, createdAt: new Date().toISOString() }) });
            const { item } = await response.json() as {
                item: Knowledge;
            };
            setKnowledge(items => [item, ...items]);
            clearFormDraft(formElement);
            setCaptureModal(false);
            setCaptureSeed('');
            setView('知识库');
            setActiveCategory(item.primaryCategory);
            setToast('知识已保存并完成分类');
        }
        catch {
            setToast('知识保存失败，原始内容已保留，请重试');
        }
        finally {
            mutationLocks.current.delete('save-knowledge');
        }
    }
    async function handleKnowledgeDocument(event: ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0];
        if (!file)
            return;
        if (file.size > 12 * 1024 * 1024) {
            setToast("文档不能超过 12 MB");
            event.target.value = "";
            return;
        }
        setDocumentParsing(true);
        try {
            const content = await extractDocumentText(file);
            if (content.length < 40)
                throw new Error("没有读取到足够文字；扫描版 PDF 请先进行 OCR 识别");
            setDocumentDraft(content);
            setDocumentFileName(file.name);
            setDocumentTitle(file.name.replace(/\.[^.]+$/, ""));
            setToast(`已读取 ${file.name}，请确认摘要后加入知识库`);
        }
        catch (error) {
            setToast(error instanceof Error ? error.message : "文档读取失败");
        }
        finally {
            setDocumentParsing(false);
            event.target.value = "";
        }
    }
    async function addKnowledgeDocument(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (mutationLocks.current.has("save-document"))
            return;
        if (!documentPreview || documentDraft.length < 40) {
            setToast("请先选择并读取文档");
            return;
        }
        const enrichment = enrichKnowledge({
            title: documentPreview.title,
            summary: documentPreview.summary,
            content: documentDraft,
            primaryCategory: documentPreview.primaryCategory,
            secondaryCategory: documentPreview.secondaryCategory,
        });
        const draft: Knowledge = {
            id: Date.now(),
            title: documentPreview.title,
            summary: documentPreview.summary,
            primaryCategory: documentPreview.primaryCategory,
            secondaryCategory: documentPreview.secondaryCategory,
            confidence: documentPreview.confidence,
            enrichment,
            completeness: enrichment.completeness,
            keywords: documentPreview.keywords,
            relatedTopics: documentPreview.relatedTopics,
            relatedIds: [],
            content: documentDraft,
            source: documentFileName,
            sourceType: "文档",
            createdAt: new Date().toISOString(),
        };
        draft.relatedIds = rankKnowledgeRelations(draft, knowledge).map((relation) => relation.id);
        mutationLocks.current.add('save-document');
        try {
            const response = await workspaceRequest("/api/workspace", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ type: "knowledge", ...draft }),
            });
            if (!response.ok)
                throw new Error("文档保存失败");
            const { item } = (await response.json()) as {
                item: Knowledge;
            };
            setKnowledge(items => [item, ...items]);
            setDocumentModal(false);
            setView('知识库');
            setActiveCategory(item.primaryCategory);
            setDocumentDraft('');
            setDocumentFileName('');
            setDocumentTitle('');
            writeLocal('atlas-document-draft', null);
            setToast(`文档已自动总结、分类，并建立 ${item.relatedIds?.length || 0} 条知识关联`);
        }
        catch (error) {
            setToast(error instanceof Error ? error.message : "文档保存失败，请稍后重试");
        }
        finally {
            mutationLocks.current.delete('save-document');
        }
    }
    function zoomGraph(amount: number) {
        setGraphViewport((current) => ({
            ...current,
            scale: Math.min(1.9, Math.max(0.62, current.scale + amount)),
        }));
    }
    function handleGraphWheel(event: ReactWheelEvent<HTMLDivElement>) {
        event.preventDefault();
        setGraphViewport((current) => ({
            ...current,
            scale: Math.min(1.9, Math.max(0.62, current.scale - event.deltaY * 0.0012)),
        }));
    }
    function startGraphPan(event: ReactPointerEvent<HTMLDivElement>) {
        if ((event.target as HTMLElement).closest("button"))
            return;
        graphGesture.current = {
            startX: event.clientX,
            startY: event.clientY,
            originX: graphViewport.x,
            originY: graphViewport.y,
        };
        event.currentTarget.setPointerCapture(event.pointerId);
        setGraphPanning(true);
    }
    function moveGraphPan(event: ReactPointerEvent<HTMLDivElement>) {
        if (!graphPanning)
            return;
        const rotateY = graphGesture.current.originX +
            (event.clientX - graphGesture.current.startX) * 0.36;
        const rotateX = Math.max(-52, Math.min(52, graphGesture.current.originY -
            (event.clientY - graphGesture.current.startY) * 0.3));
        setGraphViewport((current) => ({ ...current, x: rotateY, y: rotateX }));
    }
    function endGraphPan(event: ReactPointerEvent<HTMLDivElement>) {
        if (!graphPanning)
            return;
        if (event.currentTarget.hasPointerCapture(event.pointerId))
            event.currentTarget.releasePointerCapture(event.pointerId);
        setGraphPanning(false);
    }
    return { addKnowledge, handleKnowledgeDocument, addKnowledgeDocument, zoomGraph, handleGraphWheel, startGraphPan, moveGraphPan, endGraphPan };
}
export type KnowledgeActionsResult = ReturnType<typeof useKnowledgeActions>;
