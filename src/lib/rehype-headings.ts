import type { Element, Nodes, Root } from 'hast';

export type Heading = { id: string; level: number; text: string };

/** The part of mdsvex's vfile that holds parsed front matter. */
type MdsvexFile = { data: { fm?: Record<string, unknown> } };

function textOf(node: Nodes): string {
    if (node.type === 'text') return node.value;
    return 'children' in node ? node.children.map(textOf).join('') : '';
}

/**
 * Adds the post's h2–h6 headings to its front matter so PostLayout can render the table of
 * contents at build time. Must run after rehype-slug, which assigns the ids.
 */
export function rehypeHeadings() {
    return (tree: Root, file: MdsvexFile) => {
        const headings: Heading[] = [];

        const visit = (node: Root | Element) => {
            for (const child of node.children) {
                if (child.type !== 'element') continue;

                const level = /^h([2-6])$/.exec(child.tagName)?.[1];
                const id = child.properties.id;
                if (level && typeof id === 'string') {
                    headings.push({ id, level: Number(level), text: textOf(child) });
                }
                visit(child);
            }
        };

        visit(tree);
        file.data.fm = { ...file.data.fm, headings };
    };
}
