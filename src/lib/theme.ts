const THEME_STORAGE_KEY = 'portfolio-color-scheme';
type ColorScheme = 'dark' | 'light';

export function getPreferredTheme(): ColorScheme {
    try {
        const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
        if (savedTheme === 'dark' || savedTheme === 'light') return savedTheme;
    } catch (error) {
        console.warn('Theme preference could not be read.', error);
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(scheme: ColorScheme, toggle: HTMLButtonElement) {
    const nextScheme = scheme === 'dark' ? 'light' : 'dark';
    document.documentElement.style.colorScheme = scheme;
    document.documentElement.dataset.theme = scheme;
    document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')!.content =
        scheme === 'dark' ? '#232323' : '#eeeeee';
    toggle.setAttribute('aria-label', `Switch to ${nextScheme} theme`);
    toggle.setAttribute('aria-pressed', String(scheme === 'dark'));
}

export function initThemeToggle(toggle: HTMLButtonElement) {
    applyTheme(getPreferredTheme(), toggle);
    const onClick = () => {
        const nextScheme = document.documentElement.style.colorScheme === 'dark' ? 'light' : 'dark';
        applyTheme(nextScheme, toggle);
        try {
            window.localStorage.setItem(THEME_STORAGE_KEY, nextScheme);
        } catch (error) {
            console.warn('Theme preference could not be saved.', error);
        }
    };
    toggle.addEventListener('click', onClick);
    return () => toggle.removeEventListener('click', onClick);
}
