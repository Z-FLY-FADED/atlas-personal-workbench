"use client";
import { useRef, useState } from "react";
import type { Theme, View } from "../contracts/workspace";
export function useShellState() {
    const [view, changeView] = useState<View>("工作台");
    const [theme, setTheme] = useState<Theme>("ivory");
    const [themeReady, setThemeReady] = useState(false);
    const [query, setQuery] = useState("");
    const [workspaceReady, setWorkspaceReady] = useState(false);
    const mutationLocks = useRef(new Set<string>());
    const [toast, setToast] = useState("");
    const [mobileMenu, setMobileMenu] = useState(false);
    return { view, changeView, theme, setTheme, themeReady, setThemeReady, query, setQuery, workspaceReady, setWorkspaceReady, mutationLocks, toast, setToast, mobileMenu, setMobileMenu };
}
