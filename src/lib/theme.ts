export type ColorScheme = 'dark' | 'light';

export const THEME_COLORS: Record<ColorScheme, string> = {
    light: '#e7e7e7',
    dark: '#1a1a1a',
};

export const THEME_STORAGE_KEY = 'portfolio-color-scheme';

const themeInitScript = `(() => {
    let theme;
    try { theme = localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)}); } catch {}
    if (theme !== 'dark' && theme !== 'light') {
        theme = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    const colors = ${JSON.stringify(THEME_COLORS)};
    document.documentElement.style.colorScheme = theme;
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]').content = colors[theme];
})();`;

/** Inline `<script>` element for `<svelte:head>`; it must follow the theme-color meta tag. */
export const themeInitTag = `<script>${themeInitScript}</` + 'script>';
