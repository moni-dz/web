---
title: github pages to cloudflare workers
date: 2026-09-11
summary: and a svelte rewrite.
tags: [cloudflare, sveltekit]
accent: orange
---

## how it started

this was originally a website for course compliance, deployed on GitHub Pages,
and using vanilla html/css/js.


## purchasing a domain from Cloudflare

recently acquired this domain from Cloudflare, cheap TLD, set up all the
bells and whistles like e-mail routing/sending via iCloud Mail, tunneling from my
local network to the outside


## exodus

as a temporary fix, I just added DNS records pointing to GitHub Pages, and called it a day.
however, as of recent GitHub outages became a recurring issue, I decided to pay for the Workers Paid plan.


## the Svelte detour

while I was looking into transitioning to Cloudflare Workers, I wanted to port the existing vanilla site
to Svelte 5.

<br>

i have heard good things about Svelte such as:
- tiny bundles, framework mostly disappears at runtime
- components read like the markup you'd write anyway

<br>

a first look at the small examples it didn't seem to feel that monumental so it was easy to get started with given that most of the heavy lifting were the js that handled the windowing system in the root page and not the components and the existing code was littered in jsdoc so porting it to typescript was trivial.

