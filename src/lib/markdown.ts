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
