<script lang="ts">
    import { onMount } from 'svelte';
    import { initThemeToggle } from '$lib/theme';

    let toggle: HTMLButtonElement;
    onMount(() => initThemeToggle(toggle));
</script>

<button bind:this={toggle} id="toggle-theme" type="button" aria-label="Toggle color theme" aria-pressed="false">
    <span class="theme-label" aria-hidden="true">◐</span>
</button>
