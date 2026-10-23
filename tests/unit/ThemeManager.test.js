import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { ThemeManager } from '../../src/js/ui/ThemeManager.js';
import { StorageKeys } from '../../src/js/utils/constants.js';

/** Fake MediaQueryList for prefers-color-scheme. */
function installMatchMedia(initialDark) {
  const listeners = new Set();
  const mql = {
    matches: initialDark,
    media: '(prefers-color-scheme: dark)',
    addEventListener: jest.fn((type, fn) => listeners.add(fn)),
    removeEventListener: jest.fn((type, fn) => listeners.delete(fn)),
  };
  window.matchMedia = jest.fn(() => mql);
  return {
    mql,
    listenerCount: () => listeners.size,
    setDark(dark) {
      mql.matches = dark;
      listeners.forEach((fn) => fn({ matches: dark }));
    },
  };
}

describe('ThemeManager', () => {
  let tm;
  let origMatchMedia;

  const theme = () => document.documentElement.getAttribute('data-theme');

  beforeEach(() => {
    origMatchMedia = window.matchMedia;
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });

  afterEach(() => {
    if (tm) tm.destroy();
    tm = null;
    if (origMatchMedia === undefined) delete window.matchMedia; else window.matchMedia = origMatchMedia;
  });

  it('defaults to auto when nothing is stored', () => {
    installMatchMedia(false);
    tm = new ThemeManager();
    expect(tm.getPreference()).toBe('auto');
  });

  it('loads a stored preference', () => {
    localStorage.setItem(StorageKeys.THEME, 'dark');
    installMatchMedia(false);
    tm = new ThemeManager();
    tm.init();
    expect(tm.getPreference()).toBe('dark');
    expect(theme()).toBe('dark');
  });

  it('falls back to auto for an invalid stored theme', () => {
    localStorage.setItem(StorageKeys.THEME, 'purple');
    installMatchMedia(true);
    tm = new ThemeManager();
    tm.init();
    expect(tm.getPreference()).toBe('auto');
    expect(theme()).toBe('dark');
  });

  it('auto follows the system preference (dark)', () => {
    installMatchMedia(true);
    tm = new ThemeManager();
    tm.init();
    expect(tm.getEffectiveTheme()).toBe('dark');
    expect(theme()).toBe('dark');
  });

  it('auto follows the system preference (light)', () => {
    installMatchMedia(false);
    tm = new ThemeManager();
    tm.init();
    expect(theme()).toBe('light');
  });

  it('re-applies when the system preference changes in auto mode', () => {
    const mm = installMatchMedia(false);
    tm = new ThemeManager();
    tm.init();
    mm.setDark(true);
    expect(theme()).toBe('dark');
    mm.setDark(false);
    expect(theme()).toBe('light');
  });

  it('an explicit preference ignores system changes', () => {
    const mm = installMatchMedia(false);
    tm = new ThemeManager();
    tm.init();
    tm.setPreference('light');
    mm.setDark(true);
    expect(theme()).toBe('light');
  });

  it('setPreference applies and persists the theme', () => {
    installMatchMedia(false);
    tm = new ThemeManager();
    tm.init();
    tm.setPreference('dark');
    expect(theme()).toBe('dark');
    expect(localStorage.getItem(StorageKeys.THEME)).toBe('dark');
    // persists across a new instance (reload)
    const tm2 = new ThemeManager();
    expect(tm2.getPreference()).toBe('dark');
  });

  it('cycle() goes auto -> light -> dark -> auto and persists each step', () => {
    installMatchMedia(true);
    tm = new ThemeManager();
    tm.init();
    expect(tm.cycle()).toBe('light');
    expect(theme()).toBe('light');
    expect(tm.cycle()).toBe('dark');
    expect(theme()).toBe('dark');
    expect(tm.cycle()).toBe('auto');
    expect(theme()).toBe('dark');
    expect(localStorage.getItem(StorageKeys.THEME)).toBe('auto');
  });

  it('auto resolves to light when matchMedia is unavailable', () => {
    delete window.matchMedia;
    tm = new ThemeManager();
    expect(() => tm.init()).not.toThrow();
    expect(theme()).toBe('light');
  });

  it('destroy() removes the system preference listener', () => {
    const mm = installMatchMedia(false);
    tm = new ThemeManager();
    tm.init();
    expect(mm.listenerCount()).toBe(1);
    tm.destroy();
    expect(mm.listenerCount()).toBe(0);
    mm.setDark(true);
    expect(theme()).toBe('light');
  });
});
