import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { FlagIndicator } from '../../src/js/ui/FlagIndicator.js';
import { FlagState, Limits } from '../../src/js/utils/constants.js';

describe('FlagIndicator', () => {
  const NOW = 1_700_000_000_000;
  let leftEl;
  let rightEl;
  let fi;
  let nowSpy;

  const classes = (el) => ['flag-blinking', 'flag-solid', 'flag-hidden'].filter((c) => el.classList.contains(c));

  beforeEach(() => {
    nowSpy = jest.spyOn(Date, 'now').mockReturnValue(NOW);
    leftEl = document.createElement('div');
    rightEl = document.createElement('div');
    fi = new FlagIndicator(leftEl, rightEl);
  });

  afterEach(() => nowSpy.mockRestore());

  it('blinking flag for an expired final period', () => {
    fi.update('left', FlagState.BLINKING, NOW);
    expect(classes(leftEl)).toEqual(['flag-blinking']);
    expect(leftEl.getAttribute('aria-label')).toBe('Time expired - flag');
    expect(classes(rightEl)).toEqual([]);
  });

  it('solid (non-blinking) flag for an expired non-final period', () => {
    fi.update('right', FlagState.NON_BLINKING, NOW - 1000);
    expect(classes(rightEl)).toEqual(['flag-solid']);
    expect(rightEl.getAttribute('aria-label')).toBe('Period expired - flag');
  });

  it('non-blinking flag is still shown at exactly 5 minutes', () => {
    fi.update('left', FlagState.NON_BLINKING, NOW - Limits.FLAG_DISPLAY_DURATION_MS);
    expect(classes(leftEl)).toEqual(['flag-solid']);
  });

  it('non-blinking flag auto-hides after 5 minutes', () => {
    fi.update('left', FlagState.NON_BLINKING, NOW - Limits.FLAG_DISPLAY_DURATION_MS - 1);
    expect(classes(leftEl)).toEqual(['flag-hidden']);
  });

  it('non-blinking flag without a timestamp stays visible', () => {
    fi.update('left', FlagState.NON_BLINKING, null);
    expect(classes(leftEl)).toEqual(['flag-solid']);
  });

  it('blinking flag never auto-hides', () => {
    fi.update('left', FlagState.BLINKING, NOW - 10 * Limits.FLAG_DISPLAY_DURATION_MS);
    expect(classes(leftEl)).toEqual(['flag-blinking']);
  });

  it('clearing the flag hides it and clears the label', () => {
    fi.update('left', FlagState.BLINKING, NOW);
    fi.update('left', FlagState.NONE, null);
    expect(classes(leftEl)).toEqual(['flag-hidden']);
    expect(leftEl.getAttribute('aria-label')).toBe('');
  });

  it('an unknown state is treated as no flag', () => {
    fi.update('right', 'weird', null);
    expect(classes(rightEl)).toEqual(['flag-hidden']);
  });

  it('switching state replaces the previous class', () => {
    fi.update('left', FlagState.NON_BLINKING, NOW);
    fi.update('left', FlagState.BLINKING, NOW);
    expect(classes(leftEl)).toEqual(['flag-blinking']);
  });

  it('does nothing when the element is missing (analog faces)', () => {
    const none = new FlagIndicator(null, null);
    expect(() => none.update('left', FlagState.BLINKING, NOW)).not.toThrow();
    expect(() => none.update('right', FlagState.NONE, null)).not.toThrow();
  });
});
