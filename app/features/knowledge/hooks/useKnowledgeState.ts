"use client";
import { useRef, useState } from "react";
import type { Knowledge } from "../../../contracts/workspace";
import { initialKnowledge } from "../domain/initialKnowledge";
export function useKnowledgeState() {
    const [knowledge, setKnowledge] = useState<Knowledge[]>(initialKnowledge);
    const [libraryQuery, setLibraryQuery] = useState('');
    const [captureSeed, setCaptureSeed] = useState('');
    const [knowledgePreferences, setKnowledgePreferences] = useState<Array<{
        knowledgeKey: string;
        primaryCategory: string;
        secondaryCategory: string;
        cover: string;
    }>>([]);
    const [recentKeys, setRecentKeys] = useState<string[]>([]);
    const [captureModal, setCaptureModal] = useState(false);
    const [captureMode, setCaptureMode] = useState<'note' | 'web'>('note');
    const [webCaptureBusy, setWebCaptureBusy] = useState(false);
    const [documentModal, setDocumentModal] = useState(false);
    const [documentParsing, setDocumentParsing] = useState(false);
    const [documentDraft, setDocumentDraft] = useState("");
    const [documentFileName, setDocumentFileName] = useState("");
    const [documentTitle, setDocumentTitle] = useState("");
    const [selectedKnowledge, changeSelectedKnowledge] = useState<Knowledge | null>(null);
    const [activeCategory, setActiveCategory] = useState("全部");
    const [graphViewport, setGraphViewport] = useState({ x: 0, y: 0, scale: 1 });
    const [graphPanning, setGraphPanning] = useState(false);
    const [graphFocus, setGraphFocus] = useState<string | null>(null);
    const graphGesture = useRef({ startX: 0, startY: 0, originX: 0, originY: 0 });
    return { knowledge, setKnowledge, libraryQuery, setLibraryQuery, captureSeed, setCaptureSeed, knowledgePreferences, setKnowledgePreferences, recentKeys, setRecentKeys, captureModal, setCaptureModal, captureMode, setCaptureMode, webCaptureBusy, setWebCaptureBusy, documentModal, setDocumentModal, documentParsing, setDocumentParsing, documentDraft, setDocumentDraft, documentFileName, setDocumentFileName, documentTitle, setDocumentTitle, selectedKnowledge, changeSelectedKnowledge, activeCategory, setActiveCategory, graphViewport, setGraphViewport, graphPanning, setGraphPanning, graphFocus, setGraphFocus, graphGesture };
}
