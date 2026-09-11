import { posts } from '$lib/posts';
import { escapeXml, siteUrl } from '$lib/xml';

export const prerender = true;

export function GET() {
    const paths = ['/', '/blog', ...posts.map(({ slug }) => `/blog/${slug}`)];
    return new Response(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${paths.map((path) => `<url><loc>${escapeXml(siteUrl + path)}</loc></url>`).join('\n')}
</urlset>`, { headers: { 'content-type': 'application/xml; charset=utf-8' } });
}
