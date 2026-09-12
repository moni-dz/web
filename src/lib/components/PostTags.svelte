<script lang="ts">
    import { getTagColorIndex } from '$lib/markdown';

    let { tags }: { tags: string[] } = $props();
</script>

<div class="blog-post-tags" aria-label="Post tags">
    {#each tags as tag (tag)}
        <span class={`blog-tag blog-tag-color-${getTagColorIndex(tag)}`}>{tag}</span>
    {/each}
</div>
