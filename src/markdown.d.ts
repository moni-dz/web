declare module '*.md' {
    import type { Component } from 'svelte';
    import type { PostMetadata } from './lib/posts';
    export const metadata: PostMetadata;
    const component: Component;
    export default component;
}
