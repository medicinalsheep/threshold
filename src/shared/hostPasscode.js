/** Optional host session passcode — plain compare, lobby-only gate. */

export function normalizePasscode(raw) {
    return String(raw ?? '').trim();
}

export function passcodeRequired(code) {
    return normalizePasscode(code).length > 0;
}

export function passcodeMatches(stored, attempt) {
    if (!passcodeRequired(stored)) return true;
    return normalizePasscode(stored) === normalizePasscode(attempt);
}