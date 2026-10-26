export function readLocal<T>(key: string, fallback: T): T {
    if (typeof window === 'undefined')
        return fallback;
    try {
        return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback;
    }
    catch {
        return fallback;
    }
}
export function writeLocal(key: string, value: unknown) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
    }
    catch {
        return false;
    }
}
export function clearFormDraft(form: HTMLFormElement) {
    try {
        if (form.dataset.draftKey)
            localStorage.removeItem(form.dataset.draftKey);
    }
    catch { /* Storage unavailable. */ }
}
