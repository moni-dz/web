<script lang="ts">
    import { onMount } from 'svelte';
    import { asset } from '$app/paths';
    import { initWindowManager, MOBILE_QUERY } from '$lib/window-manager';
    import { getPanelState } from '$lib/panels.svelte';
    import Panel from '$lib/components/Panel.svelte';
    import DeviceMessage from '$lib/components/DeviceMessage.svelte';
    import Reference from '$lib/components/Reference.svelte';

    const SWIPE_THRESHOLD_PX = 50;
    const aboutTabs = ['site', 'author', 'certifications'] as const;
    type AboutTab = (typeof aboutTabs)[number];

    const panels = getPanelState();
    let aboutTab = $state<AboutTab>('site');
    let tabButtons: Partial<Record<AboutTab, HTMLButtonElement>> = {};
    let swipeStartX: number | null = null;

    onMount(() => initWindowManager(panels));

    function stepAboutTab(direction: -1 | 1) {
        const index = aboutTabs.indexOf(aboutTab);
        aboutTab = aboutTabs[(index + direction + aboutTabs.length) % aboutTabs.length];
    }

    function onTabKeydown(event: KeyboardEvent) {
        if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
        event.preventDefault();
        stepAboutTab(event.key === 'ArrowLeft' ? -1 : 1);
        tabButtons[aboutTab]?.focus();
    }

    function onAboutTouchStart(event: TouchEvent) {
        swipeStartX = matchMedia(MOBILE_QUERY).matches ? event.touches[0].clientX : null;
    }

    function onAboutTouchEnd(event: TouchEvent) {
        if (swipeStartX === null) return;
        const distance = event.changedTouches[0].clientX - swipeStartX;
        swipeStartX = null;
        if (Math.abs(distance) >= SWIPE_THRESHOLD_PX) stepAboutTab(distance > 0 ? -1 : 1);
    }
</script>

<svelte:head>
    <title>lyt</title>
    <meta name="description" content="software engineer" />
</svelte:head>

<main
    class={[
        'panels-container relative z-0 mt-[var(--nav-height)] h-[calc(100dvh-var(--nav-height))] overflow-auto p-5',
        'max-sm:(h-auto min-h-[calc(100dvh-var(--nav-height))] overflow-visible p-4)',
        "before:(content-[''] pointer-events-none fixed inset-0 -z-1 bg-bg opacity-80) max-sm:before:absolute",
    ]}
    id="top"
