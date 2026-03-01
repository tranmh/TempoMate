import { describe, it, expect, beforeEach } from '@jest/globals';
import { TimeMethod } from '../../src/js/engine/methods/TimeMethod.js';
import { PlayerState } from '../../src/js/state/PlayerState.js';
import { TimingMethodType } from '../../src/js/utils/constants.js';

describe('TimeMethod', () => {
  let method;
  let player;

  beforeEach(() => {
    method = new TimeMethod({ timeMs: 300000 }); // 5 min
    player = new PlayerState('left');
    player.init({ timeMs: 300000 });
  });

  it('returns correct type', () => {
    expect(method.getType()).toBe(TimingMethodType.TIME);
  });

  it('counts down on tick', () => {
    const result = method.onTick(1000, player);
    expect(player.timeMs).toBe(299000);
    expect(result.expired).toBe(false);
    expect(result.remainingMs).toBe(299000);
  });

  it('expires when reaching zero', () => {
    player.timeMs = 500;
    const result = method.onTick(500, player);
    expect(player.timeMs).toBe(0);
    expect(result.expired).toBe(true);
  });

  it('expires when going below zero', () => {
    player.timeMs = 500;
    const result = method.onTick(1000, player);
    expect(player.timeMs).toBe(0);
    expect(result.expired).toBe(true);
  });

  it('does nothing on turn start or end', () => {
    const timeBefore = player.timeMs;
    method.onTurnStart(player);
    method.onTurnEnd(player);
    expect(player.timeMs).toBe(timeBefore);
  });

  it('isExpired returns true at zero', () => {
    player.timeMs = 0;
    expect(method.isExpired(player)).toBe(true);
  });

  it('isExpired returns false with time remaining', () => {
    expect(method.isExpired(player)).toBe(false);
  });
});
