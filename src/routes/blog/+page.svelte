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
