import type { AccentColor } from '$lib/posts';

export function formatPostDate(date: string) {
    return new Intl.DateTimeFormat('en', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC',
    }).format(new Date(date));
}

function hashString(value: string) {
    let hash = 0;
    for (const character of value.toLowerCase()) {
        hash = (hash * 31 + character.codePointAt(0)!) >>> 0;
    }
    return hash;
}

/** Only palette colors that keep 4.5:1 at tag size in both themes. */
const TAG_COLORS = ['red', 'green', 'blue', 'purple'];

export const TAG_COLOR_COUNT = TAG_COLORS.length;

export function getTagColorIndex(tag: string) {
    return hashString(tag) % TAG_COLOR_COUNT;
}

/** Returns a stable palette color for a tag, as a CSS value. */
export function getTagColor(tag: string) {
    return `var(--mell-${TAG_COLORS[getTagColorIndex(tag)]})`;
}

/** mellifluous has no indigo or violet, so those fall back to its nearest hues. */
const ACCENT_PALETTE: Record<AccentColor, string> = {
    red: 'red',
    orange: 'orange',
    yellow: 'yellow',
    green: 'green',
    blue: 'blue',
    indigo: 'blue',
    violet: 'purple',
};

const FALLBACK_ACCENTS = ['red', 'orange', 'yellow', 'green', 'blue', 'purple'];

/** Returns a CSS color for the post accent, picking a stable palette color when none is set. */
export function resolveAccent(accent: AccentColor | undefined, fallbackSeed: string) {
    const name = accent ? ACCENT_PALETTE[accent] : FALLBACK_ACCENTS[hashString(fallbackSeed) % FALLBACK_ACCENTS.length];
    return `var(--mell-${name})`;
}
