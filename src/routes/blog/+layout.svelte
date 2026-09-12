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

<style>
    :global(body:has(.blog-page-main)) {
        position: relative;
        height: 100dvh;
        overflow: hidden;
    }

    .blog-page-main {
        position: relative;
        width: 100%;
        height: calc(100dvh - var(--nav-height));
        margin-top: var(--nav-height);
        padding: clamp(1rem, 2vw, 1.5rem);
    }

    .blog-page-main::before {
        content: '';
        position: absolute;
        inset: 0;
        background-color: var(--bg-color);
        opacity: calc(1 - var(--bg-opacity));
        backdrop-filter: blur(0.3125rem);
        -webkit-backdrop-filter: blur(0.3125rem);
        pointer-events: none;
        z-index: 0;
    }

    .blog-page-window {
        position: relative;
        z-index: 1;
        display: flex;
        width: 100%;
        height: 100%;
        min-height: 0;
        flex-direction: column;
        border: 0.125rem solid var(--text-color);
        background-color: var(--overlay-color);
        box-shadow: 0.5rem 0.5rem 0 var(--shadow-color);
        overflow: hidden;
        backdrop-filter: blur(0.25rem);
        -webkit-backdrop-filter: blur(0.25rem);
    }

    .blog-page-header {
        display: flex;
        flex: 0 0 auto;
        justify-content: space-between;
        align-items: center;
        background-color: var(--text-color);
        color: var(--bg-color);
        padding: 0.5rem 0.8rem;
    }

    .blog-page-header h1 {
        font-size: 0.9rem;
        letter-spacing: -0.04rem;
    }

    .blog-page-header-button {
        background: none;
        border: none;
        padding: 0.25rem 0.5rem;
        color: var(--bg-color);
        font-size: 0.8rem;
        cursor: pointer;
    }

    .blog-page-header-button:hover {
        text-decoration: underline;
    }

    .blog-page-content {
        display: block;
        flex: 1 1 auto;
        min-height: 0;
        padding: clamp(1.25rem, 4vw, 3rem);
        font-family: 'Crimson Pro', Georgia, serif;
        font-size: clamp(1.0625rem, 0.3vw + 1rem, 1.2rem);
        letter-spacing: 0;
        line-height: 1.65;
        white-space: normal;
        overflow-y: auto;
        overscroll-behavior: contain;
        scrollbar-color: var(--text-color) transparent;
        scrollbar-width: thin;
    }

    @media (max-width: 31.25rem) {
        :global(:root:has(.blog-page-main)) {
            --nav-height: 3.5rem;
        }

        :global(body:has(.blog-page-main)) {
            height: auto;
            overflow-y: auto;
        }

        .blog-page-main {
            height: auto;
            min-height: calc(100vh - var(--nav-height));
            min-height: calc(100dvh - var(--nav-height));
            padding: 0.75rem 1.25rem 1.25rem;
            z-index: 0;
        }

        .blog-page-window {
            height: auto;
            border: none;
            box-shadow: none;
            background: none;
            overflow: visible;
            backdrop-filter: none;
            -webkit-backdrop-filter: none;
        }

        .blog-page-header {
            background: none;
            color: var(--text-color);
            padding: 0 0 0.75rem;
            border-bottom: 0.125rem solid var(--border-color);
        }

        .blog-page-header-button {
            color: var(--text-color);
        }

        .blog-page-content {
            padding: 0;
            overflow-y: visible;
            overscroll-behavior: auto;
        }
    }
</style>
