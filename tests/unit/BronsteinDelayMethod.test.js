import { describe, it, expect, beforeEach } from '@jest/globals';
import { BronsteinDelayMethod } from '../../src/js/engine/methods/BronsteinDelayMethod.js';
import { PlayerState } from '../../src/js/state/PlayerState.js';
import { TimingMethodType } from '../../src/js/utils/constants.js';

describe('BronsteinDelayMethod', () => {
  let method;
  let player;

  beforeEach(() => {
    method = new BronsteinDelayMethod({ timeMs: 1500000, delayMs: 10000 }); // 25 min + 10s delay
    player = new PlayerState('left');
    player.init({ timeMs: 1500000 });
  });

  it('returns correct type', () => {
    expect(method.getType()).toBe(TimingMethodType.DELAY);
  });

  it('records turn start time', () => {
    method.onTurnStart(player);
    expect(player.turnStartTimeMs).toBe(1500000);
  });

  it('compensates fully when move is faster than delay', () => {
    method.onTurnStart(player);
    method.onTick(5000, player); // 5s used, delay is 10s
    expect(player.timeMs).toBe(1495000);
    method.onTurnEnd(player);
    // Should compensate 5s (min of 5s used, 10s delay)
    expect(player.timeMs).toBe(1500000); // Fully restored
  });

  it('time never exceeds start-of-turn value', () => {
    method.onTurnStart(player);
    method.onTick(3000, player); // 3s used
    method.onTurnEnd(player);
    // Compensation = min(3000, 10000) = 3000
    // But result capped at turnStartTimeMs
    expect(player.timeMs).toBe(1500000);
  });

  it('only compensates up to delay when move is slower than delay', () => {
    method.onTurnStart(player);
    method.onTick(15000, player); // 15s used, delay is 10s
    expect(player.timeMs).toBe(1485000);
    method.onTurnEnd(player);
    // Compensation = min(15000, 10000) = 10000
    expect(player.timeMs).toBe(1495000); // Lost 5 seconds net
  });

  it('no accumulation above start-of-turn value', () => {
    method.onTurnStart(player);
    // Even with a very fast move, can't go above 1500000
    method.onTick(100, player);
    method.onTurnEnd(player);
    expect(player.timeMs).toBe(1500000);
    expect(player.timeMs).not.toBeGreaterThan(1500000);
  });

  it('expires when reaching zero', () => {
    player.timeMs = 500;
    method.onTurnStart(player);
    const result = method.onTick(600, player);
    expect(result.expired).toBe(true);
    expect(player.timeMs).toBe(0);
  });
});
