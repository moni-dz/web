<script lang="ts">
    import { formatPostDate } from '$lib/markdown';
    import type { PageData } from './$types';
    let { data }: { data: PageData } = $props();
</script>

<svelte:head>
    <title>blog // lyt</title>
    <meta name="description" content="Notes about software, projects, and learning from Lythe Marvin Lacre." />
</svelte:head>

<div id="blog-index">
    <h2>notes from the terminal</h2>
    <p class="blog-intro">short posts about software, projects, and things I learn along the way.</p>
    {#if data.posts.length === 0}
        <p id="blog-status" role="status">no posts yet.</p>
    {:else}
        <ol id="blog-post-list" class="blog-post-list">
            {#each data.posts as post (post.slug)}
                <li>
                    <a class="blog-post-link" href={`/blog/${post.slug}`}>
                        <strong class="blog-post-link-title">{post.title}</strong>
                        <span class="blog-post-link-summary">{post.summary}</span>
                        <span class="blog-post-link-meta">{formatPostDate(post.date)}{post.tags.length ? ` / ${post.tags.join(', ')}` : ''}</span>
                    </a>
                </li>
            {/each}
        </ol>
    {/if}
</div>
