export type IdentifiedKnowledge = {
    id: number;
    title: string;
    stableKey?: string;
};
export function knowledgeKey(item: IdentifiedKnowledge) {
    return item.stableKey || `saved:${item.id}`;
}
export function findKnowledge<T extends IdentifiedKnowledge>(items: T[], key: string) {
    return items.find(item => knowledgeKey(item) === key) || items.find(item => item.title === key);
}
export function knowledgePreference<T extends {
    knowledgeKey: string;
}>(preferences: T[], item: IdentifiedKnowledge) {
    return preferences.find(pref => pref.knowledgeKey === knowledgeKey(item)) || preferences.find(pref => pref.knowledgeKey === item.title);
}
