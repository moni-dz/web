type Position = { x: number; y: number };
type PanelBounds = { minX: number; minY: number; maxX: number; maxY: number };

/**
 * Restricts a number to an inclusive range.
 *
 * @param {number} value
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
function clamp(value: number, min: number, max: number) {
    return Math.max(min, Math.min(max, value));
}

/**
 * Updates a stable position object so the drag hot path does not allocate on every frame.
 *
 * @param {{x: number, y: number}} target
 * @param {number} x
 * @param {number} y
 * @param {PanelBounds} bounds
 * @returns {{x: number, y: number}}
 */
export function boundPanelPosition(target: Position, x: number, y: number, bounds: PanelBounds) {
    if (!Number.isFinite(x)) throw new TypeError('Panel x position must be finite.');
    if (!Number.isFinite(y)) throw new TypeError('Panel y position must be finite.');
    if (bounds.minX > bounds.maxX) throw new RangeError('Panel x bounds are inverted.');
    if (bounds.minY > bounds.maxY) throw new RangeError('Panel y bounds are inverted.');

    target.x = clamp(x, bounds.minX, bounds.maxX);
    target.y = clamp(y, bounds.minY, bounds.maxY);
    return target;
}

export function initWindowManager() {
    const controller = new AbortController();
    const timeouts = new Set<number>();
    type Events = GlobalEventHandlersEventMap & WindowEventMap & MediaQueryListEventMap;
    function on<K extends keyof Events>(target: EventTarget, type: K,
        listener: (event: Events[K]) => void, options: AddEventListenerOptions = {}) {
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

    const MOBILE_QUERY = '(max-width: 31.25rem)';
    const RESIZE_DEBOUNCE_MS = 100;
    const HIGHLIGHT_MS = 2000;
    const TOOLTIP_DISMISS_MS = 3000;
    const SWIPE_THRESHOLD_PX = 50;
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
        deviceMessage: '.device-specific-message',
        nav: 'nav',
        navLink: 'nav a[data-panel]',
        panel: '.panel',
        panelToggle: '.panel-toggle',
        panelsContainer: '.panels-container',
        previewContainer: '.preview-container',
        previewHeading: '.preview-heading',
        previewLink: 'a[data-preview="true"]',
        tab: '.terminal-tab',
        tabButton: '.tab-button',
        tabGroup: '.terminal-tabs',
        terminalHeader: '.terminal-header',
        terminalWindow: '.terminal-window',
    };

    const state = {
        containerRect: null as DOMRect | null,
        drag: {
            captureTarget: null as HTMLElement | null,
            frame: 0,
            isActive: false,
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
        resizeTimeout: 0,
        tooltipDismissers: [] as (() => void)[],
        zIndexMax: 0,
    };

    /**
     * Finds one required element and reports a clear error if the HTML is out of sync with the JS.
     *
     * @param {string} selector CSS selector to search for.
     * @param {Document | Element} [root=document] Element whose descendants should be searched.
     * @returns {Element}
     */
    function queryRequired<T extends HTMLElement = HTMLElement>(selector: string, root: Document | Element = document) {
        const element = root.querySelector<T>(selector);
        if (element) return element;

        throw new Error(`Missing required element: ${selector}`);
    }

    /**
     * Returns a real array so callers can safely use array helpers such as filter and reduce.
     *
     * @param {string} selector CSS selector to search for.
     * @param {Document | Element} [root=document] Element whose descendants should be searched.
     * @returns {Element[]}
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

    /**
     * Reads a panel's stacking order from either its inline style or the stylesheet.
     *
     * @param {Element} panel
     * @returns {number}
     */
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
     * Calculates the coordinates a panel may occupy without leaving the visible panel area.
     *
     * @param {Element} panel
     * @returns {PanelBounds}
     */
    function getPanelBounds(panel: HTMLElement) {
        const panelRect = panel.getBoundingClientRect();
        const containerRect = state.containerRect!;

        // Dragging writes transforms relative to the panels container. Keeping bounds in the same
        // coordinate system avoids subtle offsets when the fixed nav changes height on mobile.
        return {
            maxX: Math.max(0, containerRect.width - panelRect.width),
            maxY: Math.max(0, containerRect.height - panelRect.height),
            minX: 0,
            minY: 0,
        };
    }

    function refreshLayoutMeasurements() {
        const container = queryRequired(selectors.panelsContainer);
        const nav = queryRequired(selectors.nav);

        state.containerRect = container.getBoundingClientRect();
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
     *
     * @param {HTMLElement} panel
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
        state.isMobile = state.mobileQuery!.matches;
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
     * Switches the interaction model when the CSS breakpoint changes.
     *
     * @param {MediaQueryListEvent} event
     */
    function updateResponsiveMode(event: MediaQueryListEvent) {
        setResponsiveMode(event.matches);
    }

    /**
     * Applies one responsive mode without duplicating page-lifetime event listeners.
     *
     * @param {boolean} isMobile
     */
    function setResponsiveMode(isMobile: boolean) {
        if (state.isMobile === isMobile) return;

        state.isMobile = isMobile;
        stopDrag();
        dismissMobileTooltips();

        if (state.isMobile) {
            resetPanelPositions();
        }

        setDeviceMessages();
        refreshLayoutMeasurements();
    }

    function setActivePanel(panel: HTMLElement) {
        for (const candidate of getPanels()) {
            const isActive = candidate === panel;
            candidate.classList.toggle('active', isActive);

            const toggle = candidate.querySelector<HTMLButtonElement>(selectors.panelToggle);
            toggle?.setAttribute('aria-expanded', String(isActive));
        }

        if (panel.id && panel.id !== 'preview') {
            updateNavLinks(panel.id);
        }
    }

    /** Collapses every panel, leaving none active. Mobile-only accordion state. */
    function collapseAllPanels() {
        for (const candidate of getPanels()) {
            candidate.classList.remove('active');

            const toggle = candidate.querySelector<HTMLButtonElement>(selectors.panelToggle);
            toggle?.setAttribute('aria-expanded', 'false');
        }
    }

    function focusPanel(panel: HTMLElement | null) {
        if (!panel) return;

        if (state.isMobile) {
            setActivePanel(panel);
            scrollPanelIntoMobileView(panel);
            return;
        }

        if (!panel.classList.contains('active')) {
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
            behavior: 'smooth',
            top,
        });
    }

    function updateNavLinks(activeId: string) {
        for (const link of queryAll(selectors.navLink)) {
            const isActive = link.dataset.panel === activeId;

            link.classList.toggle('active-link', isActive);

            if (isActive) {
                link.setAttribute('aria-current', 'page');
            } else {
                link.removeAttribute('aria-current');
            }
        }
    }

    function bindNavLinks() {
        for (const link of queryAll(selectors.navLink)) {
            on(link, 'click', (event) => {
                event.preventDefault();

                const targetId = link.dataset.panel!;
                const targetPanel = document.getElementById(targetId);
                if (!targetPanel) return;

                focusPanel(targetPanel);
                window.history.replaceState(null, '', `#${targetId}`);
            });
        }
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
                    behavior: 'smooth',
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

    /** @param {PageTransitionEvent} event */
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
     * Starts dragging an active panel from its title bar.
     *
     * Pointer events cover mouse, pen, and touch with one shared code path.
     *
     * @param {PointerEvent} event
     */
    function startDrag(event: PointerEvent) {
        if (state.isMobile || event.button !== 0) return;
        if (!event.isPrimary) return;
        if (state.drag.isActive) return;
        if (!(event.target instanceof Element)) return;

        const panel = event.target.closest<HTMLElement>(selectors.panel);
        const header = event.target.closest<HTMLElement>(selectors.terminalHeader);

        if (!panel) return;
        if (!header) return;
        if (panel.id === 'preview') return;

        if (!panel.classList.contains('active')) {
            focusPanel(panel);
            return;
        }

        const container = queryRequired(selectors.panelsContainer);
        const panelRect = panel.getBoundingClientRect();

        // The resize debounce may still be pending when a user immediately begins a new drag.
        // Reading the container here pairs the cached measurement with the panel's frozen box.
        state.containerRect = container.getBoundingClientRect();

        // Freeze the rendered box only for the active gesture. Responsive active/inactive widths
        // must take control again as soon as the pointer is released.
        panel.style.height = `${panelRect.height}px`;
        panel.style.width = `${panelRect.width}px`;
        state.panelBounds.set(panel, getPanelBounds(panel));
        state.drag.captureTarget = header;
        state.drag.isActive = true;
        state.drag.panel = panel;
        state.drag.pointerId = event.pointerId;
        state.drag.pointerX = event.clientX;
        state.drag.pointerY = event.clientY;
        state.drag.startX = event.clientX;
        state.drag.startY = event.clientY;
        state.drag.startPanelX = panelRect.left - state.containerRect.left;
        state.drag.startPanelY = panelRect.top - state.containerRect.top;

        panel.classList.add('dragging');

        // Pointer capture keeps the release event paired with this drag even when the pointer
        // leaves the title bar or viewport. The blur/pagehide handlers remain a second safety net.
        if (typeof header.setPointerCapture === 'function') {
            header.setPointerCapture(event.pointerId);
        }
    }

    /**
     * Saves the newest pointer position and limits visual updates to one per animation frame.
     *
     * @param {PointerEvent} event
     */
    function queueDrag(event: PointerEvent) {
        if (!state.drag.isActive) return;
        if (event.pointerId !== state.drag.pointerId) return;

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
        if (!state.drag.isActive) return;

        if (event) {
            if ('pointerId' in event && typeof event.pointerId === 'number') {
                if (event.pointerId !== state.drag.pointerId) return;
            }
        }

        if (state.drag.frame !== 0) {
            window.cancelAnimationFrame(state.drag.frame);
        }

        const captureTarget = state.drag.captureTarget;
        const panel = state.drag.panel;
        const pointerId = state.drag.pointerId;

        state.drag.captureTarget = null;
        state.drag.frame = 0;
        state.drag.isActive = false;
        state.drag.panel = null;
        state.drag.pointerId = null;

        if (panel) {
            panel.classList.remove('dragging');
            panel.style.removeProperty('height');
            panel.style.removeProperty('width');

            if (!state.isMobile) {
                refreshPanelMeasurements(panel);
            }
        }

        if (captureTarget) {
            if (pointerId !== null) {
                if (typeof captureTarget.hasPointerCapture === 'function') {
                    if (captureTarget.hasPointerCapture(pointerId)) {
                        captureTarget.releasePointerCapture(pointerId);
                    }
                }
            }
        }
    }

    /**
     * Moves a panel while keeping it inside its calculated bounds.
     *
     * @param {HTMLElement} panel Panel being moved.
     * @param {number} x Requested horizontal position.
     * @param {number} y Requested vertical position.
     * @param {PanelBounds} bounds Allowed movement area.
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

    /** Re-clamps moved panels after active/inactive width transitions reach their final size. */
    function bindPanelResizeTransitions() {
        for (const panel of getInteractivePanels()) {
            on(panel, 'transitionend', (event) => {
                if (event.propertyName !== 'width') return;
                if (!state.panelPositions.has(panel)) return;

                refreshPanelMeasurements(panel);
            });
        }
    }

    /**
     * Removes drag-only styles without disturbing z-index, which preserves the user's focus order.
     *
     * @param {HTMLElement} panel
     */
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
     * Builds the popover used to show linked images and web pages.
     *
     * @returns {HTMLDivElement}
     */
    function createPreviewPanel() {
        const panel = document.createElement('div');

        panel.className = 'panel';
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

        queryRequired(selectors.panelsContainer).appendChild(panel);

        return panel;
    }

    /**
     * Checks whether a URL points to a common browser-supported image format.
     *
     * @param {string} url
     * @returns {boolean}
     */
    function isImageUrl(url: string) {
        return IMAGE_FILE_PATTERN.test(new URL(url, window.location.href).pathname);
    }

    /**
     * Replaces the preview contents with either a naturally sized image or a full web frame.
     *
     * @param {HTMLDivElement} panel Preview panel.
     * @param {string} url URL selected by the visitor.
     */
    function renderPreview(panel: HTMLDivElement, url: string) {
        const container = queryRequired(selectors.previewContainer, panel);
        const heading = queryRequired(selectors.previewHeading, panel);
        const hint = state.isMobile
            ? 'tap outside to dismiss'
            : 'press Esc to dismiss or click outside';

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
     * @param {string} url URL loaded by the preview frame.
     * @param {Element | null} sourcePanel Panel containing the selected preview link.
     * @returns {boolean} Whether the popover opened and replaced normal link navigation.
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

    function bindTabs() {
        for (const panel of getPanels()) {
            const buttons = queryAll<HTMLButtonElement>(selectors.tabButton, panel);
            if (buttons.length === 0) continue;

            selectTab(panel, buttons[0].dataset.tab!);

            for (const button of buttons) {
                on(button, 'click', () => {
                    selectTab(panel, button.dataset.tab!);
                });
            }

            const tabGroup = queryRequired(selectors.tabGroup, panel);
            on(tabGroup, 'keydown', (event) => {
                switchTabWithKeyboard(event, panel);
            });
        }
    }

    /**
     * Implements the standard left/right arrow behavior for an accessible tab list.
     *
     * @param {KeyboardEvent} event
     * @param {Element} panel Panel that owns the tab list.
     */
    function switchTabWithKeyboard(event: KeyboardEvent, panel: HTMLElement) {
        if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
        event.preventDefault();

        const buttons = queryAll<HTMLButtonElement>(selectors.tabButton, panel);
        if (buttons.length === 0) return;

        const activeButton = panel.querySelector<HTMLButtonElement>(`${selectors.tabButton}.tab-active`)!;
        const activeIndex = buttons.indexOf(activeButton);
        if (activeIndex < 0) return;

        const direction = event.key === 'ArrowLeft' ? -1 : 1;
        const nextIndex = (activeIndex + direction + buttons.length) % buttons.length;

        selectTab(panel, buttons[nextIndex].dataset.tab!, true);
    }

    /**
     * Selects one tab and synchronizes its CSS classes with its accessibility attributes.
     *
     * @param {Element} panel Panel that owns the tabs.
     * @param {string} tabName Value from the tab button's data-tab attribute.
     * @param {boolean} [moveFocus=false] Whether keyboard focus should follow the selection.
     */
    function selectTab(panel: HTMLElement, tabName: string, moveFocus = false) {
        for (const button of queryAll<HTMLButtonElement>(selectors.tabButton, panel)) {
            const isSelected = button.dataset.tab! === tabName;

            button.classList.toggle('tab-active', isSelected);
            button.setAttribute('aria-selected', String(isSelected));
            button.setAttribute('tabindex', isSelected ? '0' : '-1');

            if (isSelected && moveFocus) {
                button.focus();
            }
        }

        for (const tab of queryAll(selectors.tab, panel)) {
            const isSelected = tab.id === `${panel.id}-${tabName}`;

            tab.classList.toggle('tab-active', isSelected);
            tab.hidden = !isSelected;
        }

        // Tab content can change panel dimensions, so drag bounds are refreshed after
        // layout settles.
        later(() => {
            if (panel.id !== 'preview') {
                refreshLayoutMeasurements();
            }
        }, RESIZE_DEBOUNCE_MS);
    }

    function bindSwipes() {
        for (const panel of getPanels()) {
            const tabGroup = panel.querySelector<HTMLElement>(selectors.tabGroup);
            if (!tabGroup) continue;

            let touchIsActive = false;
            let touchStartX = 0;

            on(panel, 'touchstart', (event) => {
                if (!state.isMobile) return;

                touchIsActive = true;
                touchStartX = event.touches[0].clientX;
            }, { passive: true });

            on(panel, 'touchend', (event) => {
                if (!touchIsActive) return;

                touchIsActive = false;
                if (!state.isMobile) return;

                const touchEndX = event.changedTouches[0].clientX;
                activateSwipedTab(tabGroup, touchEndX - touchStartX);
            }, { passive: true });
        }
    }

    function activateSwipedTab(tabGroup: HTMLElement, swipeDistance: number) {
        if (Math.abs(swipeDistance) < SWIPE_THRESHOLD_PX) return;

        const buttons = queryAll<HTMLButtonElement>(selectors.tabButton, tabGroup);
        const activeButton = tabGroup.querySelector<HTMLButtonElement>(`${selectors.tabButton}.tab-active`)!;
        const activeIndex = buttons.indexOf(activeButton);
        if (activeIndex < 0) return;

        const direction = swipeDistance > 0 ? -1 : 1;
        const nextIndex = (activeIndex + direction + buttons.length) % buttons.length;

        buttons[nextIndex].click();
    }

    /**
     * Chooses the text inserted into a device-specific message placeholder.
     *
     * @param {string} elementId Placeholder ID in the form "panel-message-number".
     * @returns {string}
     */
    function getDeviceMessage(elementId: string) {
        const [panelId, messageNumber] = elementId.split('-message-');
        const messages = state.isMobile ? mobileMessages : desktopMessages;

        return messages[panelId as keyof typeof messages]?.[messageNumber as "1"] ?? '';
    }

    const mobileMessages = {
        about: {
            1: 'try clicking the tabs or swiping left or right on this window to switch ' +
                'between them.',
            2: 'touch the image...',
        },
        welcome: {
            1: `on mobile you may tap a window's title to open it, tap it again to close it.
            toggle the theme by tapping the button at the end of the navigation links.`,
        },
    };

    const desktopMessages = {
        about: {
            1: 'try clicking or using the arrow keys to switch between tabs.',
            2: 'hover the image...',
        },
        welcome: {
            1: `on desktop or tablets you may click or touch the windows to bring them into focus.
            you may also drag the active window around by dragging its title bar.
            toggle the theme by clicking the button on the top right.`,
        },
    };

    function setDeviceMessages() {
        for (const message of queryAll(selectors.deviceMessage)) {
            message.textContent = getDeviceMessage(message.id);
        }
    }

    /** Wires the mobile accordion: tapping a panel's title opens it and collapses the rest. */
    function bindPanelToggles() {
        for (const panel of getInteractivePanels()) {
            const toggle = queryRequired<HTMLButtonElement>(selectors.panelToggle, panel);

            on(toggle, 'click', () => {
                if (!state.isMobile) return;

                if (panel.classList.contains('active')) {
                    collapseAllPanels();
                    return;
                }

                focusPanel(panel);
            });
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

    function bindMobileTooltips() {
        for (const abbr of queryAll('abbr[title]')) {
            let dismissOnOutsideTouch: ((event: TouchEvent) => void) | null = null;
            let tooltip: HTMLDivElement | null = null;
            let dismissTimeout = 0;

            const dismissTooltip = () => {
                if (dismissTimeout !== 0) {
                    cancelLater(dismissTimeout);
                    dismissTimeout = 0;
                }

                if (dismissOnOutsideTouch) {
                    document.removeEventListener('touchstart', dismissOnOutsideTouch);
                    dismissOnOutsideTouch = null;
                }

                if (tooltip) {
                    tooltip.remove();
                    tooltip = null;
                }
            };

            on(abbr, 'touchstart', (event) => {
                if (!state.isMobile) return;

                event.preventDefault();
                dismissTooltip();

                tooltip = createTooltip(abbr.getAttribute('title')!);
                positionTooltip(tooltip, abbr, event.touches[0].clientX);

                dismissTimeout = later(dismissTooltip, TOOLTIP_DISMISS_MS);

                dismissOnOutsideTouch = (outsideEvent) => {
                    if (outsideEvent.target instanceof Node && abbr.contains(outsideEvent.target)) return;

                    dismissTooltip();
                };

                on(document, 
                    'touchstart',
                    dismissOnOutsideTouch,
                    { passive: true }
                );
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

    /**
     * Creates the tooltip used for abbreviations on touch-sized screens.
     *
     * @param {string} text Tooltip text.
     * @returns {HTMLDivElement}
     */
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
     * @param {HTMLElement} tooltip Tooltip to move.
     * @param {Element} target Abbreviation that opened the tooltip.
     * @param {number} touchX Horizontal coordinate of the user's touch.
     */
    function positionTooltip(tooltip: HTMLElement, target: HTMLElement, touchX: number) {
        const rect = target.getBoundingClientRect();
        const tooltipRect = tooltip.getBoundingClientRect();
        const viewportPadding = 8;
        const viewportCenter = window.innerWidth / 2;

        let left = rect.left + (rect.width - tooltipRect.width) / 2;
        left = clamp(
            left,
            viewportPadding,
            window.innerWidth - tooltipRect.width - viewportPadding
        );

        // Touch users often hide the trigger with their finger. Biasing toward the touched side
        // keeps the tooltip readable without requiring a second interaction.
        if (touchX < viewportCenter) {
            left = Math.max(viewportPadding, rect.left + window.scrollX);
        } else {
            left = Math.min(
                window.innerWidth - tooltipRect.width - viewportPadding,
                rect.right + window.scrollX - tooltipRect.width
            );
        }

        let top = rect.top + window.scrollY - tooltipRect.height - 8;
        if (top < window.scrollY + viewportPadding) {
            top = rect.bottom + window.scrollY + 8;
        }

        tooltip.style.left = `${left}px`;
        tooltip.style.top = `${top}px`;
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
        refreshZIndexMax();
        bindLayoutMeasurements();
        bindNavLinks();
        bindPreviewLinks();
        bindReferenceLinks();
        bindTabs();
        setDeviceMessages();
        bindSwipes();
        bindPanelToggles();
        bindMobileTooltips();
        bindDesktopPanelFocus();
        bindDragging();
        bindPanelResizeTransitions();
        bindPageLifecycle();
        bindLocationRouting();

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
        for (const id of timeouts) window.clearTimeout(id);
    };
}
