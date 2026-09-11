import { test, expect, type Page } from '@playwright/test';

async function openPage(page: Page, width: number, height: number) {
    await page.setViewportSize({ width, height });
    await page.goto('/');
    await expect(page.locator('.panel.active')).toHaveCount(1);
}

async function activatePanel(page: Page, panelId: string) {
    await page.locator(`nav a[data-panel="${panelId}"]`).click();
    await expect(page.locator(`#${panelId}`)).toHaveClass(/active/);
}

async function waitForMode(page: Page, expectedText: string) {
    await expect(page.locator('#welcome-message-1')).toContainText(expectedText);
}

async function getElementCenter(page: Page, selector: string) {
    const box = await page.locator(selector).boundingBox();
    if (!box) throw new Error(`${selector} has no bounding box.`);
    return { x: Math.round(box.x + box.width / 2), y: Math.round(box.y + box.height / 2) };
}

/** Starts a held drag so lifecycle events can prove they cancel both state and queued frames. */
async function holdDrag(page: Page) {
    const start = await getElementCenter(page, '#about .terminal-header');
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    const held = { x: start.x + 40, y: start.y + 30 };
    await page.mouse.move(held.x, held.y, { steps: 5 });
    await expect(page.locator('#about')).toHaveClass(/dragging/);
    return held;
}

test('a live page switches desktop to mobile and back to desktop', async ({ page }) => {
    await openPage(page, 1_280, 800);
    await waitForMode(page, 'on desktop or tablets');

    await page.setViewportSize({ width: 375, height: 800 });
    await waitForMode(page, 'on mobile');

    // Synthetic touch payloads isolate the lifecycle assertion from Playwright's own touch
    // emulation while still exercising the listeners installed in the real browser document.
    const selectedTab = await page.evaluate(() => {
        const panel = document.querySelector('#about')!;
        const start = new Event('touchstart', { bubbles: true, cancelable: true });
        Object.defineProperty(start, 'touches', { value: [{ clientX: 300 }] });
        panel.dispatchEvent(start);
        const end = new Event('touchend', { bubbles: true, cancelable: true });
        Object.defineProperty(end, 'changedTouches', { value: [{ clientX: 80 }] });
        panel.dispatchEvent(end);
        return panel.querySelector('.terminal-tab.tab-active')!.id;
    });
    expect(selectedTab).toBe('about-author');

    await page.setViewportSize({ width: 1_280, height: 800 });
    await waitForMode(page, 'on desktop or tablets');

    // Direct dispatch avoids panel overlap deciding which element receives the pointer event.
    // The event still crosses the browser's real DOM listener boundary between responsive modes.
    await page.evaluate(() => {
        const content = document.querySelector('#projects .terminal-content')!;
        content.dispatchEvent(new PointerEvent('pointerdown', {
            bubbles: true,
            button: 0,
            isPrimary: true,
            pointerId: 17,
        }));
    });
    await expect(page.locator('#projects')).toHaveClass(/active/);
});

test('resize reclamps a dragged panel and mobile clears drag styles', async ({ page }) => {
    await openPage(page, 1_000, 800);
    await activatePanel(page, 'about');

    await page.waitForFunction(() => {
        const panel = document.querySelector('#about')!.getBoundingClientRect();
        const container = document.querySelector('.panels-container')!.getBoundingClientRect();
        const maxWidth = Number.parseFloat(getComputedStyle(document.querySelector('#about')!).maxWidth);
        const expectedWidth = Math.min(container.width * 0.75, maxWidth);
        return panel.width >= expectedWidth - 1;
    });

    const start = await getElementCenter(page, '#about .terminal-header');
    const edge = await page.evaluate(() => {
        const rect = document.querySelector('.panels-container')!.getBoundingClientRect();
        return { x: Math.floor(rect.right - 4), y: Math.floor(rect.bottom - 4) };
    });

    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(edge.x, edge.y, { steps: 10 });
    await page.mouse.up();

    await expect(page.locator('#about')).toHaveCSS('position', 'absolute');
    expect(await page.evaluate(() => {
        const panel = document.querySelector('#about')!.getBoundingClientRect();
        const container = document.querySelector('.panels-container')!.getBoundingClientRect();
        // A 1px epsilon absorbs sub-pixel getBoundingClientRect() rounding differences between
        // engines (WebKit rounds fractional layout values differently from Chromium/Firefox).
        return panel.left >= container.left - 1 && panel.top >= container.top - 1 &&
            panel.right <= container.right + 1 && panel.bottom <= container.bottom + 1;
    })).toBe(true);

    // Resize while the moved panel is inactive, then reactivate it. This catches stale inline
    // widths that otherwise override the responsive 75% active-panel rule.
    await activatePanel(page, 'projects');
    await page.setViewportSize({ width: 800, height: 600 });
    await activatePanel(page, 'about');

    await page.waitForFunction(() => {
        const panel = document.querySelector('#about')!.getBoundingClientRect();
        const container = document.querySelector('.panels-container')!.getBoundingClientRect();
        const maxWidth = Number.parseFloat(getComputedStyle(document.querySelector('#about')!).maxWidth);
        const expectedWidth = Math.min(container.width * 0.75, maxWidth);
        const expanded = panel.width >= expectedWidth - 1;
        return expanded && panel.left >= container.left - 1 && panel.top >= container.top - 1 &&
            panel.right <= container.right + 1 && panel.bottom <= container.bottom + 1;
    });

    await page.setViewportSize({ width: 375, height: 800 });
    await waitForMode(page, 'on mobile');

    expect(await page.evaluate(() => {
        const properties = ['height', 'left', 'position', 'top', 'transform', 'width'] as const;
        return [...document.querySelectorAll('.panel:not(#preview)')].every((panel) => {
            return properties.every((property) => (panel as HTMLElement).style[property] === '');
        });
    })).toBe(true);
});

