import { describe, it, expect, beforeEach } from '@jest/globals';
import { UpcountMethod } from '../../src/js/engine/methods/UpcountMethod.js';
import { PlayerState } from '../../src/js/state/PlayerState.js';
import { TimingMethodType } from '../../src/js/utils/constants.js';

describe('UpcountMethod', () => {
  let method;
  let player;

  beforeEach(() => {
    method = new UpcountMethod();
    player = new PlayerState('left');
    player.init({ timeMs: 0 });
  });

  it('returns correct type', () => {
    expect(method.getType()).toBe(TimingMethodType.UPCOUNT);
  });

  it('counts UP', () => {
    method.onTick(1000, player);
    expect(player.timeMs).toBe(1000);
    method.onTick(5000, player);
    expect(player.timeMs).toBe(6000);
  });

  it('never expires', () => {
    player.timeMs = 999999;
    expect(method.isExpired(player)).toBe(false);

    const result = method.onTick(1000, player);
    expect(result.expired).toBe(false);
  });

  it('returns actual time for display', () => {
    player.timeMs = 12345;
    expect(method.getDisplayTime(player)).toBe(12345);
  });
});
