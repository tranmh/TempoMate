import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { RotationManager } from '../../src/js/ui/RotationManager.js';
import { StorageKeys } from '../../src/js/utils/constants.js';

function installMatchMedia({ portrait, narrow }) {
  window.matchMedia = jest.fn((query) => ({
    matches: query.includes('portrait') ? portrait : query.includes('max-width') ? narrow : false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
}

describe('RotationManager', () => {
  let appEl;
  let rm;
  let origMatchMedia;
  let hadOnTouchStart;

  beforeEach(() => {
    origMatchMedia = window.matchMedia;
    hadOnTouchStart = 'ontouchstart' in window;
    localStorage.clear();
    document.body.innerHTML = '<div id="app"></div>';
    appEl = document.getElementById('app');
    rm = new RotationManager();
  });

  afterEach(() => {
    if (origMatchMedia === undefined) delete window.matchMedia; else window.matchMedia = origMatchMedia;
    if (!hadOnTouchStart) delete window.ontouchstart;
  });

  it('is not rotated before init', () => {
    expect(rm.isRotated()).toBe(false);
  });

  it('applies a saved "rotated" preference', () => {
    localStorage.setItem(StorageKeys.ROTATION, 'true');
    installMatchMedia({ portrait: false, narrow: false });
    rm.init(appEl);
    expect(rm.isRotated()).toBe(true);
    expect(appEl.classList.contains('rotated')).toBe(true);
  });

  it('a saved "not rotated" preference wins over auto-detection', () => {
    localStorage.setItem(StorageKeys.ROTATION, 'false');
    window.ontouchstart = null;
    installMatchMedia({ portrait: true, narrow: true });
    rm.init(appEl);
    expect(rm.isRotated()).toBe(false);
    expect(appEl.classList.contains('rotated')).toBe(false);
  });

  it('auto-rotates on a narrow touch device in portrait', () => {
    window.ontouchstart = null;
    installMatchMedia({ portrait: true, narrow: true });
    rm.init(appEl);
    expect(rm.isRotated()).toBe(true);
    expect(appEl.classList.contains('rotated')).toBe(true);
  });

  it('does not auto-rotate on a touch device in landscape', () => {
    window.ontouchstart = null;
    installMatchMedia({ portrait: false, narrow: true });
    rm.init(appEl);
    expect(rm.isRotated()).toBe(false);
  });

  it('does not auto-rotate on a wide portrait screen', () => {
    window.ontouchstart = null;
    installMatchMedia({ portrait: true, narrow: false });
    rm.init(appEl);
    expect(rm.isRotated()).toBe(false);
  });

  it('toggle() flips the state, the class and persists it', () => {
    installMatchMedia({ portrait: false, narrow: false });
    rm.init(appEl);
    expect(rm.toggle()).toBe(true);
    expect(appEl.classList.contains('rotated')).toBe(true);
    expect(localStorage.getItem(StorageKeys.ROTATION)).toBe('true');
    expect(rm.toggle()).toBe(false);
    expect(appEl.classList.contains('rotated')).toBe(false);
    expect(localStorage.getItem(StorageKeys.ROTATION)).toBe('false');
  });

  it('the toggled preference survives a reload', () => {
    installMatchMedia({ portrait: false, narrow: false });
    rm.init(appEl);
    rm.toggle();
    const rm2 = new RotationManager();
    const el2 = document.createElement('div');
    rm2.init(el2);
    expect(rm2.isRotated()).toBe(true);
    expect(el2.classList.contains('rotated')).toBe(true);
  });

  it('toggle() before init does not throw', () => {
    expect(rm.toggle()).toBe(true);
  });
});
