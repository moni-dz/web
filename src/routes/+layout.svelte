<script lang="ts">
    import '../app.css';
    import '@fontsource/ibm-plex-mono/latin-400.css';
    import '@fontsource/ibm-plex-mono/latin-400-italic.css';
    import '@fontsource/ibm-plex-mono/latin-700.css';
    import { page } from '$app/state';
    import ThemeToggle from '$lib/components/ThemeToggle.svelte';

    let { children } = $props();
    const isBlog = $derived(page.url.pathname === '/blog' || page.url.pathname.startsWith('/blog/'));
</script>

<svelte:head>
    <link rel="alternate" type="application/rss+xml" title="lyt's blog" href="/blog/rss.xml" />
</svelte:head>

<nav class:blog-page-nav={isBlog} aria-label={isBlog ? 'Blog navigation' : 'Primary navigation'}>
    {#if isBlog}
        <ul><li><a href="/">&larr; portfolio</a></li></ul>
    {:else}
        <ul>
            <li><a href="#welcome" data-panel="welcome" aria-current="page">home</a></li>
            <li><a href="#about" data-panel="about">about</a></li>
            <li><a href="#projects" data-panel="projects">projects</a></li>
            <li><a href="#skills" data-panel="skills">skills</a></li>
            <li><a href="#refs" data-panel="refs">refs</a></li>
            <li><a href="/blog">blog</a></li>
        </ul>
    {/if}
    <ThemeToggle />
</nav>

{@render children()}
