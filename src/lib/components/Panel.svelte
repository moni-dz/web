<script lang="ts">
    import type { Snippet } from 'svelte';
    import type { HTMLAttributes } from 'svelte/elements';
    import { getPanelState } from '$lib/panels.svelte';

    let {
        id,
        title,
        tabs,
        children,
        class: className,
        ...rest
    }: {
        id: string;
        title: string;
        tabs?: Snippet;
        children: Snippet;
    } & HTMLAttributes<HTMLElement> = $props();

    const panels = getPanelState();
</script>

<article {...rest} class={['panel', { active: panels.active === id }, className]} {id} aria-labelledby="{id}-title">
    <div class="terminal-window">
        <header class="terminal-header">
            <h2 id="{id}-title" class="text-[90%] tracking-[-0.04rem] max-sm:text-[120%]">
                <button
                    type="button"
                    class="panel-toggle p-0 border-none bg-transparent text-inherit text-left cursor-inherit"
                    onclick={() => panels.focus(id)}
                >
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
