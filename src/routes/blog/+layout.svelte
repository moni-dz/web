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

    // Safari restores this element's scrollTop across reloads and history navigation (unlike
    // Chrome/Firefox, which reset non-document scroll containers to 0). Force it back to the top
    // so the post always opens title-first regardless of engine.
    let content: HTMLElement;
    afterNavigate(() => content?.scrollTo(0, 0));
</script>

<main class="blog-page-main">
    <article class="blog-page-window" aria-labelledby="blog-page-title">
        <header class="blog-page-header">
            <h1 id="blog-page-title">blog.md</h1>
            {#if isPost}
                <a class="blog-page-header-button" href="/blog">&larr; all posts</a>
            {/if}
        </header>
        <section class="blog-page-content" bind:this={content}>
            {@render children()}
        </section>
    </article>
</main>
