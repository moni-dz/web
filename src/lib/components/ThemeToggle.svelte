<script lang="ts">
    import { onMount } from 'svelte';
    import { initThemeToggle } from '$lib/theme';

    let toggle: HTMLButtonElement;
    onMount(() => initThemeToggle(toggle));
</script>

<button bind:this={toggle} id="toggle-theme" type="button" aria-label="Toggle color theme" aria-pressed="false">
    <span class="theme-label" aria-hidden="true">◐</span>
</button>

<style>
    button {
        background: none;
        border: none;
        color: var(--bg-color);
        font-size: 1.1rem;
        line-height: 1;
        cursor: pointer;
        padding: 0.5rem;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background-color 0.3s;
    }

    button:hover {
        background-color: var(--bg-color);
        color: var(--text-color);
        opacity: 0.9;
    }

    @media (max-width: 31.25rem) {
        button {
            min-width: 2.75rem;
            min-height: 2.75rem;
            flex-shrink: 0;
        }
    }
</style>
