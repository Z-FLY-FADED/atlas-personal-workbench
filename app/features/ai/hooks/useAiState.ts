"use client";
import { useState } from "react";
import type { AIConnection, AIData, AISchedule } from "../../../contracts/workspace";
export function useAiState() {
    const [aiData, setAiData] = useState<AIData | null>(null);
    const [aiLoading, setAiLoading] = useState(true);
    const [aiError, setAiError] = useState('');
    const [aiConnectionModal, setAiConnectionModal] = useState(false);
    const [aiScheduleModal, setAiScheduleModal] = useState(false);
    const [editingConnection, setEditingConnection] = useState<AIConnection | null>(null);
    const [editingSchedule, setEditingSchedule] = useState<AISchedule | null>(null);
    const [aiPrompt, setAiPrompt] = useState("");
    const [aiConnectionId, setAiConnectionId] = useState(0);
    const [aiUseWeb, setAiUseWeb] = useState(false);
    const [aiRunning, setAiRunning] = useState(false);
    const [aiResult, setAiResult] = useState("");
    return { aiData, setAiData, aiLoading, setAiLoading, aiError, setAiError, aiConnectionModal, setAiConnectionModal, aiScheduleModal, setAiScheduleModal, editingConnection, setEditingConnection, editingSchedule, setEditingSchedule, aiPrompt, setAiPrompt, aiConnectionId, setAiConnectionId, aiUseWeb, setAiUseWeb, aiRunning, setAiRunning, aiResult, setAiResult };
}
