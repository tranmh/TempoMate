import { describe, it, expect, beforeEach } from '@jest/globals';
import { ByoYomiMethod } from '../../src/js/engine/methods/ByoYomiMethod.js';
import { PlayerState } from '../../src/js/state/PlayerState.js';
import { TimingMethodType } from '../../src/js/utils/constants.js';

describe('ByoYomiMethod', () => {
  it('returns correct type', () => {
    const method = new ByoYomiMethod({ byoTimeMs: 20000, byoMoments: 1 });
    expect(method.getType()).toBe(TimingMethodType.BYO_YOMI);
  });

  describe('single moment (infinite repeating)', () => {
    let method;
    let player;

    beforeEach(() => {
      method = new ByoYomiMethod({ byoTimeMs: 20000, byoMoments: 0 });
      player = new PlayerState('left');
      player.init({ timeMs: 20000, byoMoments: 0 });
    });

    it('counts down time', () => {
      method.onTick(5000, player);
      expect(player.timeMs).toBe(15000);
    });

    it('reloads when time expires (infinite), accounting for overflow', () => {
      player.timeMs = 100;
      const result = method.onTick(200, player);
      expect(result.expired).toBe(false);
      expect(result.momentExpired).toBe(true);
      // Overflow of 100ms is carried into the new moment: 20000 - 100 = 19900
      expect(player.timeMs).toBe(19900);
    });

    it('never truly expires', () => {
      expect(method.isExpired(player)).toBe(false);
      player.timeMs = 0;
      expect(method.isExpired(player)).toBe(false); // Infinite never expires
    });

    it('resets to byo time on turn end if time remains', () => {
      method.onTurnStart(player);
      method.onTick(5000, player);
      expect(player.timeMs).toBe(15000);
      method.onTurnEnd(player);
      expect(player.timeMs).toBe(20000); // Reset to full moment time
    });
  });

  describe('multiple moments', () => {
    let method;
    let player;

    beforeEach(() => {
      method = new ByoYomiMethod({ byoTimeMs: 60000, byoMoments: 5 }); // 5 x 1min
      player = new PlayerState('left');
      player.init({ timeMs: 60000, byoMoments: 5 });
      player.byoMomentsRemaining = 5;
    });

    it('decrements moments when time expires, accounting for overflow', () => {
      player.timeMs = 100;
      const result = method.onTick(200, player);
      expect(result.momentExpired).toBe(true);
      expect(player.byoMomentsRemaining).toBe(4);
      // Overflow of 100ms is carried into the new moment: 60000 - 100 = 59900
      expect(player.timeMs).toBe(59900);
    });

    it('expires when all moments are used', () => {
      player.byoMomentsRemaining = 1;
      player.timeMs = 100;
      const result = method.onTick(200, player);
      expect(result.expired).toBe(true);
      expect(player.byoMomentsRemaining).toBe(0);
      expect(player.timeMs).toBe(0);
    });

    it('isExpired is true when no moments and no time', () => {
      player.byoMomentsRemaining = 0;
      player.timeMs = 0;
      expect(method.isExpired(player)).toBe(true);
    });
  });
});
