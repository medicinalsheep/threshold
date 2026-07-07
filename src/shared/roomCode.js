/** Host room codes — name-tagged + player key + extra entropy to avoid PeerJS ID collisions. */

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function randomSegment(len) {
    let out = '';
    const bytes = new Uint8Array(len);
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
        crypto.getRandomValues(bytes);
        for (let i = 0; i < len; i++) out += CHARS[bytes[i] % CHARS.length];
    } else {
        for (let i = 0; i < len; i++) out += CHARS[Math.floor(Math.random() * CHARS.length)];
    }
    return out;
}

function slugFromName(name = '', maxLen = 4) {
    const cleaned = String(name || '')
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '');
    if (cleaned.length >= 2) return cleaned.slice(0, maxLen).padEnd(2, 'X');
    return 'PLYR'.slice(0, maxLen);
}

/** Legacy 6-char player identity (session tab scope). */
export function generatePlayerKey(len = 6) {
    return randomSegment(len);
}

/**
 * Host PeerJS room ID: NAME4-PLAYERKEY-RAND4 (e.g. BOB3-K7M2NP-QR8W).
 * Embeds display name + stable player key + fresh entropy per session.
 */
export function generateHostRoomId(playerName, playerKey) {
    const slug = slugFromName(playerName, 4);
    const key = String(playerKey || generatePlayerKey()).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6) || generatePlayerKey();
    const extra = randomSegment(4);
    return `${slug}-${key}-${extra}`;
}

export function normalizeRoomCode(code) {
    return String(code || '').trim().toUpperCase().replace(/\s+/g, '');
}

export function parseRoomCode(code) {
    const norm = normalizeRoomCode(code);
    const parts = norm.split('-').filter(Boolean);
    return {
        raw: norm,
        slug: parts[0] || '',
        playerKey: parts[1] || (parts.length === 1 ? parts[0] : ''),
        entropy: parts[2] || '',
        legacy: !norm.includes('-') && norm.length <= 8,
    };
}

window.RoomCode = { generatePlayerKey, generateHostRoomId, normalizeRoomCode, parseRoomCode };