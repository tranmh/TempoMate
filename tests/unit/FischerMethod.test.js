import { describe, it, expect, beforeEach } from '@jest/globals';
import { FischerMethod } from '../../src/js/engine/methods/FischerMethod.js';
import { PlayerState } from '../../src/js/state/PlayerState.js';
import { TimingMethodType } from '../../src/js/utils/constants.js';

describe('FischerMethod', () => {
  let method;
  let player;

  beforeEach(() => {
    method = new FischerMethod({ timeMs: 180000, delayMs: 2000 }); // 3 min + 2s bonus
    player = new PlayerState('left');
    player.init({ timeMs: 180000 });
  });

  it('returns correct type', () => {
    expect(method.getType()).toBe(TimingMethodType.FISCHER);
  });

  it('counts down on tick', () => {
    method.onTick(1000, player);
    expect(player.timeMs).toBe(179000);
  });

  it('adds bonus after turn end', () => {
    method.onTick(5000, player); // 5 seconds used
    expect(player.timeMs).toBe(175000);
    method.onTurnEnd(player);
    expect(player.timeMs).toBe(177000); // +2s bonus
  });

  it('allows time accumulation above starting time', () => {
    // Quick move: only 500ms used
    method.onTick(500, player);
    method.onTurnEnd(player);
    expect(player.timeMs).toBe(181500); // 180000 - 500 + 2000
  });

  it('expires when reaching zero', () => {
    player.timeMs = 100;
    const result = method.onTick(200, player);
    expect(result.expired).toBe(true);
    expect(player.timeMs).toBe(0);
  });

  describe('move-based period transitions', () => {
    it('reports period complete by moves when threshold reached', () => {
      const methodWithMoves = new FischerMethod({
        timeMs: 180000,
        delayMs: 2000,
        movesRequired: 40,
      });

      player.moves = 39;
      expect(methodWithMoves.isPeriodCompleteByMoves(player)).toBe(false);

      player.moves = 40;
      expect(methodWithMoves.isPeriodCompleteByMoves(player)).toBe(true);
    });

    it('does not report period complete when movesRequired is 0', () => {
      player.moves = 100;
      expect(method.isPeriodCompleteByMoves(player)).toBe(false);
    });
  });
});