>
    <h1 class="sr-only">lyt</h1>

    <Panel id="welcome" title="home.txt" class="top-[calc(40vh-5.688rem)] left-[25vw] !w-full max-w-150 z-5">
        <h3>welcome!</h3>
        <p>start by navigating to the other windows using the links above.</p>
        <p>
            <DeviceMessage
                panel="welcome"
                n={1}
                desktop="on desktop or tablets you may click or touch the windows to bring them into focus. you may also drag the active window around by dragging its title bar. toggle the theme by clicking the button on the top right."
                mobile="on mobile, scroll down to browse each window. toggle the theme by tapping the button at the end of the navigation links."
            />
        </p>
        <p>
            this site is best viewed in a modern up-to-date browser as it uses <code
                ><a href="https://web.dev/baseline">baseline</a> <a href="https://web.dev/baseline/2023">2023</a> and
                <a href="https://web.dev/baseline/2024">2024</a>
                features such as
                <a href="https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/oklch">oklch()</a><Reference
                    n={1}
                    kind="ref"
                /></code
            >,
            <code
                ><a href="https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/light-dark">light-dark()</a
                ></code
            >,
            <code
                ><a href="https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame"
                    >requestAnimationFrame()</a
                ></code
            >, and the <a href="https://web.dev/blog/popover-api">Popover API</a>.
        </p>
    </Panel>

    <Panel
        id="about"
        title="about.txt"
        class="top-[calc(15vh-5.688rem)] left-[1.5vw] max-w-150 z-3 [&_.terminal-content]:(min-h-80 justify-between)"
        ontouchstart={onAboutTouchStart}
        ontouchend={onAboutTouchEnd}
    >
        {#snippet tabs()}
            <div
                class="terminal-tabs -my-[0.4rem] max-sm:(my-0 flex flex-row items-center gap-2)"
                role="tablist"
                aria-label="About sections"
                tabindex="-1"
                onkeydown={onTabKeydown}
            >
                {#each aboutTabs as tab (tab)}
                    <button
                        bind:this={tabButtons[tab]}
                        class={[
                            'tab-button cursor-pointer border-none bg-transparent px-2 py-1 text-bg transition-opacity duration-300',
                            'hover:underline aria-selected:underline',
                            'max-sm:(m-0 flex min-h-11 items-center py-0 text-fg opacity-70 hover:opacity-100 aria-selected:opacity-100)',
                            { 'tab-active': aboutTab === tab },
                        ]}
                        id="about-{tab}-tab"
                        type="button"
                        role="tab"
                        aria-controls="about-{tab}"
                        aria-selected={aboutTab === tab}
                        tabindex={aboutTab === tab ? 0 : -1}
                        onclick={() => (aboutTab = tab)}>{tab}</button
                    >
                {/each}
            </div>
        {/snippet}

        <div
            class={['terminal-tab flex h-full w-full flex-col', { 'tab-active': aboutTab === 'site' }]}
            id="about-site"
            role="tabpanel"
            aria-labelledby="about-site-tab"
            hidden={aboutTab !== 'site'}
        >
            <h3>
                I created this site to look and feel like an old text-based windowing system<Reference
                    n={2}
                    kind="ref"
                />.
            </h3>
            <p>
                the experience is akin to <abbr title="Single-page applications">SPA</abbr>s commonly seen in modern web
                development with frameworks like React.
            </p>
            <p>
                while web programming is <strong>not my main focus</strong>, this site aims to showcase my progress in
                the course.
            </p>
            <p>
                <DeviceMessage
                    panel="about"
                    n={1}
                    desktop="try clicking or using the arrow keys to switch between tabs."
                    mobile="try clicking the tabs or swiping left or right on this window to switch between them."
                />
            </p>
        </div>
        <div
            class={['terminal-tab flex h-full w-full flex-col', { 'tab-active': aboutTab === 'author' }]}
            id="about-author"
            role="tabpanel"
            aria-labelledby="about-author-tab"
            hidden={aboutTab !== 'author'}
        >
            <div id="about-container" class="flex flex-1 w-full items-stretch gap-4 max-sm:flex-col">
                <aside
                    id="about-icon-container"
                    class="flex basis-[30%] shrink-0 grow-0 flex-col items-center border-r-2 border-line pr-5 max-sm:(basis-auto border-r-0 border-b-2 pr-0 pb-5)"
                >
                    <img
                        id="about-icon"
                        class="mb-2 h-auto max-w-full border border-fg grayscale transition-[filter] duration-300 hover:grayscale-0"
                        src={asset('/assets/icon.webp')}
                        alt="Portrait of Lythe Marvin Lacre"
                        width="320"
                        height="320"
                    />
                    <strong
                        ><DeviceMessage
                            panel="about"
                            n={2}
                            desktop="hover the image..."
                            mobile="touch the image..."
                        /></strong
                    >
                    <abbr title="you should hover every element like me.">also hover me...</abbr>
                </aside>
                <section id="about-text" class="flex-1 p-0 pl-2 max-sm:pl-0">
                    <h3>hi my name is: <abbr title="Lythe Marvin L. Lacre">lyt</abbr></h3>
                    <p>I am a Computer Science student at<br />Mapúa Malayan Colleges Mindanao.</p>
                    <p>
                        some important links: <a href="https://github.com/moni-dz">GitHub</a>,
                        <a href="https://www.linkedin.com/in/dxdydz/">LinkedIn</a>
                    </p>
                    <details>
                        <summary>some details about me</summary>
                        <ul>
                            <li>
                                prefers to stay out of <abbr title="there are far better people than me!">frontend</abbr
                                >
                            </li>
                            <li>
                                <strong>really</strong> likes
                                <abbr title="I enjoy performance optimizations">backend</abbr> work
                            </li>
                            <li>
                                <abbr
                                    title="concepts are easily transferable, unless they enforce certain design patterns..."
                                    >knows</abbr
                                > <abbr title="I know the &quot;ancient&quot; ones like C, Java, etc...">some</abbr>
                                <abbr title="Rust and Zig are my &quot;modern&quot; favorites">programming</abbr>
                                <abbr
                                    title="statically typed and strong type systems preferred! (Python and TypeScript are tolerated)"
                                    >languages</abbr
                                >
                            </li>
                            <li>applied &gt; theoretical (in everything!)</li>
                        </ul>
                    </details>
                </section>
            </div>
        </div>
        <div
            class={['terminal-tab flex h-full w-full flex-col', { 'tab-active': aboutTab === 'certifications' }]}
            id="about-certifications"
            role="tabpanel"
            aria-labelledby="about-certifications-tab"
            hidden={aboutTab !== 'certifications'}
        >
            <h3>certifications</h3>
            <p>
                I am an <a href="https://www.credly.com/badges/f2cdeeeb-2ce9-43a3-91c4-458687a65565/linked_in_profile"
                    ><b class="text-mell-orange">AWS</b> Certified AI Practitioner</a
                >.
            </p>
        </div>
    </Panel>

    <Panel id="projects" title="projects.txt" class="top-[calc(12vh-5.688rem)] right-[1.5vw] max-w-fit z-2">
        <ul class="projects-list">
            <li><a href="https://github.com/moni-dz/im-wp"><b>four (iv)</b> - <i>image viewer using GPUI</i></a></li>
            <li>
                <a href="https://github.com/moni-dz/it101-2-summative"
                    ><b>collectify</b> - <i>expense tracker (Java Swing app)</i></a
                >
            </li>
            <li>
                <a href="https://github.com/moni-dz/oop-m2"
                    ><b>cloverpass</b> - <i>movie ticketing system (Windows Forms app)</i></a
                >
            </li>
            <li>
                <a href="https://github.com/moni-dz/keiko"
                    ><b>keiko</b> - <i>flashcards app (web app using Next.js)</i></a
                >
            </li>
            <li>
                <a href="https://github.com/arcadetokyo/FARELY-ROWLET"><b>farely</b> - <i>fare expense tracker</i></a>
            </li>
        </ul>
        <p>existing projects that use web technologies (keiko) showcase my progress in web programming.</p>
        <p>while the other projects are in Java and C#, they are still a testament to my programming skills.</p>
        <p>unlike keiko, this site is built with SvelteKit and UnoCSS as opposed to Next.js and Tailwind CSS.</p>
    </Panel>

    <Panel id="skills" title="skills.txt" class="top-[calc(45vh-5.688rem)] left-[5vw] max-w-fit z-4">
        <h3>this site was built using <span class="text-mell-red">SvelteKit</span>.</h3>
        <p>
            each window is a semantic <code>&lt;article&gt;</code> with its own <code>&lt;header&gt;</code> and
            <code>&lt;section&gt;</code>. animations and hover effects are handled by
            <span class="text-mell-purple">CSS</span> transitions and pseudo-classes.
        </p>
        <p>
            content in windows like this uses <abbr title="CSS flexbox"><code>display: flex</code></abbr> for arrangement.
        </p>
        <p>
            window dragging, window tabs, <a
                href="https://upload.wikimedia.org/wikipedia/commons/a/aa/Philips_PM5544.svg"
                data-preview="true">image previewing<sub>(try me!)</sub></a
            >, and theme toggling are implemented in <span class="text-mell-blue">TypeScript</span> using Svelte state and
            pointer events.
        </p>
        <p>
            this site is <a href={asset('/assets/lighthouse.webp')} data-preview="true">responsive</a> and works well on
            mobile devices, the experience is
            <abbr title="you can't really have &quot;windows&quot;">slightly different</abbr> but still functional.
        </p>
        <p>implementing this site is a marker of my progress in this course and a demonstration of my skills.</p>
    </Panel>

    <Panel id="refs" title="refs.txt" class="top-[calc(86vh-5.688rem)] right-[2vw] max-w-fit z-1">
        <p>
            <Reference n={1} kind="back" /><a href="https://evilmartians.com/chronicles/oklch-in-css-why-quit-rgb-hsl"
                >OKLCH in CSS: why we moved from RGB and HSL</a
            >
        </p>
        <p>
            <Reference n={2} kind="back" /><a
                href="https://urbanjost.github.io/M_ncurses/images/example.gif"
                data-preview="true">ncurses (click to preview)</a
            >
        </p>
    </Panel>
</main>
