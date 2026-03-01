import { describe, it, expect, beforeEach } from '@jest/globals';
import { CanadianByoYomiMethod } from '../../src/js/engine/methods/CanadianByoYomiMethod.js';
import { PlayerState } from '../../src/js/state/PlayerState.js';
import { TimingMethodType } from '../../src/js/utils/constants.js';

describe('CanadianByoYomiMethod', () => {
  let method;
  let player;

  beforeEach(() => {
    method = new CanadianByoYomiMethod({ byoTimeMs: 300000 }); // 5 min
    player = new PlayerState('left');
    player.init({ timeMs: 300000 });
  });

  it('returns correct type', () => {
    expect(method.getType()).toBe(TimingMethodType.CANADIAN_BYO);
  });

  it('counts down time', () => {
    method.onTick(5000, player);
    expect(player.timeMs).toBe(295000);
  });

  it('expires when reaching zero', () => {
    player.timeMs = 500;
    const result = method.onTick(1000, player);
    expect(result.expired).toBe(true);
    expect(player.timeMs).toBe(0);
  });

  it('tracks moves per period', () => {
    method.onTurnEnd(player);
    method.onTurnEnd(player);
    method.onTurnEnd(player);
    expect(method.getMovesInPeriod()).toBe(3);
  });

  it('reloads time and resets moves', () => {
    method.onTick(100000, player); // Use some time
    method.onTurnEnd(player);
    method.onTurnEnd(player);

    method.reload(player);
    expect(player.timeMs).toBe(300000); // Full time restored
    expect(method.getMovesInPeriod()).toBe(0);
  });

  it('can reload even at zero time', () => {
    player.timeMs = 0;
    method.reload(player);
    expect(player.timeMs).toBe(300000);
  });

  it('caps time at 9:59 max', () => {
    const cappedMethod = new CanadianByoYomiMethod({ byoTimeMs: 999000 });
    expect(cappedMethod.byoTimeMs).toBe(599000);
  });
});
