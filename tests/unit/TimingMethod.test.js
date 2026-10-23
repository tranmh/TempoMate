import { describe, it, expect, beforeEach } from '@jest/globals';
import { TimingMethod } from '../../src/js/engine/TimingMethod.js';
import { PlayerState } from '../../src/js/state/PlayerState.js';

describe('TimingMethod (base class)', () => {
  let method;
  let player;

  beforeEach(() => {
    method = new TimingMethod({ timeMs: 60000 });
    player = new PlayerState('left');
    player.init({ timeMs: 60000 });
  });

  it('stores the config, defaulting to an empty object', () => {
    expect(method.config).toEqual({ timeMs: 60000 });
    expect(new TimingMethod().config).toEqual({});
    expect(new TimingMethod(null).config).toEqual({});
  });

  it('reports TIME as its type', () => {
    expect(method.getType()).toBe('TIME');
  });

  describe('isExpired()', () => {
    it('is false with time remaining', () => {
      player.timeMs = 1;
      expect(method.isExpired(player)).toBe(false);
    });

    it('is true at exactly 0', () => {
      player.timeMs = 0;
      expect(method.isExpired(player)).toBe(true);
    });

    it('is true for negative time', () => {
      player.timeMs = -1;
      expect(method.isExpired(player)).toBe(true);
    });
  });

  describe('getDisplayTime()', () => {
    it('returns the remaining time', () => {
      player.timeMs = 12345;
      expect(method.getDisplayTime(player)).toBe(12345);
    });

    it('returns 0 at zero', () => {
      player.timeMs = 0;
      expect(method.getDisplayTime(player)).toBe(0);
    });

    it('displays negative time as 0', () => {
      player.timeMs = -500;
      expect(method.getDisplayTime(player)).toBe(0);
    });
  });

  describe('onTick()', () => {
    it('does not change the time and reports not expired', () => {
      const result = method.onTick(1000, player);
      expect(result).toEqual({ expired: false, remainingMs: 60000 });
      expect(player.timeMs).toBe(60000);
    });
  });

  describe('onTurnStart() / onTurnEnd()', () => {
    it('are no-ops in the base class', () => {
      const before = player.snapshot();
      method.onTurnStart(player);
      method.onTurnEnd(player);
      expect(player.snapshot()).toEqual(before);
    });
  });
});
