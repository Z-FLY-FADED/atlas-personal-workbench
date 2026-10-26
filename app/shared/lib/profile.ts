export function getAvatarInitial(displayName: string) {
    const firstCharacter = String(displayName || "")
        .trim()
        .match(/[\p{Script=Han}\p{L}\p{N}]/u)?.[0] || "个";
    return /[a-z]/i.test(firstCharacter)
        ? firstCharacter.toUpperCase()
        : firstCharacter;
}
