<script lang="ts">
    import { getTagColorIndex } from '$lib/markdown';

    let { tags }: { tags: string[] } = $props();
</script>

<div class="blog-post-tags" aria-label="Post tags">
    {#each tags as tag (tag)}
        <span class={`blog-tag blog-tag-color-${getTagColorIndex(tag)}`}>{tag}</span>
    {/each}
</div>

<style>
    .blog-post-tags {
        display: flex;
        width: fit-content;
        flex-wrap: wrap;
        justify-content: flex-end;
        justify-self: end;
        gap: 0.35rem;
    }

    .blog-post-tags:empty {
        display: none;
    }

    .blog-tag {
        border: 0.09375rem solid var(--tag-color, var(--abbr-color));
        background-color: transparent;
        color: var(--tag-color, var(--abbr-color));
        padding: 0.1rem 0.4rem;
        font-size: 0.7rem;
        font-weight: 600;
        line-height: 1.4;
    }

    .blog-tag-color-0 {
        --tag-color: light-dark(oklch(48% 0.18 30), oklch(75% 0.15 30));
    }

    .blog-tag-color-1 {
        --tag-color: light-dark(oklch(48% 0.12 85), oklch(82% 0.14 90));
    }

    .blog-tag-color-2 {
        --tag-color: light-dark(oklch(43% 0.13 150), oklch(76% 0.13 150));
    }

    .blog-tag-color-3 {
        --tag-color: light-dark(oklch(45% 0.14 240), oklch(75% 0.13 240));
    }

    .blog-tag-color-4 {
        --tag-color: light-dark(oklch(48% 0.16 310), oklch(78% 0.13 310));
    }
</style>
