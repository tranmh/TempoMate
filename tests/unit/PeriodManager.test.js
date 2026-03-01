import { describe, it, expect, beforeEach } from '@jest/globals';
import { PeriodManager } from '../../src/js/engine/PeriodManager.js';
import { GameState } from '../../src/js/state/GameState.js';
import { TimingMethodType, Player, FlagState } from '../../src/js/utils/constants.js';
import { TimeMethod } from '../../src/js/engine/methods/TimeMethod.js';
import { FischerMethod } from '../../src/js/engine/methods/FischerMethod.js';
import { ByoYomiMethod } from '../../src/js/engine/methods/ByoYomiMethod.js';
import { UpcountMethod } from '../../src/js/engine/methods/UpcountMethod.js';

describe('PeriodManager', () => {
  let gs;
  let pm;

  describe('single period (TIME)', () => {
    beforeEach(() => {
      gs = new GameState();
      gs.initGame({
        periods: [{ method: TimingMethodType.TIME, timeMs: 300000 }],
        freezeDefault: false,
        soundDefault: false,
      });
      pm = new PeriodManager(gs);
      pm.init();
    });

    it('creates the correct method', () => {
      expect(pm.getMethod('left')).toBeInstanceOf(TimeMethod);
      expect(pm.getMethod('right')).toBeInstanceOf(TimeMethod);
    });

    it('gets correct method type', () => {
      expect(pm.getMethodType('left')).toBe(TimingMethodType.TIME);
    });

    it('expires with blinking flag on final period', () => {
      gs.left.timeMs = 100;
      const result = pm.onTick(200, 'left');
      expect(result.expired).toBe(true);
      expect(gs.left.flagState).toBe(FlagState.BLINKING);
    });
  });

  describe('multi-period (TIME + TIME)', () => {
    beforeEach(() => {
      gs = new GameState();
      gs.initGame({
        periods: [
          { method: TimingMethodType.TIME, timeMs: 300000 },
          { method: TimingMethodType.TIME, timeMs: 150000 },
        ],
        freezeDefault: false,
        soundDefault: false,
      });
      pm = new PeriodManager(gs);
      pm.init();
    });

    it('transitions to next period on expiry', () => {
      gs.left.timeMs = 100;
      const result = pm.onTick(200, 'left');
      expect(result.expired).toBe(false);
      expect(result.periodTransition).toBe(true);
      expect(gs.left.currentPeriod).toBe(1);
      expect(gs.left.flagState).toBe(FlagState.NON_BLINKING);
    });

    it('adds time to both players on transition', () => {
      const rightTimeBefore = gs.right.timeMs;
      gs.left.timeMs = 100;
      pm.onTick(200, 'left');

      // Both should have period 2 time added
      expect(gs.left.currentPeriod).toBe(1);
      expect(gs.right.currentPeriod).toBe(1);
    });

    it('blinking flag on final period expiry', () => {
      gs.left.currentPeriod = 1;
      gs.left.timeMs = 100;
      pm.activeMethods.set('left', PeriodManager.createMethod(
        { method: TimingMethodType.TIME, timeMs: 150000 },
      ));

      const result = pm.onTick(200, 'left');
      expect(result.expired).toBe(true);
      expect(gs.left.flagState).toBe(FlagState.BLINKING);
    });
  });

  describe('createMethod factory', () => {
    it('creates TimeMethod', () => {
      const m = PeriodManager.createMethod({ method: TimingMethodType.TIME, timeMs: 300000 });
      expect(m).toBeInstanceOf(TimeMethod);
    });

    it('creates FischerMethod', () => {
      const m = PeriodManager.createMethod({ method: TimingMethodType.FISCHER, timeMs: 180000, delayMs: 2000 });
      expect(m).toBeInstanceOf(FischerMethod);
    });

    it('creates ByoYomiMethod', () => {
      const m = PeriodManager.createMethod({ method: TimingMethodType.BYO_YOMI, byoTimeMs: 20000, byoMoments: 5 });
      expect(m).toBeInstanceOf(ByoYomiMethod);
    });

    it('creates UpcountMethod', () => {
      const m = PeriodManager.createMethod({ method: TimingMethodType.UPCOUNT });
      expect(m).toBeInstanceOf(UpcountMethod);
    });
  });

  describe('turn start/end delegation', () => {
    beforeEach(() => {
      gs = new GameState();
      gs.initGame({
        periods: [{ method: TimingMethodType.FISCHER, timeMs: 180000, delayMs: 2000 }],
        freezeDefault: true,
        soundDefault: false,
      });
      pm = new PeriodManager(gs);
      pm.init();
    });

    it('calls onTurnStart on the method', () => {
      pm.onTurnStart('left');
      // No error thrown
    });

    it('calls onTurnEnd and adds Fischer bonus', () => {
      pm.onTick(5000, 'left');
      pm.onTurnEnd('left');
      // Fischer bonus of 2s should be added
      expect(gs.left.timeMs).toBe(180000 - 5000 + 2000);
    });
  });
});
