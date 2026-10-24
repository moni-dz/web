import adapter from '@sveltejs/adapter-cloudflare';
import { sveltekit } from '@sveltejs/kit/vite';
import UnoCSS from 'unocss/vite';
import { defineConfig } from 'vite';
import { mdsvex, escapeSvelte } from 'mdsvex';
import rehypeSlug from 'rehype-slug';
import { rehypeHeadings } from './src/lib/rehype-headings.ts';
import { codeToHtml, isSupportedLanguage } from '@pierre/highlights';
import { mellifluous } from './src/lib/mellifluous.ts';
import { resolve } from 'node:path';

export default defineConfig({
    // UnoCSS must run before the Svelte plugin so it sees the original markup.
    plugins: [
        UnoCSS(),
        sveltekit({
            adapter: adapter(),
            extensions: ['.svelte', '.md'],
            preprocess: mdsvex({
                extensions: ['.md'],
                layout: resolve('src/lib/markdown/PostLayout.svelte'),
                rehypePlugins: [rehypeSlug, rehypeHeadings],
                highlight: {
                    highlighter: (code, lang) => {
                        const html = new TextDecoder().decode(
                            codeToHtml(code, {
                                lang: lang && isSupportedLanguage(lang) ? lang : 'text',
                                theme: mellifluous,
                            }),
                        );
                        return `{@html \`${escapeSvelte(html)}\`}`;
                    },
                },
            }),
        }),
    ],
});
