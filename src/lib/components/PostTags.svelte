<script lang="ts">
    import { getTagColor } from '$lib/markdown';

    let { tags }: { tags: string[] } = $props();
</script>

{#if tags.length > 0}
    <div class="flex w-fit flex-wrap justify-end justify-self-end gap-[0.35rem]" aria-label="Post tags">
        {#each tags as tag (tag)}
            <span
                class="blog-tag border-[0.09375rem] border-solid border-tag px-[0.4rem] py-[0.1rem] font-mono text-[0.7rem] font-semibold leading-[1.4] text-tag"
                style:--tag-color={getTagColor(tag)}>{tag}</span
            >
        {/each}
    </div>
{/if}
