<script lang="ts">
    import type { Snippet } from 'svelte';
    import PostTags from '$lib/components/PostTags.svelte';
    import { formatPostDate, resolveAccent } from '$lib/markdown';
    import type { PostMetadata } from '$lib/posts';

    let {
        title,
        date,
        summary,
        tags = [],
        accent = undefined,
        headings = [],
        children,
    }: PostMetadata & { children: Snippet } = $props();
</script>

<svelte:head>
    <title>{title} // lyt</title>
    <meta name="description" content={summary} />
</svelte:head>

<article
    class="mx-auto w-[min(100%,72rem)]"
    aria-labelledby="blog-post-heading"
    style:--post-accent={resolveAccent(accent, title)}
>
    <header
        class={[
            'blog-post-header grid grid-cols-[minmax(0,1fr)_minmax(11rem,14rem)] grid-rows-[auto_auto] items-start',
            // Safari needs slightly more room above the title than Chromium and Firefox.
            'gap-x-[clamp(1.5rem,4vw,3rem)] gap-y-2 mb-8 mt-3 max-md:block',
        ]}
    >
        <div class="col-start-1 row-span-2 grid grid-rows-subgrid items-center max-md:block">
            <h1
                class="blog-post-title text-balance font-display text-[clamp(2rem,4vw,3rem)] font-semibold leading-[1.2] text-accent"
                id="blog-post-heading"
            >
                {title}
            </h1>
            <p class="text-[1.2rem] text-accent-subtle">{summary}</p>
        </div>
        <aside
            class="col-start-2 row-span-2 grid grid-rows-subgrid items-center max-md:(mt-4 flex flex-row flex-wrap items-center justify-between)"
        >
            <PostTags {tags} />
            <p class="flex flex-wrap items-center justify-end gap-2 text-[1.1rem] font-medium text-muted">
                <time datetime={date}>{formatPostDate(date)}</time>
            </p>
        </aside>
    </header>
    <div
        class={[
            'grid grid-cols-[minmax(0,1fr)_minmax(11rem,14rem)] items-start gap-[clamp(1.5rem,4vw,3rem)] [grid-template-areas:"content_toc"]',
            'max-md:(grid-cols-[minmax(0,1fr)] [grid-template-areas:"toc"_"content"])',
        ]}
    >
        {#if headings.length > 0}
            <nav
                class={[
                    'sticky top-0 z-auto block max-h-[calc(100dvh-var(--nav-height)-12rem)] overflow-y-auto [grid-area:toc]',
                    'border border-line bg-bg p-3 font-mono tracking-[-0.031rem] text-fg max-md:(relative max-h-none)',
                ]}
                aria-labelledby="blog-toc-heading"
            >
                <h2 class="mb-2 text-[0.8rem]" id="blog-toc-heading">contents</h2>
                <ol class="blog-toc-list m-0 list-none p-0">
                    {#each headings as heading (heading.id)}
                        <li class={heading.level === 2 ? 'pl-2' : 'pl-4'}>
                            <a class="block px-[0.35rem] py-1 text-[0.75rem]" href="#{heading.id}">{heading.text}</a>
                        </li>
                    {/each}
                </ol>
            </nav>
        {/if}
        <div class="markdown-body min-w-0 max-w-[70ch] [grid-area:content]">{@render children()}</div>
    </div>
</article>
