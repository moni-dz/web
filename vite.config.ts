import adapter from '@sveltejs/adapter-cloudflare';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { mdsvex, escapeSvelte } from 'mdsvex';
import rehypeSlug from 'rehype-slug';
import { codeToHtml } from 'shiki';
import { resolve } from 'node:path';

export default defineConfig({
    plugins: [sveltekit({
        adapter: adapter(),
        extensions: ['.svelte', '.md'],
        preprocess: mdsvex({
            extensions: ['.md'],
            layout: resolve('src/lib/markdown/PostLayout.svelte'),
            rehypePlugins: [rehypeSlug],
            highlight: {
                highlighter: async (code, lang = 'text') => {
                    const html = await codeToHtml(code, {
                        lang: lang || 'text',
                        themes: { light: 'github-light', dark: 'github-dark' },
                    });
                    return `{@html \`${escapeSvelte(html)}\`}`;
                },
            },
        }),
    })],
});
