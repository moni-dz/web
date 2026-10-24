import extractorSvelte from '@unocss/extractor-svelte';
import { defineConfig, presetWind4, transformerVariantGroup } from 'unocss';

const tokens = (names: string[], prefix: string) =>
    Object.fromEntries(names.map((name) => [name, `var(--${prefix}${name})`]));

export default defineConfig({
    extractors: [extractorSvelte()],
    transformers: [transformerVariantGroup()],
    presets: [presetWind4({ preflights: { reset: false } })],
    theme: {
        colors: {
            mell: tokens(
                [
                    'bg',
                    'bg2',
                    'bg-dim',
                    'fg',
                    'fg2',
                    'fg3',
                    'red',
                    'orange',
                    'khaki',
                    'yellow',
                    'green',
                    'blue',
                    'purple',
                    'comment',
                ],
                'mell-',
            ),
            bg: 'var(--bg-color)',
            fg: 'var(--text-color)',
            muted: 'var(--muted-color)',
            line: 'var(--border-color)',
            shadow: 'var(--shadow-color)',
            overlay: 'var(--overlay-color)',
            link: 'var(--link-color)',
            emphasis: 'var(--emphasis-color)',
            abbr: 'var(--abbr-color)',
            tag: 'var(--tag-color)',
            accent: {
                DEFAULT: 'var(--post-accent)',
                text: 'color-mix(in oklab, var(--post-accent) 75%, var(--text-color))',
                subtle: 'color-mix(in oklab, var(--post-accent) 45%, var(--text-color))',
            },
        },
        breakpoint: { sm: '31.25rem', md: '48rem', lg: '75rem' },
        font: {
            mono: 'var(--font-family-mono)',
            serif: "'Crimson Pro', Georgia, serif",
            display: "'Fraunces', 'Crimson Pro', Georgia, serif",
        },
    },
});
