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
