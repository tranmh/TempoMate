import { describe, it, expect, beforeEach } from '@jest/globals';
import { UsDelayMethod } from '../../src/js/engine/methods/UsDelayMethod.js';
import { PlayerState } from '../../src/js/state/PlayerState.js';
import { TimingMethodType } from '../../src/js/utils/constants.js';

describe('UsDelayMethod', () => {
  let method;
  let player;

  beforeEach(() => {
    method = new UsDelayMethod({ timeMs: 300000, delayMs: 5000 }); // 5 min + 5s delay
    player = new PlayerState('left');
    player.init({ timeMs: 300000 });
  });

  it('returns correct type', () => {
    expect(method.getType()).toBe(TimingMethodType.US_DELAY);
  });

  it('sets up delay on turn start', () => {
    method.onTurnStart(player);
    expect(player.delayRemainingMs).toBe(5000);
    expect(player.inDelay).toBe(true);
  });

  it('counts down delay before main time', () => {
    method.onTurnStart(player);
    method.onTick(2000, player);
    expect(player.delayRemainingMs).toBe(3000);
    expect(player.inDelay).toBe(true);
    expect(player.timeMs).toBe(300000); // Main time untouched
  });

  it('transitions to main time when delay expires', () => {
    method.onTurnStart(player);
    method.onTick(5000, player); // Exact delay
    expect(player.delayRemainingMs).toBe(0);
    expect(player.inDelay).toBe(false);
    expect(player.timeMs).toBe(300000); // Main time untouched
  });

  it('overflows into main time when delay is exceeded in one tick', () => {
    method.onTurnStart(player);
    method.onTick(7000, player); // 5s delay + 2s overflow
    expect(player.delayRemainingMs).toBe(0);
    expect(player.inDelay).toBe(false);
    expect(player.timeMs).toBe(298000); // Lost 2s of main time
  });

  it('counts down main time after delay', () => {
    method.onTurnStart(player);
    method.onTick(5000, player); // Exhaust delay
    method.onTick(3000, player); // 3s of main time
    expect(player.timeMs).toBe(297000);
  });

  it('clears delay state on turn end', () => {
    method.onTurnStart(player);
    method.onTick(2000, player);
    method.onTurnEnd(player);
    expect(player.inDelay).toBe(false);
    expect(player.delayRemainingMs).toBe(0);
  });

  it('expires when main time reaches zero', () => {
    method.onTurnStart(player);
    method.onTick(5000, player); // Exhaust delay
    player.timeMs = 500;
    const result = method.onTick(1000, player);
    expect(result.expired).toBe(true);
    expect(player.timeMs).toBe(0);
  });

  it('resets delay for each new turn', () => {
    method.onTurnStart(player);
    method.onTick(3000, player);
    method.onTurnEnd(player);

    // New turn
    method.onTurnStart(player);
    expect(player.delayRemainingMs).toBe(5000);
    expect(player.inDelay).toBe(true);
  });
});
