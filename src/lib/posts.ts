export type AccentColor = 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'indigo' | 'violet';

export interface PostMetadata {
    title: string;
    date: string;
    summary: string;
    tags: string[];
    accent?: AccentColor;
}

export const posts = Object.entries(import.meta.glob<PostMetadata>('/src/posts/*.md', {
    eager: true,
    import: 'metadata',
})).map(([path, metadata]) => ({
    ...metadata,
    slug: path.slice('/src/posts/'.length, -3),
})).sort((a, b) => b.date.localeCompare(a.date));

