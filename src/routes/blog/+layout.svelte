<script lang="ts">
    import '$lib/styles/blog.css';
    import '@fontsource/ibm-plex-mono/latin-600.css';
    import '@fontsource/crimson-pro/latin-400.css';
    import '@fontsource/crimson-pro/latin-400-italic.css';
    import '@fontsource/crimson-pro/latin-600.css';
    import '@fontsource/crimson-pro/latin-700.css';

    let { children } = $props();
</script>

<main class="blog-page-main">
    <article class="blog-page-window" aria-labelledby="blog-page-title">
        <header class="blog-page-header"><h1 id="blog-page-title">blog.md</h1></header>
        <section class="blog-page-content">
            {@render children()}
        </section>
    </article>
</main>
