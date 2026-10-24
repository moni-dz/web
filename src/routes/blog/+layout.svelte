<script lang="ts">
    import '$lib/styles/blog.css';
    import '@fontsource/ibm-plex-mono/latin-600.css';
    import '@fontsource/crimson-pro/latin-400.css';
    import '@fontsource/crimson-pro/latin-400-italic.css';
    import '@fontsource/crimson-pro/latin-500.css';
    import '@fontsource/crimson-pro/latin-600.css';
    import '@fontsource/crimson-pro/latin-700.css';
    import '@fontsource/fraunces/latin-600.css';
    import { page } from '$app/state';
    import { afterNavigate } from '$app/navigation';

    let { children } = $props();
    const isPost = $derived(page.url.pathname !== '/blog');

    // Safari restores scroll position across reloads and history navigation (unlike
    // Chrome/Firefox, which reset non-document scroll containers to 0). Force it back to the top
    // so the post always opens title-first regardless of engine. On desktop the article scrolls
    // internally; on mobile the page itself scrolls, so both are reset.
    let content: HTMLElement;
    afterNavigate(() => {
        content?.scrollTo(0, 0);
        window.scrollTo(0, 0);
    });
</script>

<main
    class={[
        'blog-page-main relative mt-[var(--nav-height)] h-[calc(100dvh-var(--nav-height))] w-full p-[clamp(1rem,2vw,1.5rem)]',
        'max-sm:(z-0 h-auto min-h-[calc(100dvh-var(--nav-height))] px-5 pb-5 pt-3)',
        "before:(content-[''] pointer-events-none absolute inset-0 z-0 bg-bg opacity-80 backdrop-blur-[0.3125rem])",
    ]}
>
    <article
        class={[
            'relative z-1 flex h-full min-h-0 w-full flex-col overflow-hidden border-2 border-fg bg-overlay',
            'shadow-[0.5rem_0.5rem_0_var(--shadow-color)] backdrop-blur-[0.25rem]',
            'max-sm:(h-auto overflow-visible border-0 bg-transparent shadow-none backdrop-blur-0)',
        ]}
        aria-labelledby="blog-page-title"
    >
        <header
            class="flex flex-none items-center justify-between bg-fg px-[0.8rem] py-2 text-bg max-sm:(border-b-2 border-line bg-transparent px-0 pb-3 pt-0 text-fg)"
        >
            <span class="text-[0.9rem] font-bold tracking-[-0.04rem]" id="blog-page-title">blog.md</span>
            {#if isPost}
                <a
                    class="px-2 py-1 font-mono text-[0.8rem] text-bg hover:underline max-sm:(text-fg hover:text-fg)"
                    href="/blog">&larr; all posts</a
                >
            {/if}
        </header>
        <section
            class={[
                'blog-page-content block min-h-0 flex-auto overflow-y-auto overscroll-contain whitespace-normal',
                'p-[clamp(1.25rem,4vw,3rem)] font-serif text-[clamp(1.0625rem,0.3vw_+_1rem,1.2rem)] leading-[1.65] tracking-normal',
                '[scrollbar-color:var(--text-color)_transparent] [scrollbar-width:thin]',
                'max-sm:(overflow-y-visible overscroll-auto p-0)',
            ]}
            bind:this={content}
        >
            {@render children()}
        </section>
    </article>
</main>
