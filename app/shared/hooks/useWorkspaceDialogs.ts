"use client";
import { useEffect, useRef } from 'react';
import { readLocal, writeLocal } from '../lib/storage';
export function useWorkspaceDialogs(identity: string, onClose: () => void) {
    const closeRef = useRef(onClose);
    const lastFocus = useRef<HTMLElement | null>(null);
    useEffect(() => { closeRef.current = onClose; });
    useEffect(() => {
        if (!identity) {
            const track = (event: FocusEvent) => { lastFocus.current = event.target as HTMLElement; };
            document.addEventListener('focusin', track);
            return () => document.removeEventListener('focusin', track);
        }
        let cleanup: (() => void) | undefined;
        const attach = () => {
            const layer = Array.from(document.querySelectorAll<HTMLElement>('.modal-backdrop, .workspace-entry-layer, .workspace-reminder-layer')).at(-1);
            if (!layer)
                return false;
            const dialog = layer.querySelector<HTMLElement>('[role="dialog"]') || layer.querySelector<HTMLElement>('form, article') || layer;
            dialog.setAttribute('role', 'dialog');
            dialog.setAttribute('aria-modal', 'true');
            dialog.setAttribute('aria-label', dialog.querySelector('h2')?.textContent || '工作台窗口');
            const form = dialog instanceof HTMLFormElement ? dialog : dialog.querySelector('form');
            const draftKey = form?.dataset.draftKey;
            if (form && draftKey) {
                const draft = readLocal<Record<string, string>>(draftKey, {});
                for (const [name, value] of Object.entries(draft)) {
                    const field = form.elements.namedItem(name);
                    if (field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement || field instanceof HTMLSelectElement)
                        field.value = value;
                }
            }
            const saveDraft = (event?: Event) => {
                // Child editors persist independently; they must not create a stale parent draft.
                if (event && (!(event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement || event.target instanceof HTMLSelectElement) || !event.target.name))
                    return;
                if (form && draftKey)
                    writeLocal(draftKey, Object.fromEntries(Array.from(new FormData(form).entries()).filter(([, value]) => typeof value === 'string')));
            };
            const focusables = () => Array.from(dialog.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), a[href], [tabindex="0"]')).filter(el => el.getClientRects().length);
            if (!dialog.contains(document.activeElement))
                (focusables()[0] || dialog).focus();
            const keydown = (event: KeyboardEvent) => {
                if (event.key === 'Escape') {
                    event.preventDefault();
                    saveDraft();
                    closeRef.current();
                }
                if (event.key === 'Tab') {
                    const items = focusables();
                    const first = items[0];
                    const last = items.at(-1);
                    if (event.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) {
                        event.preventDefault();
                        last?.focus();
                    }
                    if (!event.shiftKey && (document.activeElement === last || !dialog.contains(document.activeElement))) {
                        event.preventDefault();
                        first?.focus();
                    }
                }
            };
            document.addEventListener('keydown', keydown);
            form?.addEventListener('input', saveDraft);
            form?.addEventListener('change', saveDraft);
            cleanup = () => { document.removeEventListener('keydown', keydown); form?.removeEventListener('input', saveDraft); form?.removeEventListener('change', saveDraft); lastFocus.current?.focus(); };
            return true;
        };
        // A lazy dialog can arrive after the effect. Bind keyboard and draft behavior
        // when its DOM mounts, and stop observing as soon as the dialog is ready.
        const observer = new MutationObserver(() => {
            if (attach())
                observer.disconnect();
        });
        if (!attach())
            observer.observe(document.body, { childList: true, subtree: true });
        return () => { observer.disconnect(); cleanup?.(); };
    }, [identity]);
}
