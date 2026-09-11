<script lang="ts">
    import { onMount } from 'svelte';
    import { formatPostDate, getTagColorIndex } from '$lib/markdown';
    import type { PostMetadata } from '$lib/posts';

    export let title: PostMetadata['title'];
    export let date: PostMetadata['date'];
    export let summary: PostMetadata['summary'];
    export let tags: PostMetadata['tags'] = [];
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

<article class="blog-post" aria-labelledby="blog-post-heading">
    <a class="blog-back-button" href="/blog">&larr; all posts</a>
    <header class="blog-post-header">
        <p class="blog-post-meta"><time class="blog-post-date" datetime={date}>{formatPostDate(date)}</time></p>
        <h2 class="blog-post-title" id="blog-post-heading">{title}</h2>
        <p class="blog-post-summary">{summary}</p>
        <div class="blog-post-tags" aria-label="Post tags">
            {#each tags as tag}
                <span class={`blog-tag blog-tag-color-${getTagColorIndex(tag)}`}>{tag}</span>
            {/each}
        </div>
    </header>
    <div class="blog-reading-layout">
        <nav bind:this={toc} class="blog-toc" aria-labelledby="blog-toc-heading" hidden>
            <h3 id="blog-toc-heading">contents</h3>
            <ol bind:this={list} class="blog-toc-list"></ol>
        </nav>
        <div bind:this={body} class="markdown-body"><slot /></div>
    </div>
</article>
