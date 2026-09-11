import type { AccentColor } from '$lib/posts';

export function formatPostDate(date: string) {
    return new Intl.DateTimeFormat('en', {
        day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
    }).format(new Date(date));
}

export function getTagColorIndex(tag: string) {
    let hash = 0;
    for (const character of tag.toLowerCase()) {
        hash = (hash * 31 + character.codePointAt(0)!) >>> 0;
    }
    return hash % 5;
}

export function getAccentHue(seed: string) {
    let hash = 0;
    for (const character of seed.toLowerCase()) {
        hash = (hash * 31 + character.codePointAt(0)!) >>> 0;
    }
    return hash % 360;
}

const ROYGBIV_HUES: Record<AccentColor, number> = {
    red: 20,
    orange: 50,
    yellow: 95,
    green: 145,
    blue: 235,
    indigo: 265,
    violet: 305,
};

export function resolveAccentHue(accent: AccentColor | undefined, fallbackSeed: string) {
    return accent ? ROYGBIV_HUES[accent] : getAccentHue(fallbackSeed);
}
