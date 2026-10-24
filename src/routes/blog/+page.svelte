<script lang="ts">
    import PostTags from '$lib/components/PostTags.svelte';
    import { formatPostDate, resolveAccent } from '$lib/markdown';
    import type { PageData } from './$types';
    let { data }: { data: PageData } = $props();
</script>

<svelte:head>
    <title>blog // lyt</title>
    <meta name="description" content="short posts about software, projects, and other interests." />
</svelte:head>

<div id="blog-index" class="mx-auto w-[min(100%,56rem)]">
    <h1 class="mt-3 text-center font-display text-[1.5em]">
        short posts about software, projects, and other interests.
    </h1>
    {#if data.posts.length === 0}
        <p id="blog-status" class="mt-3 font-mono" role="status">no posts yet.</p>
    {:else}
        <ol id="blog-post-list" class="mt-6 flex list-none flex-col gap-[0.9rem] p-0">
            {#each data.posts as post (post.slug)}
                <li>
                    <a
                        class={[
                            'blog-post-link grid w-full grid-cols-[minmax(0,1fr)_minmax(11rem,14rem)] grid-rows-[auto_auto] items-start',
                            'gap-x-[clamp(1.5rem,4vw,3rem)] gap-y-2 border border-line p-[0.9rem] text-left text-fg',
                            'transition-[border-color,box-shadow] duration-200',
                            'hover:(border-fg bg-transparent text-fg shadow-[0.25rem_0.25rem_0_var(--shadow-color)])',
                            'focus-visible:(border-fg shadow-[0.25rem_0.25rem_0_var(--shadow-color)])',
                            'max-md:block',
                        ]}
                        href="/blog/{post.slug}"
                        style:--post-accent={resolveAccent(post.accent, post.title)}
                    >
                        <div class="col-start-1 row-span-2 grid grid-rows-subgrid items-center max-md:block">
                            <strong class="text-accent-text">{post.title}</strong>
                            <span class="line-clamp-1 text-accent-subtle">{post.summary}</span>
                        </div>
                        <div
                            class="col-start-2 row-span-2 grid grid-rows-subgrid items-center max-md:(mt-4 flex flex-row flex-wrap items-center justify-between)"
                        >
                            <PostTags tags={post.tags} />
                            <span class="flex justify-end text-[1.1rem] font-medium text-muted"
                                >{formatPostDate(post.date)}</span
                            >
                        </div>
                    </a>
                </li>
            {/each}
        </ol>
    {/if}
</div>
