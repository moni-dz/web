<script lang="ts">
    import PostTags from '$lib/components/PostTags.svelte';
    import { formatPostDate, resolveAccentHue } from '$lib/markdown';
    import type { PageData } from './$types';
    let { data }: { data: PageData } = $props();
</script>

<svelte:head>
    <title>lyt</title>
    <meta name="description" content="short posts about software, projects, and other interests." />
</svelte:head>

<div id="blog-index">
    <h2 class="blog-intro">short posts about software, projects, and other interests.</h2>
    {#if data.posts.length === 0}
        <p id="blog-status" role="status">no posts yet.</p>
    {:else}
        <ol id="blog-post-list" class="blog-post-list">
            {#each data.posts as post (post.slug)}
                <li>
                    <a class="blog-post-link" href={`/blog/${post.slug}`} style="--accent-hue: {resolveAccentHue(post.accent, post.title)}">
                        <div class="blog-post-link-main">
                            <strong class="blog-post-link-title">{post.title}</strong>
                            <span class="blog-post-link-summary">{post.summary}</span>
                        </div>
                        <div class="blog-post-link-aside">
                            <PostTags tags={post.tags} />
                            <span class="blog-post-link-meta">{formatPostDate(post.date)}</span>
                        </div>
                    </a>
                </li>
            {/each}
        </ol>
    {/if}
</div>

<style>
    #blog-index {
        width: min(100%, 56rem);
        margin: 0 auto;
    }

    #blog-index h2 {
        font-family: 'Fraunces', 'Crimson Pro', Georgia, serif;
    }

    .blog-intro,
    #blog-status {
        display: block;
        margin-top: 0.75rem;
    }

    .blog-intro {
        text-align: center;
    }

    .blog-post-list {
        display: flex;
        flex-direction: column;
        gap: 0.9rem;
        margin: 1.5rem 0 0;
        padding: 0;
        list-style: none;
    }

    .blog-post-list li {
        margin: 0;
        list-style: none;
    }

    .blog-post-link {
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(11rem, 14rem);
        grid-template-rows: auto auto;
        column-gap: clamp(1.5rem, 4vw, 3rem);
        row-gap: 0.5rem;
        align-items: start;
        width: 100%;
        padding: 0.9rem;
        text-align: left;
        border: 0.0625rem solid var(--border-color);
        background-color: transparent;
        color: var(--text-color);
        font: inherit;
        transition: border-color 0.2s ease, box-shadow 0.2s ease;
    }

    .blog-post-link-main,
    .blog-post-link-aside {
        display: grid;
        grid-row: 1 / 3;
        grid-template-rows: subgrid;
        align-items: center;
    }

    .blog-post-link-main {
        grid-column: 1;
    }

    .blog-post-link-aside {
        grid-column: 2;
    }

    .blog-post-link:hover,
    .blog-post-link:focus-visible {
        border-color: var(--text-color);
        background-color: transparent;
        color: var(--text-color);
        box-shadow: 0.25rem 0.25rem 0 var(--shadow-color);
    }

    .blog-post-link-title {
        color: var(--post-accent);
    }

    .blog-post-link-summary {
        display: -webkit-box;
        -webkit-box-orient: vertical;
        -webkit-line-clamp: 1;
        line-clamp: 1;
        overflow: hidden;
        color: var(--post-accent-subtle);
    }

    .blog-post-link-meta {
        display: flex;
        justify-content: flex-end;
        color: light-dark(oklch(50% 0 0), oklch(65% 0 0));
        font-size: 1.1rem;
        font-weight: 500;
    }

    @media (max-width: 48rem) {
        .blog-post-link,
        .blog-post-link-main {
            display: block;
        }

        .blog-post-link-aside {
            display: flex;
            flex-direction: row;
            flex-wrap: wrap;
            align-items: center;
            justify-content: space-between;
            margin-top: 1rem;
        }
    }
</style>
