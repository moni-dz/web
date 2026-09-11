import { posts } from '$lib/posts';
import { escapeXml, siteUrl } from '$lib/xml';

export const prerender = true;

export function GET() {
    return new Response(`<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel>
<title>blog // lyt</title>
<link>${siteUrl}/blog</link>
<description>Notes about software, projects, and learning from Lythe Marvin Lacre.</description>
<language>en</language>
${posts.map((post) => `<item>
<title>${escapeXml(post.title)}</title>
<link>${escapeXml(`${siteUrl}/blog/${post.slug}`)}</link>
<guid>${escapeXml(`${siteUrl}/blog/${post.slug}`)}</guid>
<pubDate>${new Date(post.date).toUTCString()}</pubDate>
<description>${escapeXml(post.summary)}</description>
</item>`).join('\n')}
</channel></rss>`, { headers: { 'content-type': 'application/rss+xml; charset=utf-8' } });
}
