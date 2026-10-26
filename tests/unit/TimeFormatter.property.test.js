import { test, expect } from '@jest/globals';
import fc from 'fast-check';
import { formatTime, formatTimeFull, parseTime } from '../../src/js/utils/TimeFormatter.js';

// Clock times up to 1000 hours, in whole milliseconds
const clockMs = fc.integer({ min: 0, max: 1000 * 3600 * 1000 });

test('formatTimeFull parseTime round trip', () => {
  fc.assert(fc.property(clockMs, (ms) => {
    expect(parseTime(formatTimeFull(ms))).toBe(Math.floor(ms / 1000) * 1000);
  }));
});

test('formatTime output keeps the display format', () => {
  fc.assert(fc.property(fc.double({ noNaN: true, min: -1e12, max: 1e12 }), fc.boolean(), (ms, showTenths) => {
    const s = formatTime(ms, showTenths);
    expect(s).toMatch(/^(\d+:\d{2}:\d{2}|\d{1,2}:\d{2}(\.\d)?)$/);
  }));
});