test('web previews are isolated and unsupported popovers navigate normally', async ({ page }) => {
    await openPage(page, 1_280, 800);

    const previewPolicy = await page.evaluate(() => {
        const link = document.querySelector<HTMLAnchorElement>('#skills a[href*="Philips_PM5544"]')!;
        link.href = 'https://preview.invalid/page';
        link.click();

        const preview = document.querySelector('#preview')!;
        const iframe = preview.querySelector('iframe')!;
        const external = preview.querySelector<HTMLAnchorElement>('.preview-external-link')!;
        return {
            allow: iframe.allow,
            externalRel: external.rel,
            externalTarget: external.target,
            isOpen: preview.matches(':popover-open'),
            referrerPolicy: iframe.referrerPolicy,
            sandbox: iframe.getAttribute('sandbox'),
        };
    });

    expect(previewPolicy.isOpen).toBe(true);
    expect(previewPolicy.sandbox).toBe('');
    expect(previewPolicy.referrerPolicy).toBe('no-referrer');
    expect(previewPolicy.allow).toMatch(/camera 'none'/);
    expect(previewPolicy.externalRel).toBe('noopener noreferrer');
    expect(previewPolicy.externalTarget).toBe('_blank');

    await page.goto('/');
    await expect(page.locator('.panel.active')).toHaveCount(1);

    const failureState = await page.evaluate(() => {
        Object.defineProperty(HTMLElement.prototype, 'showPopover', {
            configurable: true,
            value: () => { throw new Error('Synthetic opening failure.'); },
        });
        const link = document.querySelector<HTMLAnchorElement>('#skills a[href*="Philips_PM5544"]')!;
        link.href = '#skills';
        link.click();
        return {
            active: document.querySelector('#skills')!.classList.contains('active'),
            previewExists: document.querySelector('#preview') !== null,
        };
    });

    expect(failureState.active).toBe(true);
    expect(failureState.previewExists).toBe(false);

    await page.evaluate((blogUrl) => {
        Object.defineProperty(HTMLElement.prototype, 'showPopover', {
            configurable: true,
            value: undefined,
        });
        const link = document.querySelector<HTMLAnchorElement>('#skills a[href="#skills"]')!;
        link.href = blogUrl;
        link.click();
    }, new URL('/blog', page.url()).toString());

    await page.waitForURL(/\/blog$/);
});

test('blur and pagehide each cancel an in-progress drag', async ({ page }) => {
    await openPage(page, 1_280, 800);
    await activatePanel(page, 'about');

    for (const lifecycleEvent of ['blur', 'pagehide']) {
        const held = await holdDrag(page);
        await page.evaluate((eventName) => window.dispatchEvent(new Event(eventName)), lifecycleEvent);

        await expect(page.locator('#about')).not.toHaveClass(/dragging/);

        const transformBefore = await page.locator('#about').evaluate((el: HTMLElement) => el.style.transform);

        await page.mouse.move(held.x + 20, held.y + 20, { steps: 5 });
        await page.mouse.up();

        const transformAfter = await page.locator('#about').evaluate((el: HTMLElement) => el.style.transform);
        expect(transformAfter).toBe(transformBefore);
    }
});

