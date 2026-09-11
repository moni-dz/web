import { test, expect } from '@playwright/test';

import { boundPanelPosition, initWindowManager } from '../src/lib/window-manager.ts';
import { getPreferredTheme } from '../src/lib/theme.ts';
import { formatPostDate, getTagColorIndex } from '../src/lib/markdown.ts';

test('post dates accept YAML timestamps and tag colors stay stable', () => {
    expect(formatPostDate('2026-07-12')).toBe('July 12, 2026');
    expect(formatPostDate('2026-07-12T00:00:00.000Z')).toBe('July 12, 2026');
    for (const tag of ['javascript', 'markdown', 'web']) {
        expect(getTagColorIndex(tag)).toBe(getTagColorIndex(tag.toUpperCase()));
        expect(getTagColorIndex(tag)).toBeGreaterThanOrEqual(0);
        expect(getTagColorIndex(tag)).toBeLessThan(5);
    }
});

type PositionCase = {
    /** Expected bounded target coordinates. */
    expected: { x: number; y: number };
    /** Unbounded horizontal input coordinate. */
    x: number;
    /** Unbounded vertical input coordinate. */
    y: number;
};

test('browser entry points import under Node without touching the DOM', () => {
    expect(typeof initWindowManager).toBe('function');
    expect(typeof getPreferredTheme).toBe('function');
});

test('boundPanelPosition clamps both axes and preserves its stable target', () => {
    const bounds = { maxX: 100, maxY: 90, minX: 0, minY: 10 };

    const cases: PositionCase[] = [
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
        expect(result).toBe(target);
        expect(target).toEqual(test_case.expected);
    }
});

test('boundPanelPosition rejects non-finite positions and inverted bounds', () => {
    const target = { x: 0, y: 0 };
    const bounds = { maxX: 100, maxY: 100, minX: 0, minY: 0 };

    expect(() => boundPanelPosition(target, Number.NaN, 0, bounds)).toThrow(TypeError);
    expect(() => boundPanelPosition(target, 0, Number.POSITIVE_INFINITY, bounds)).toThrow(TypeError);
    expect(() => boundPanelPosition(target, 0, 0, { ...bounds, minX: 101 })).toThrow(RangeError);
    expect(() => boundPanelPosition(target, 0, 0, { ...bounds, minY: 101 })).toThrow(RangeError);
});
