<script lang="ts">
    import { onMount } from 'svelte';
    import { THEME_COLORS, THEME_STORAGE_KEY, type ColorScheme } from '$lib/theme';

    let scheme = $state<ColorScheme>('light');

    function applyScheme() {
        document.documentElement.style.colorScheme = scheme;
        document.documentElement.dataset.theme = scheme;
        document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')!.content = THEME_COLORS[scheme];
    }

    onMount(() => {
        scheme = document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
        // Hydrating <svelte:head> restores the server-rendered theme-color, so reapply it.
        applyScheme();
    });

    function toggleTheme() {
        scheme = scheme === 'dark' ? 'light' : 'dark';
        applyScheme();
        try {
            localStorage.setItem(THEME_STORAGE_KEY, scheme);
        } catch (error) {
            console.warn('Theme preference could not be saved.', error);
        }
    }
</script>

<button
    id="toggle-theme"
    class="flex items-center justify-center p-2 text-[1.1rem] leading-none text-bg bg-transparent border-none cursor-pointer transition-colors duration-300 hover:(bg-bg text-fg opacity-90) max-sm:(min-h-11 min-w-11 shrink-0)"
    type="button"
    aria-label="Dark theme"
    aria-pressed={scheme === 'dark'}
    onclick={toggleTheme}
>
    <span class="theme-label" aria-hidden="true">◐</span>
</button>
