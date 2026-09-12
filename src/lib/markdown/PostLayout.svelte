<script lang="ts">
    import { onMount, type Snippet } from 'svelte';
    import PostTags from '$lib/components/PostTags.svelte';
    import { formatPostDate, resolveAccentHue } from '$lib/markdown';
    import type { PostMetadata } from '$lib/posts';

    let {
        title,
        date,
        summary,
        tags = [],
        accent = undefined,
        children,
    }: PostMetadata & { children: Snippet } = $props();

    let body: HTMLDivElement;
    let toc: HTMLElement;
    let list: HTMLOListElement;

    onMount(() => {
        const headings = body.querySelectorAll('h2, h3, h4, h5, h6');
        for (const heading of headings) {
            const item = document.createElement('li');
            const link = document.createElement('a');
            item.className = `blog-toc-level-${heading.tagName.slice(1)}`;
            link.href = `#${heading.id}`;
            link.textContent = heading.textContent;
            item.appendChild(link);
            list.appendChild(item);
        }
        toc.hidden = headings.length === 0;
        return () => list.replaceChildren();
    });
</script>

<svelte:head>
    <title>{title} // lyt</title>
    <meta name="description" content={summary} />
</svelte:head>

<article class="blog-post" aria-labelledby="blog-post-heading" style="--accent-hue: {resolveAccentHue(accent, title)}">
    <header class="blog-post-header">
        <div class="blog-post-header-main">
            <h2 class="blog-post-title" id="blog-post-heading">{title}</h2>
            <p class="blog-post-summary">{summary}</p>
        </div>
        <aside class="blog-post-header-aside">
            <PostTags {tags} />
            <p class="blog-post-meta"><time class="blog-post-date" datetime={date}>{formatPostDate(date)}</time></p>
        </aside>
    </header>
    <div class="blog-reading-layout">
        <nav bind:this={toc} class="blog-toc" aria-labelledby="blog-toc-heading" hidden>
            <h3 id="blog-toc-heading">contents</h3>
            <ol bind:this={list} class="blog-toc-list"></ol>
        </nav>
        <div bind:this={body} class="markdown-body">{@render children()}</div>
    </div>
</article>

<style>
    .blog-post {
        width: min(100%, 72rem);
        margin: 0 auto;
    }

    .blog-post-meta {
        color: light-dark(oklch(50% 0 0), oklch(65% 0 0));
        font-size: 1.1rem;
        font-weight: 500;
        justify-content: flex-end;
    }

    .blog-post-header {
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(11rem, 14rem);
        grid-template-rows: auto auto;
        column-gap: clamp(1.5rem, 4vw, 3rem);
        row-gap: 0.5rem;
        align-items: start;
        /* Safari needs slightly more room above the title than Chromium and Firefox. */
        margin-top: 0.75rem;
        margin-bottom: 2rem;
    }

    .blog-post-header-main,
    .blog-post-header-aside {
        display: grid;
        grid-row: 1 / 3;
        grid-template-rows: subgrid;
        align-items: center;
    }

    .blog-post-header-main {
        grid-column: 1;
    }

    .blog-post-header-aside {
        grid-column: 2;
    }

    .blog-post-title,
    .blog-post-summary {
        display: block;
    }

    .blog-post-meta {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 0.5rem;
    }

    .blog-post-title {
        font-family: 'Fraunces', 'Crimson Pro', Georgia, serif;
        font-size: clamp(2rem, 4vw, 3rem);
        font-weight: 600;
        line-height: 1.2;
        color: var(--post-accent);
        /* Balance makes line breaks consistent across rendering engines. */
        text-wrap: balance;
    }

    .blog-post-summary {
        font-size: 1.2rem;
        color: var(--post-accent-subtle);
    }

    @media (max-width: 48rem) {
        .blog-post-header,
        .blog-post-header-main {
            display: block;
        }

        .blog-post-header-aside {
            display: flex;
            flex-direction: row;
            flex-wrap: wrap;
            align-items: center;
            justify-content: space-between;
            margin-top: 1rem;
        }
    }
</style>
