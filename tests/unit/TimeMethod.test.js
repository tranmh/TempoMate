import { describe, it, expect, beforeEach } from '@jest/globals';
import { TimeMethod } from '../../src/js/engine/methods/TimeMethod.js';
import { PlayerState } from '../../src/js/state/PlayerState.js';
import { TimingMethod } from '../../src/js/engine/TimingMethod.js';
import { TimingMethodType, Player } from '../../src/js/utils/constants.js';

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

describe('TimingMethod base config', () => {
  it('keeps the given config', () => {
    const config = { timeMs: 1000 };
    expect(new TimingMethod(config).config).toBe(config);
  });

  it('defaults to an empty config', () => {
    expect(new TimingMethod().config).toEqual({});
    expect(new TimingMethod(null).config).toEqual({});
  });
});

describe('PlayerState', () => {
  it('assigns white to the left player and black to the right player', () => {
    expect(new PlayerState(Player.LEFT).color).toBe('white');
    expect(new PlayerState(Player.RIGHT).color).toBe('black');
  });

  it('starts not in delay and not started', () => {
    const state = new PlayerState(Player.LEFT);
    expect(state.inDelay).toBe(false);
    expect(state.hasStarted).toBe(false);
  });

  it('init resets inDelay and hasStarted', () => {
    const state = new PlayerState(Player.LEFT);
    state.inDelay = true;
    state.hasStarted = true;
    state.init({ timeMs: 1000 });
    expect(state.inDelay).toBe(false);
    expect(state.hasStarted).toBe(false);
  });

  it('init sets byo-yomi moments from config, defaulting to 0', () => {
    const state = new PlayerState(Player.LEFT);
    state.init({ timeMs: 1000, byoMoments: 5 });
    expect(state.byoMomentsRemaining).toBe(5);
    state.init({ timeMs: 1000 });
    expect(state.byoMomentsRemaining).toBe(0);
  });
});
