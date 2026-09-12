<script lang="ts">
    import { onMount } from 'svelte';

    type ColorScheme = 'dark' | 'light';
    const storageKey = 'portfolio-color-scheme';
    let scheme = $state<ColorScheme>('light');

    onMount(() => {
        scheme = document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
    });

    function toggleTheme() {
        scheme = scheme === 'dark' ? 'light' : 'dark';
        document.documentElement.style.colorScheme = scheme;
        document.documentElement.dataset.theme = scheme;
        document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')!.content =
            scheme === 'dark' ? '#232323' : '#eeeeee';
        try {
            localStorage.setItem(storageKey, scheme);
        } catch (error) {
            console.warn('Theme preference could not be saved.', error);
        }
    }
</script>

<button
    id="toggle-theme"
    type="button"
    aria-label={`Switch to ${scheme === 'dark' ? 'light' : 'dark'} theme`}
    aria-pressed={scheme === 'dark'}
    onclick={toggleTheme}
>
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
