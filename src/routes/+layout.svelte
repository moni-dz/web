<script lang="ts">
    import '../app.css';
    import 'virtual:uno.css';
    import '@fontsource/ibm-plex-mono/latin-400.css';
    import '@fontsource/ibm-plex-mono/latin-400-italic.css';
    import '@fontsource/ibm-plex-mono/latin-700.css';
    import { page } from '$app/state';
    import { replaceState } from '$app/navigation';
    import ThemeToggle from '$lib/components/ThemeToggle.svelte';
    import { PanelState, setPanelState } from '$lib/panels.svelte';
    import { THEME_COLORS, themeInitTag } from '$lib/theme';

    let { children } = $props();
    const isBlog = $derived(page.url.pathname === '/blog' || page.url.pathname.startsWith('/blog/'));
    const panels = setPanelState(new PanelState());

    const panelLinks = [
        { id: 'welcome', label: 'home' },
        { id: 'about', label: 'about' },
        { id: 'projects', label: 'projects' },
        { id: 'skills', label: 'skills' },
        { id: 'refs', label: 'refs' },
    ];

    const navLink = [
        'flex items-center px-3 py-1 text-base text-bg max-sm:(min-h-11 p-2)',
        'hover:(bg-bg text-fg opacity-90) aria-[current=page]:(bg-bg text-fg) aria-[current=page]:hover:opacity-80',
    ].join(' ');

    function openPanel(event: MouseEvent, id: string) {
        event.preventDefault();
        panels.focus(id);
        replaceState(`#${id}`, {});
    }
</script>

<svelte:head>
    <meta name="theme-color" content={THEME_COLORS.light} />
    {@html themeInitTag}
    <link rel="alternate" type="application/rss+xml" title="lyt's blog" href="/blog/rss.xml" />
</svelte:head>

<nav
    class={[
        'fixed top-0 z-1000 h-[var(--nav-height)] w-full flex items-center justify-between bg-fg px-8',
        isBlog ? 'max-sm:(px-4 py-2)' : 'max-sm:(gap-3 px-2)',
    ]}
    aria-label={isBlog ? 'Blog navigation' : 'Primary navigation'}
>
    <ul class="m-0 flex list-none max-sm:(min-w-0 flex-1 flex-nowrap justify-start overflow-x-auto)">
        {#if isBlog}
            <li class="mx-2 max-sm:m-0"><a class={navLink} href="/">&larr; portfolio</a></li>
        {:else}
            {#each panelLinks as link (link.id)}
                <li class="mx-2 max-sm:hidden">
                    <a
                        class={navLink}
                        href="#{link.id}"
                        data-panel={link.id}
                        aria-current={panels.active === link.id ? 'page' : undefined}
                        onclick={(event) => openPanel(event, link.id)}>{link.label}</a
                    >
                </li>
            {/each}
            <li class="mx-2 max-sm:(m-1 flex-none)"><a class={navLink} href="/blog">blog</a></li>
        {/if}
    </ul>
    <ThemeToggle />
</nav>

{@render children()}
