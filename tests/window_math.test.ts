import { deepEqual, equal, strictEqual, throws } from 'node:assert/strict';
import test from 'node:test';

import { boundPanelPosition, getVisibleHeight, selectMostVisiblePanel, initWindowManager } from '../src/lib/window-manager.ts';
import { getPreferredTheme } from '../src/lib/theme.ts';
import { formatPostDate, getTagColorIndex } from '../src/lib/markdown.ts';

test('post dates accept YAML timestamps and tag colors stay stable', () => {
    equal(formatPostDate('2026-07-12'), 'July 12, 2026');
    equal(formatPostDate('2026-07-12T00:00:00.000Z'), 'July 12, 2026');
    for (const tag of ['javascript', 'markdown', 'web']) {
        equal(getTagColorIndex(tag), getTagColorIndex(tag.toUpperCase()));
        equal(getTagColorIndex(tag) >= 0 && getTagColorIndex(tag) < 5, true);
    }
});

/**
 * @typedef {object} PositionCase
 * @property {{x: number, y: number}} expected Expected bounded target coordinates.
 * @property {number} x Unbounded horizontal input coordinate.
 * @property {number} y Unbounded vertical input coordinate.
 */

/**
 * @typedef {object} VisibilityCase
 * @property {number} expected Expected intersection height in CSS pixels.
 * @property {{bottom: number, top: number}} rect Vertical panel bounds in viewport coordinates.
 */

test('browser entry points import under Node without touching the DOM', () => {
    equal(typeof initWindowManager, 'function');
    equal(typeof getPreferredTheme, 'function');
});

test('boundPanelPosition clamps both axes and preserves its stable target', () => {
    const bounds = { maxX: 100, maxY: 90, minX: 0, minY: 10 };

    /** @type {PositionCase[]} */
    const cases = [
        { expected: { x: 0, y: 90 }, x: -1, y: 91 },
        { expected: { x: 50, y: 50 }, x: 50, y: 50 },
        { expected: { x: 100, y: 10 }, x: 101, y: 9 },
        { expected: { x: 0, y: 90 }, x: 0, y: 90 },
    ];

    for (const test_case of cases) {
        const target = { x: 777, y: 777 };
        const result = boundPanelPosition(
            target,
            test_case.x,
            test_case.y,
            bounds,
        );

        // Identity matters because allocating a new point for every pointer frame creates avoidable
        // garbage-collector pressure in the drag hot path.
        strictEqual(result, target);
        deepEqual(target, test_case.expected);
    }
});

test('boundPanelPosition rejects non-finite positions and inverted bounds', () => {
    const target = { x: 0, y: 0 };
    const bounds = { maxX: 100, maxY: 100, minX: 0, minY: 0 };

    throws(() => { boundPanelPosition(target, Number.NaN, 0, bounds); }, TypeError);
    throws(() => { boundPanelPosition(target, 0, Number.POSITIVE_INFINITY, bounds); }, TypeError);
    throws(() => { boundPanelPosition(target, 0, 0, { ...bounds, minX: 101 }); }, RangeError);
    throws(() => { boundPanelPosition(target, 0, 0, { ...bounds, minY: 101 }); }, RangeError);
});

test('getVisibleHeight covers the positive and negative overlap spaces', () => {
    /** @type {VisibilityCase[]} */
    const cases = [
        { expected: 100, rect: { bottom: 250, top: 150 } },
        { expected: 50, rect: { bottom: 150, top: 50 } },
        { expected: 50, rect: { bottom: 350, top: 250 } },
        { expected: 200, rect: { bottom: 350, top: 50 } },
        { expected: 0, rect: { bottom: 100, top: 0 } },
        { expected: 0, rect: { bottom: 400, top: 300 } },
    ];

    for (const test_case of cases) {
        const result = getVisibleHeight(test_case.rect, 100, 300);
        equal(result, test_case.expected);
    }

    equal(getVisibleHeight({ bottom: 200, top: 100 }, 100, 100), 0);
    throws(() => { getVisibleHeight({ bottom: 0, top: 1 }, 100, 300); }, RangeError);
    throws(() => { getVisibleHeight({ bottom: 200, top: 100 }, 300, 100); }, RangeError);
});

test('selectMostVisiblePanel is deterministic for absence, dominance, and ties', () => {
    const first_panel = { id: 'first' };
    const second_panel = { id: 'second' };

    equal(selectMostVisiblePanel([]), null);
    equal(selectMostVisiblePanel([
        { centerDistance: 0, panel: first_panel, visibleHeight: 0 },
    ]), null);

    strictEqual(selectMostVisiblePanel([
        { centerDistance: 1, panel: first_panel, visibleHeight: 20 },
        { centerDistance: 100, panel: second_panel, visibleHeight: 21 },
    ]), second_panel);

    strictEqual(selectMostVisiblePanel([
        { centerDistance: 9, panel: first_panel, visibleHeight: 20 },
        { centerDistance: 8, panel: second_panel, visibleHeight: 20 },
    ]), second_panel);

    strictEqual(selectMostVisiblePanel([
        { centerDistance: 8, panel: first_panel, visibleHeight: 20 },
        { centerDistance: 8, panel: second_panel, visibleHeight: 20 },
    ]), first_panel);

    throws(() => selectMostVisiblePanel(null!), TypeError);
    throws(() => selectMostVisiblePanel([
        { centerDistance: 0, panel: first_panel, visibleHeight: -1 },
    ]), RangeError);
});
