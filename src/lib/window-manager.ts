import { flushSync } from 'svelte';
import type { PanelState } from '$lib/panels.svelte';

type Position = { x: number; y: number };
type PanelBounds = { minX: number; minY: number; maxX: number; maxY: number };

/** Matches UnoCSS's `max-sm:` variant (see uno.config.ts). */
export const MOBILE_QUERY = '(width < 31.25rem)';

/** Restricts a number to an inclusive range. */
function clamp(value: number, min: number, max: number) {
    return Math.max(min, Math.min(max, value));
}

/** Updates a stable position object so the drag hot path does not allocate on every frame. */
export function boundPanelPosition(target: Position, x: number, y: number, bounds: PanelBounds) {
    if (!Number.isFinite(x)) throw new TypeError('Panel x position must be finite.');
    if (!Number.isFinite(y)) throw new TypeError('Panel y position must be finite.');
    if (bounds.minX > bounds.maxX) throw new RangeError('Panel x bounds are inverted.');
    if (bounds.minY > bounds.maxY) throw new RangeError('Panel y bounds are inverted.');

    target.x = clamp(x, bounds.minX, bounds.maxX);
    target.y = clamp(y, bounds.minY, bounds.maxY);
    return target;
}

export function initWindowManager(panels: PanelState) {
    const controller = new AbortController();
    const timeouts = new Set<number>();
    type Events = GlobalEventHandlersEventMap & WindowEventMap & MediaQueryListEventMap;
    function on<K extends keyof Events>(
        target: EventTarget,
        type: K,
        listener: (event: Events[K]) => void,
        options: AddEventListenerOptions = {},
    ) {
        target.addEventListener(type, listener as EventListener, { ...options, signal: controller.signal });
    }
    function later(callback: () => void, delay: number) {
        const id = window.setTimeout(() => {
            timeouts.delete(id);
            callback();
        }, delay);
        timeouts.add(id);
        return id;
    }
    function cancelLater(id: number) {
        window.clearTimeout(id);
        timeouts.delete(id);
    }

    const RESIZE_DEBOUNCE_MS = 100;
    const HIGHLIGHT_MS = 2000;
    const TOOLTIP_DISMISS_MS = 3000;
    /** Pointer travel before a press on a title bar becomes a drag, so clicks still reach its buttons. */
    const DRAG_THRESHOLD_PX = 4;
    const IMAGE_FILE_PATTERN = /\.(?:avif|gif|jpe?g|png|svg|webp)$/i;
    const PREVIEW_PERMISSIONS_POLICY = [
        "autoplay 'none'",
        "camera 'none'",
        "clipboard-read 'none'",
        "clipboard-write 'none'",
        "display-capture 'none'",
        "encrypted-media 'none'",
        "fullscreen 'none'",
        "geolocation 'none'",
        "microphone 'none'",
        "payment 'none'",
        "picture-in-picture 'none'",
        "screen-wake-lock 'none'",
        "usb 'none'",
        "web-share 'none'",
        "xr-spatial-tracking 'none'",
    ].join('; ');

    const selectors = {
        nav: 'nav',
        panel: '.panel',
        panelsContainer: '.panels-container',
        previewContainer: '.preview-container',
        previewHeading: '.preview-heading',
        previewLink: 'a[data-preview="true"]',
        terminalHeader: '.terminal-header',
    };

    const state = {
        container: null as HTMLElement | null,
        containerRect: null as DOMRect | null,
        drag: {
            captureTarget: null as HTMLElement | null,
            frame: 0,
            isActive: false,
            isPending: false,
            panel: null as HTMLElement | null,
            pointerId: null as number | null,
            pointerX: 0,
            pointerY: 0,
            startX: 0,
            startY: 0,
            startPanelX: 0,
            startPanelY: 0,
        },
        isMobile: false,
        mobileQuery: null as MediaQueryList | null,
        navHeight: 0,
        panelBounds: new Map<HTMLElement, PanelBounds>(),
        panelPositions: new Map<HTMLElement, Position>(),
        previewPanel: null as HTMLDivElement | null,
        previewSourcePanel: null as HTMLElement | null,
        reducedMotionQuery: window.matchMedia('(prefers-reduced-motion: reduce)'),
        resizeTimeout: 0,
        tooltipDismissers: [] as (() => void)[],
        zIndexMax: 0,
    };

    /**
     * Finds one required element and reports a clear error if the HTML is out of sync with the JS.
     *
     * @param selector CSS selector to search for.
     * @param root Element whose descendants should be searched. Defaults to `document`.
     */
    function queryRequired<T extends HTMLElement = HTMLElement>(selector: string, root: Document | Element = document) {
        const element = root.querySelector<T>(selector);
        if (element) return element;

        throw new Error(`Missing required element: ${selector}`);
    }

    /**
     * Returns a real array so callers can safely use array helpers such as filter and reduce.
     *
     * @param selector CSS selector to search for.
     * @param root Element whose descendants should be searched. Defaults to `document`.
     */
    function queryAll<T extends HTMLElement = HTMLElement>(selector: string, root: Document | Element = document) {
        return Array.from(root.querySelectorAll<T>(selector));
    }

    function getPanels() {
        return queryAll(selectors.panel);
    }

    function getInteractivePanels() {
        return getPanels().filter((panel) => panel.id !== 'preview');
    }

    function isActive(panel: HTMLElement) {
        return panels.active === panel.id;
    }

    function scrollBehavior(): ScrollBehavior {
        return state.reducedMotionQuery.matches ? 'auto' : 'smooth';
    }

    /** Reads a panel's stacking order from either its inline style or the stylesheet. */
    function getPanelZIndex(panel: HTMLElement) {
        const styleValue = panel.style.zIndex || getComputedStyle(panel).zIndex;
        const zIndex = Number.parseInt(styleValue, 10);

        return Number.isFinite(zIndex) ? zIndex : 0;
    }

    function refreshZIndexMax() {
        state.zIndexMax = getPanels().reduce((max, panel) => {
            return Math.max(max, getPanelZIndex(panel));
        }, 0);
    }

    /**
     * Calculates the coordinates a panel may occupy without leaving the visible part of the
     * panels container. Coordinates are relative to the container's scrolled content, so the
     * visible region moves with the container's scroll offset.
     */
    function getPanelBounds(panel: HTMLElement) {
        const container = state.container!;
        const minX = container.scrollLeft;
        const minY = container.scrollTop;

        return {
            maxX: Math.max(minX, minX + container.clientWidth - panel.offsetWidth),
            maxY: Math.max(minY, minY + container.clientHeight - panel.offsetHeight),
            minX,
            minY,
        };
    }

    function refreshLayoutMeasurements() {
        const nav = queryRequired(selectors.nav);

        state.containerRect = state.container!.getBoundingClientRect();
        state.navHeight = nav.offsetHeight;
        state.panelBounds.clear();

        for (const panel of getInteractivePanels()) {
            refreshPanelMeasurements(panel);
        }
    }

    /**
     * Reflows one panel before applying its saved position to the new viewport.
     *
     * Clearing the frozen drag size first lets responsive CSS choose the panel's new natural size.
     * The saved coordinates are then clamped against that size, so neither edge can become hidden.
     */
    function refreshPanelMeasurements(panel: HTMLElement) {
        const position = state.panelPositions.get(panel);

        clearPanelPositionStyles(panel);

        const bounds = getPanelBounds(panel);
        state.panelBounds.set(panel, bounds);

        if (position) {
            setPanelPosition(panel, position.x, position.y, bounds);
        }
    }

    function bindLayoutMeasurements() {
        state.mobileQuery = window.matchMedia(MOBILE_QUERY);
        state.isMobile = state.mobileQuery.matches;
        refreshLayoutMeasurements();

        on(state.mobileQuery, 'change', updateResponsiveMode);
        on(window, 'resize', () => {
            // A resize changes the drag coordinate system underneath the pointer. Ending the drag
            // immediately avoids applying one last frame with measurements from the old viewport.
            stopDrag();
            cancelLater(state.resizeTimeout);
            state.resizeTimeout = later(() => {
                refreshLayoutMeasurements();
            }, RESIZE_DEBOUNCE_MS);
        });
    }

    /**
     * Re-clamps a moved panel whenever its size changes: active/inactive width transitions, tab
     * switches, and opening a `<details>` all resize panels without resizing the window.
     */
    function bindPanelResizes() {
        const observer = new ResizeObserver((entries) => {
            if (state.isMobile) return;

            for (const entry of entries) {
                const panel = entry.target as HTMLElement;
                if (panel === state.drag.panel) continue;
                if (!state.panelPositions.has(panel)) continue;

                refreshPanelMeasurements(panel);
            }
        });

        for (const panel of getInteractivePanels()) {
            observer.observe(panel);
        }

        controller.signal.addEventListener('abort', () => observer.disconnect());
    }

    /** Switches the interaction model when the CSS breakpoint changes. */
    function updateResponsiveMode(event: MediaQueryListEvent) {
        setResponsiveMode(event.matches);
    }

    /** Applies one responsive mode without duplicating page-lifetime event listeners. */
    function setResponsiveMode(isMobile: boolean) {
        if (state.isMobile === isMobile) return;

        state.isMobile = isMobile;
        stopDrag();
        dismissMobileTooltips();

        if (state.isMobile) {
            resetPanelPositions();
        }

        refreshLayoutMeasurements();
    }

    /**
     * Marks one panel active. The DOM update is flushed immediately because callers measure the
     * panel's new active width right afterwards.
     */
    function setActivePanel(panel: HTMLElement) {
        panels.active = panel.id;
        flushSync();
    }

    function focusPanel(panel: HTMLElement | null) {
        if (!panel) return;

        if (state.isMobile) {
            setActivePanel(panel);
            scrollPanelIntoMobileView(panel);
            return;
        }

        if (!isActive(panel)) {
            setActivePanel(panel);
        }

        if (panel.id !== 'preview') {
            state.zIndexMax += 1;
            panel.style.zIndex = String(state.zIndexMax);
        }
    }

    function scrollPanelIntoMobileView(panel: HTMLElement) {
        // window.scrollTo takes a document coordinate, not a container-relative offset.
        const top = panel.getBoundingClientRect().top + window.scrollY - state.navHeight;
        window.scrollTo({
            behavior: scrollBehavior(),
            top,
        });
    }

    function bindReferenceLinks() {
        const referenceToPanel = new Map();

        for (const reference of queryAll('sup[id^="ref-"]')) {
            const referenceNumber = reference.id.slice('ref-'.length);
            const panel = reference.closest(selectors.panel);
            if (!panel) continue;

            referenceToPanel.set(referenceNumber, panel.id);
            on(reference, 'click', (event) => {
                event.preventDefault();

                const backReference = document.getElementById(`back-ref-${referenceNumber}`);
                activateReference('refs', backReference);
            });
        }

        const refsPanel = document.getElementById('refs');
        if (!refsPanel) return;

        for (const backReference of queryAll('sup[id^="back-ref-"]', refsPanel)) {
            on(backReference, 'click', (event) => {
                event.preventDefault();

                const referenceNumber = backReference.id.slice('back-ref-'.length);
                const targetId = referenceToPanel.get(referenceNumber);
                const originalReference = document.getElementById(`ref-${referenceNumber}`);

                if (!targetId) return;
                activateReference(targetId, originalReference);
            });
        }
    }

    function activateReference(targetId: string, highlightElement: HTMLElement | null) {
        const targetPanel = document.getElementById(targetId);
        if (!targetPanel) return;

        focusPanel(targetPanel);
        highlightTemporary(highlightElement);

        if (state.isMobile && highlightElement) {
            later(() => {
                highlightElement.scrollIntoView({
                    behavior: scrollBehavior(),
                    block: 'center',
                });
            }, RESIZE_DEBOUNCE_MS);
        }
    }

    function highlightTemporary(element: HTMLElement | null) {
        if (!element) return;

        element.classList.add('highlight');
        later(() => {
            element.classList.remove('highlight');
        }, HIGHLIGHT_MS);
    }

    function bindDragging() {
        on(document, 'pointerdown', startDrag);
        on(document, 'pointermove', queueDrag);
        on(document, 'pointerup', stopDrag);
        on(document, 'pointercancel', stopDrag);
        on(document, 'lostpointercapture', stopDrag);
        on(window, 'blur', stopDrag);
    }

    function bindPageLifecycle() {
        on(window, 'pagehide', suspendPage);
        on(window, 'pageshow', restorePage);
    }

    /** Clears transient work so a back/forward-cache snapshot contains no half-finished action. */
    function suspendPage() {
        stopDrag();
        dismissMobileTooltips();
        cancelLater(state.resizeTimeout);
        state.resizeTimeout = 0;
    }

    function restorePage(event: PageTransitionEvent) {
        if (!event.persisted) return;

        const isMobile = state.mobileQuery!.matches;
        if (state.isMobile === isMobile) {
            refreshLayoutMeasurements();
            return;
        }

        setResponsiveMode(isMobile);
    }

    /**
     * Arms a drag when an active panel's title bar is pressed.
     *
     * The drag itself starts only once the pointer moves past DRAG_THRESHOLD_PX. Capturing the
     * pointer on press would retarget the following click to the title bar, so its buttons (the
     * panel title and the about tabs) would never receive it.
     */
    function startDrag(event: PointerEvent) {
        if (state.isMobile || event.button !== 0) return;
        if (!event.isPrimary) return;
        if (state.drag.isActive || state.drag.isPending) return;
        if (!(event.target instanceof Element)) return;

        const panel = event.target.closest<HTMLElement>(selectors.panel);
        const header = event.target.closest<HTMLElement>(selectors.terminalHeader);

        if (!panel) return;
        if (!header) return;
        if (panel.id === 'preview') return;

        if (!isActive(panel)) {
            focusPanel(panel);
            return;
        }

        state.drag.captureTarget = header;
        state.drag.isPending = true;
        state.drag.panel = panel;
        state.drag.pointerId = event.pointerId;
        state.drag.pointerX = event.clientX;
        state.drag.pointerY = event.clientY;
        state.drag.startX = event.clientX;
        state.drag.startY = event.clientY;
    }

    /** Freezes the panel's box and captures the pointer once a press becomes a real drag. */
    function beginDrag() {
        const panel = state.drag.panel!;
        const header = state.drag.captureTarget!;
        const container = state.container!;
        const panelRect = panel.getBoundingClientRect();

        // The resize debounce may still be pending when a user immediately begins a new drag.
        // Reading the container here pairs the cached measurement with the panel's frozen box.
        state.containerRect = container.getBoundingClientRect();

        // Freeze the rendered box only for the active gesture. Responsive active/inactive widths
        // must take control again as soon as the pointer is released.
        panel.style.height = `${panelRect.height}px`;
        panel.style.width = `${panelRect.width}px`;
        state.panelBounds.set(panel, getPanelBounds(panel));
        state.drag.isPending = false;
        state.drag.isActive = true;
        state.drag.startPanelX = panelRect.left - state.containerRect.left + container.scrollLeft;
        state.drag.startPanelY = panelRect.top - state.containerRect.top + container.scrollTop;

        panel.classList.add('dragging');

        // Pointer capture keeps the release event paired with this drag even when the pointer
        // leaves the title bar or viewport. The blur/pagehide handlers remain a second safety net.
        if (typeof header.setPointerCapture === 'function') {
            header.setPointerCapture(state.drag.pointerId!);
        }
    }

    /** Saves the newest pointer position and limits visual updates to one per animation frame. */
    function queueDrag(event: PointerEvent) {
        if (!state.drag.isActive && !state.drag.isPending) return;
        if (event.pointerId !== state.drag.pointerId) return;

        if (state.drag.isPending) {
            const distance = Math.hypot(event.clientX - state.drag.startX, event.clientY - state.drag.startY);
            if (distance < DRAG_THRESHOLD_PX) return;
            beginDrag();
        }

        event.preventDefault();

        state.drag.pointerX = event.clientX;
        state.drag.pointerY = event.clientY;

        // Pointer events can arrive faster than the display refresh rate. One animation frame keeps
        // dragging smooth while preventing redundant style writes.
        if (state.drag.frame === 0) {
            state.drag.frame = window.requestAnimationFrame(applyDrag);
        }
    }

    function applyDrag() {
        state.drag.frame = 0;

        const panel = state.drag.panel;
        if (!state.drag.isActive || !panel) return;

        const deltaX = state.drag.pointerX - state.drag.startX;
        const deltaY = state.drag.pointerY - state.drag.startY;
        const x = state.drag.startPanelX + deltaX;
        const y = state.drag.startPanelY + deltaY;
        const bounds = state.panelBounds.get(panel);

        if (bounds) {
            setPanelPosition(panel, x, y, bounds);
        }
    }

    function stopDrag(event?: Event) {
        if (!state.drag.isActive && !state.drag.isPending) return;

        if (event) {
            if ('pointerId' in event && typeof event.pointerId === 'number') {
                if (event.pointerId !== state.drag.pointerId) return;
            }
        }

        if (state.drag.frame !== 0) {
            window.cancelAnimationFrame(state.drag.frame);
        }

        const wasDragging = state.drag.isActive;
        const captureTarget = state.drag.captureTarget;
        const panel = state.drag.panel;
        const pointerId = state.drag.pointerId;

        state.drag.captureTarget = null;
        state.drag.frame = 0;
        state.drag.isActive = false;
        state.drag.isPending = false;
        state.drag.panel = null;
        state.drag.pointerId = null;

        if (!wasDragging) return;

        if (panel) {
            panel.classList.remove('dragging');
            panel.style.removeProperty('height');
            panel.style.removeProperty('width');

            if (!state.isMobile) {
                refreshPanelMeasurements(panel);
            }
        }

        if (captureTarget && pointerId !== null && captureTarget.hasPointerCapture?.(pointerId)) {
            captureTarget.releasePointerCapture(pointerId);
        }
    }

    /**
     * Moves a panel while keeping it inside its calculated bounds.
     *
     * @param panel Panel being moved.
     * @param x Requested horizontal position.
     * @param y Requested vertical position.
     * @param bounds Allowed movement area.
     */
    function setPanelPosition(panel: HTMLElement, x: number, y: number, bounds: PanelBounds) {
        let position = state.panelPositions.get(panel);
        if (!position) {
            position = { x: 0, y: 0 };
            state.panelPositions.set(panel, position);
        }

        boundPanelPosition(position, x, y, bounds);
        panel.style.left = '0';
        panel.style.position = 'absolute';
        panel.style.top = '0';
        panel.style.transform = `translate(${position.x}px, ${position.y}px)`;
    }

    /** Removes drag-only styles without disturbing z-index, which preserves the user's focus order. */
    function clearPanelPositionStyles(panel: HTMLElement) {
        panel.style.removeProperty('height');
        panel.style.removeProperty('left');
        panel.style.removeProperty('position');
        panel.style.removeProperty('top');
        panel.style.removeProperty('transform');
        panel.style.removeProperty('width');
    }

    /** Restores normal document flow before the mobile window stack becomes visible. */
    function resetPanelPositions() {
        for (const panel of getInteractivePanels()) {
            clearPanelPositionStyles(panel);
        }

        state.panelPositions.clear();
    }

    /**
     * Builds the popover used to show linked images and web pages. It only exists while open, so
     * it is always styled as the active window.
     */
    function createPreviewPanel() {
        const panel = document.createElement('div');

        panel.className = 'panel active';
        panel.id = 'preview';
        panel.popover = 'auto';
        panel.innerHTML = `
            <div class="terminal-window">
                <header class="terminal-header">
                    <h4 class="preview-heading">web preview</h4>
                </header>
                <section class="terminal-content">
                    <div class="preview-container"></div>
                </section>
            </div>
        `;

        state.container!.appendChild(panel);

        return panel;
    }

    /** Checks whether a URL points to a common browser-supported image format. */
    function isImageUrl(url: string) {
        return IMAGE_FILE_PATTERN.test(new URL(url, window.location.href).pathname);
    }

    /**
     * Replaces the preview contents with either a naturally sized image or a full web frame.
     *
     * @param panel Preview panel.
     * @param url URL selected by the visitor.
     */
    function renderPreview(panel: HTMLDivElement, url: string) {
        const container = queryRequired(selectors.previewContainer, panel);
        const heading = queryRequired(selectors.previewHeading, panel);
        const hint = state.isMobile ? 'tap outside to dismiss' : 'press Esc to dismiss or click outside';

        container.replaceChildren();

        if (isImageUrl(url)) {
            const image = document.createElement('img');
            const pathname = new URL(url, window.location.href).pathname;
            const filename = decodeURIComponent(pathname.split('/').pop() || 'linked image');

            panel.classList.add('image-preview');
            heading.textContent = 'image preview';
            image.alt = `Preview of ${filename}`;
            image.src = url;

            container.appendChild(image);
            return;
        }

        const iframe = document.createElement('iframe');
        const externalLink = document.createElement('a');

        panel.classList.remove('image-preview');
        heading.textContent = `web preview (${hint})`;
        externalLink.className = 'preview-external-link';
        externalLink.href = url;
        externalLink.rel = 'noopener noreferrer';
        externalLink.target = '_blank';
        externalLink.textContent = 'open the original page';

        // Web previews are untrusted documents. An empty sandbox allows static rendering while
        // denying scripts, forms, downloads, popups, and top-level navigation by default.
        iframe.setAttribute('sandbox', '');
        iframe.allow = PREVIEW_PERMISSIONS_POLICY;
        iframe.loading = 'lazy';
        iframe.referrerPolicy = 'no-referrer';
        iframe.title = 'Linked web content preview';
        iframe.src = url;

        container.appendChild(iframe);
        container.appendChild(externalLink);
    }

    function bindPreviewLinks() {
        for (const link of queryAll<HTMLAnchorElement>(selectors.previewLink)) {
            on(link, 'click', (event) => {
                const previewShown = showPreview(link.href, link.closest<HTMLElement>(selectors.panel));
                if (!previewShown) return;

                event.preventDefault();
            });
        }
    }

    /**
     * Opens a URL in the preview popover and remembers which panel should regain focus.
     *
     * @param url URL loaded by the preview frame.
     * @param sourcePanel Panel containing the selected preview link.
     * @returns Whether the popover opened and replaced normal link navigation.
     */
    function showPreview(url: string, sourcePanel: HTMLElement | null) {
        if (typeof HTMLElement.prototype.showPopover !== 'function') return false;

        state.previewSourcePanel = sourcePanel;

        if (!state.previewPanel) {
            state.previewPanel = createPreviewPanel();
        }

        renderPreview(state.previewPanel, url);

        setActivePanel(state.previewPanel);
        state.zIndexMax += 1;
        state.previewPanel.style.zIndex = String(state.zIndexMax);

        state.previewPanel.removeEventListener('beforetoggle', restorePreviewSource);
        on(state.previewPanel, 'beforetoggle', restorePreviewSource);

        try {
            state.previewPanel.showPopover();
            return true;
        } catch (error) {
            console.warn('The linked preview could not be opened.', error);
            removePreviewPanel();
            reactivatePreviewSource();
            return false;
        }
    }

    function restorePreviewSource(event: ToggleEvent) {
        if (event.newState !== 'closed') return;

        removePreviewPanel();
        reactivatePreviewSource();
    }

    /** Removes a preview that closed normally or failed before it became visible. */
    function removePreviewPanel() {
        if (!state.previewPanel) return;

        state.previewPanel.removeEventListener('beforetoggle', restorePreviewSource);
        state.previewPanel.remove();
        state.previewPanel = null;
    }

    /** Restores exactly one source panel after either preview closure or opening failure. */
    function reactivatePreviewSource() {
        const sourcePanel = state.previewSourcePanel;
        state.previewSourcePanel = null;

        if (sourcePanel) {
            setActivePanel(sourcePanel);
        }
    }

    function bindDesktopPanelFocus() {
        for (const panel of getInteractivePanels()) {
            on(panel, 'pointerdown', (event) => {
                if (state.isMobile) return;
                if (!(event.target instanceof Element)) return;
                if (event.target.closest<HTMLElement>(selectors.terminalHeader)) return;
                focusPanel(panel);
            });
        }
    }

    /**
     * Shows abbreviation titles on tap, since touch screens have no hover. Tapping uses `click`
     * rather than `touchstart` so a swipe that starts on an abbreviation still scrolls the page.
     */
    function bindMobileTooltips() {
        for (const abbr of queryAll('abbr[title]')) {
            let dismissOnOutsidePress: ((event: PointerEvent) => void) | null = null;
            let tooltip: HTMLDivElement | null = null;
            let dismissTimeout = 0;

            const dismissTooltip = () => {
                if (dismissTimeout !== 0) {
                    cancelLater(dismissTimeout);
                    dismissTimeout = 0;
                }

                if (dismissOnOutsidePress) {
                    document.removeEventListener('pointerdown', dismissOnOutsidePress);
                    dismissOnOutsidePress = null;
                }

                if (tooltip) {
                    tooltip.remove();
                    tooltip = null;
                }
            };

            on(abbr, 'click', (event) => {
                if (!state.isMobile) return;

                dismissTooltip();

                tooltip = createTooltip(abbr.getAttribute('title')!);
                positionTooltip(tooltip, abbr, event.clientX);

                dismissTimeout = later(dismissTooltip, TOOLTIP_DISMISS_MS);

                dismissOnOutsidePress = (outsideEvent) => {
                    if (outsideEvent.target instanceof Node && abbr.contains(outsideEvent.target)) return;

                    dismissTooltip();
                };

                on(document, 'pointerdown', dismissOnOutsidePress, { passive: true });
            });

            state.tooltipDismissers.push(dismissTooltip);
        }
    }

    /** Removes every transient touch tooltip when the responsive mode changes. */
    function dismissMobileTooltips() {
        for (const dismissTooltip of state.tooltipDismissers) {
            dismissTooltip();
        }
    }

    /** Creates the tooltip used for abbreviations on touch-sized screens. */
    function createTooltip(text: string) {
        const tooltip = document.createElement('div');
        tooltip.textContent = text;

        Object.assign(tooltip.style, {
            backgroundColor: 'var(--text-color)',
            borderRadius: '0.25rem',
            boxShadow: '0.0625rem 0.0625rem 0.3125rem 0rem var(--shadow-color)',
            color: 'var(--bg-color)',
            fontSize: '0.75rem',
            maxWidth: 'min(16rem, 80vw)',
            opacity: '0',
            overflowWrap: 'break-word',
            padding: '0.125rem 0.25rem',
            pointerEvents: 'none',
            position: 'absolute',
            transition: 'opacity 0.2s ease-in-out',
            transform: 'translateX(0)',
            whiteSpace: 'normal',
            zIndex: '100',
        });

        document.body.appendChild(tooltip);

        return tooltip;
    }

    /**
     * Positions a tooltip near its trigger while keeping it inside the viewport.
     *
     * Placement is worked out in viewport coordinates, then converted to document coordinates
     * once, because the tooltip is absolutely positioned on the body.
     *
     * @param tooltip Tooltip to move.
     * @param target Abbreviation that opened the tooltip.
     * @param touchX Horizontal viewport coordinate of the user's tap.
     */
    function positionTooltip(tooltip: HTMLElement, target: HTMLElement, touchX: number) {
        const rect = target.getBoundingClientRect();
        const tooltipRect = tooltip.getBoundingClientRect();
        const viewportPadding = 8;

        // Touch users often hide the trigger with their finger. Aligning to the tapped side keeps
        // the tooltip readable without requiring a second interaction.
        const preferredLeft = touchX < window.innerWidth / 2 ? rect.left : rect.right - tooltipRect.width;
        const left = clamp(preferredLeft, viewportPadding, window.innerWidth - tooltipRect.width - viewportPadding);

        let top = rect.top - tooltipRect.height - viewportPadding;
        if (top < viewportPadding) {
            top = rect.bottom + viewportPadding;
        }

        tooltip.style.left = `${left + window.scrollX}px`;
        tooltip.style.top = `${top + window.scrollY}px`;
        tooltip.style.opacity = '1';
    }

    /** Focuses the panel named by the current fragment, if the fragment names a panel. */
    function focusPanelFromHash() {
        const requestedPanel = document.getElementById(window.location.hash.slice(1));
        if (!requestedPanel) return false;
        if (!requestedPanel.matches(selectors.panel)) return false;
        if (requestedPanel.id === 'preview') return false;

        focusPanel(requestedPanel);
        return true;
    }

    function bindLocationRouting() {
        on(window, 'hashchange', focusPanelFromHash);
    }

    function init() {
        state.container = queryRequired(selectors.panelsContainer);
        refreshZIndexMax();
        bindLayoutMeasurements();
        bindPanelResizes();
        bindPreviewLinks();
        bindReferenceLinks();
        bindMobileTooltips();
        bindDesktopPanelFocus();
        bindDragging();
        bindPageLifecycle();
        bindLocationRouting();

        panels.focusHandler = (id) => focusPanel(document.getElementById(id));

        const welcomePanel = document.getElementById('welcome');
        if (!focusPanelFromHash() && welcomePanel) {
            setActivePanel(welcomePanel);
        }
    }

    init();
    return () => {
        controller.abort();
        suspendPage();
        removePreviewPanel();
        panels.focusHandler = null;
        panels.active = null;
        for (const id of timeouts) window.clearTimeout(id);
    };
}
