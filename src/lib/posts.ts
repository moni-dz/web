export interface PostMetadata {
    title: string;
    date: string;
    summary: string;
    tags: string[];
}

export const posts = Object.entries(import.meta.glob<PostMetadata>('/src/posts/*.md', {
    eager: true,
    import: 'metadata',
})).map(([path, metadata]) => ({
    ...metadata,
    slug: path.slice('/src/posts/'.length, -3),
})).sort((a, b) => b.date.localeCompare(a.date));

