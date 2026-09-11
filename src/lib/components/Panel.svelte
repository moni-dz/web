<script lang="ts">
    import type { Snippet } from 'svelte';

    let { id, title, tabs, children }: { id: string; title: string; tabs?: Snippet; children: Snippet } = $props();
</script>

<article class="panel" {id} aria-labelledby="{id}-title">
    <div class="terminal-window">
        <header class="terminal-header">
            <h2 id="{id}-title">
                <button type="button" class="panel-toggle" aria-expanded="false" aria-controls="{id}-content">
                    {title}
                </button>
            </h2>
            {@render tabs?.()}
        </header>
        <section class="terminal-content" id="{id}-content">
            {@render children()}
        </section>
    </div>
</article>
