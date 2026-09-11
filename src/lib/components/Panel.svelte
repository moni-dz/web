<script lang="ts">
    import type { Snippet } from 'svelte';

    let { id, title, tabs, children }: { id: string; title: string; tabs?: Snippet; children: Snippet } = $props();
</script>

<article class="panel" {id} aria-labelledby="{id}-title">
    <div class="terminal-window">
        <header class="terminal-header">
            <h2 id="{id}-title">{title}</h2>
            {@render tabs?.()}
        </header>
        <section class="terminal-content">
            {@render children()}
        </section>
    </div>
</article>
