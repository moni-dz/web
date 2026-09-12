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

<style>
    nav {
        position: fixed;
        top: 0;
        width: 100%;
        background-color: var(--text-color);
        z-index: 1000;
        height: var(--nav-height);
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 2rem;
    }

    nav ul {
        display: flex;
        list-style: none;
        margin: 0;
    }

    nav ul li {
        margin: 0 0.5rem;
    }

    nav ul li a {
        display: flex;
        align-items: center;
        color: var(--bg-color);
        font-size: 1rem;
        padding: 0.25rem 0.75rem;
    }

    nav ul li a:hover,
    nav ul li a:global(.active-link),
    nav ul li a[aria-current="page"] {
        background-color: var(--bg-color);
        color: var(--text-color);
    }

    nav ul li a:hover {
        opacity: 0.9;
    }

    nav ul li a:global(.active-link):hover {
        opacity: 0.8;
    }

    @media (max-width: 31.25rem) {
        nav.blog-page-nav {
            height: var(--nav-height);
            flex-direction: row;
            padding: 0.5rem 1rem;
        }

        nav.blog-page-nav ul {
            padding: 0;
        }

        nav.blog-page-nav ul li {
            margin: 0;
        }

        nav {
            padding: 0 0.5rem;
            gap: 0.75rem;
        }

        nav ul li:has(a[data-panel]) {
            display: none;
        }

        nav ul {
            flex: 1 1 auto;
            min-width: 0;
            flex-wrap: nowrap;
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
            justify-content: flex-start;
        }

        nav ul li {
            margin: 0.25rem;
            flex: 0 0 auto;
        }

        nav ul li a {
            padding: 0.5rem;
            min-height: 2.75rem;
        }
    }
</style>
