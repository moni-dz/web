import { error } from '@sveltejs/kit';
import { posts } from '$lib/posts';
import type { EntryGenerator, PageLoad } from './$types';

export const prerender = true;
export const entries: EntryGenerator = () => posts.map(({ slug }) => ({ slug }));

export const load: PageLoad = async ({ params }) => {
    if (!posts.some(({ slug }) => slug === params.slug)) error(404, 'Post not found');
    const post = await import(`../../../posts/${params.slug}.md`);
    return { component: post.default };
};