test('theme and window manager survive blog navigation and reload', async ({ page }) => {
    await openPage(page, 1_280, 800);

    const theme = await page.evaluate(() => {
        document.querySelector<HTMLElement>('#toggle-theme')!.click();
        return document.documentElement.dataset.theme;
    });
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute(
        'content',
        theme === 'dark' ? '#232323' : '#eeeeee',
    );

    await page.locator('nav a[href="/blog"]').click();
    await expect(page.locator('.blog-post-link').first()).toBeVisible();
    await page.locator('.blog-post-link').first().click();
    await expect(page.locator('.blog-toc-list a')).toHaveCount(4);
    await expect(page.locator('.markdown-body')).toBeVisible();

    await page.locator('nav a[href="/"]').click();
    await expect(page.locator('.panel.active')).toHaveCount(1);
    await activatePanel(page, 'skills');
    expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe(theme);
    await expect(page.locator('#toggle-theme')).toHaveCount(1);

    await page.locator('a[href="/assets/lighthouse.webp"]').click();
    await page.waitForFunction(() => {
        const img = document.querySelector<HTMLImageElement>('#preview.image-preview img');
        return !!img?.complete;
    });

    await page.goto('/');
    await expect(page.locator('.panel.active')).toHaveCount(1);
    expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe(theme);
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute(
        'content',
        theme === 'dark' ? '#232323' : '#eeeeee',
    );
});

test('blog post reload always lands scrolled to the title', async ({ page }) => {
    await page.setViewportSize({ width: 1_280, height: 800 });
    await page.goto('/blog/ghp-to-cfw');
    await expect(page.locator('.blog-post-title')).toBeVisible();

    await page.locator('.blog-page-content').evaluate((el) => { el.scrollTop = 400; });
    await expect.poll(() => page.locator('.blog-page-content').evaluate((el) => el.scrollTop))
        .toBeGreaterThan(0);

    await page.reload();
    await expect(page.locator('.blog-post-title')).toBeVisible();
    await expect(page.locator('.blog-page-content')).toHaveJSProperty('scrollTop', 0);
});

test('mobile navigation uses document coordinates after scrolling', async ({ page }) => {
    await openPage(page, 375, 800);
    await waitForMode(page, 'on mobile');
    await activatePanel(page, 'projects');

    await page.waitForFunction(() => {
        const panel = document.querySelector('#projects')!.getBoundingClientRect();
        const nav = document.querySelector('nav')!.getBoundingClientRect();
        return Math.abs(panel.top - nav.bottom) <= 1;
    });

    await page.evaluate(() => window.scrollTo(0, 250));
    await page.evaluate(() => {
        (window as any).scrollTo = (options: { top: number }) => {
            (window as any).requestedScrollTop = options.top;
        };
        const panel = document.querySelector('#projects')!;
        (window as any).expectedScrollTop = panel.getBoundingClientRect().top + window.scrollY -
            (document.querySelector('nav') as HTMLElement).offsetHeight;
        document.querySelector<HTMLElement>('nav a[data-panel="projects"]')!.click();
    });

    const requested = await page.evaluate(() => (window as any).requestedScrollTop);
    const expected = await page.evaluate(() => (window as any).expectedScrollTop);
    expect(requested).toBe(expected);
});

test('mobile accordion opens one panel at a time and collapses on repeat tap', async ({ page }) => {
    await openPage(page, 375, 800);
    await waitForMode(page, 'on mobile');

    await page.locator('#projects .panel-toggle').click();
    await expect(page.locator('#projects')).toHaveClass(/active/);

    const stateAfterOpen = await page.evaluate(() => ({
        activeCount: document.querySelectorAll('.panel.active').length,
        projectsExpanded: document.querySelector('#projects .panel-toggle')!.getAttribute('aria-expanded'),
        welcomeActive: document.querySelector('#welcome')!.classList.contains('active'),
        welcomeExpanded: document.querySelector('#welcome .panel-toggle')!.getAttribute('aria-expanded'),
    }));

    expect(stateAfterOpen.activeCount).toBe(1);
    expect(stateAfterOpen.projectsExpanded).toBe('true');
    expect(stateAfterOpen.welcomeActive).toBe(false);
    expect(stateAfterOpen.welcomeExpanded).toBe('false');

    await page.locator('#projects .panel-toggle').click();
    await expect(page.locator('.panel.active')).toHaveCount(0);
    await expect(page.locator('#projects .panel-toggle')).toHaveAttribute('aria-expanded', 'false');
});
