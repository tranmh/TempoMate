import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { PlayerState } from '../../src/js/state/PlayerState.js';
import { FlagState, Player } from '../../src/js/utils/constants.js';

describe('PlayerState', () => {
  describe('constructor defaults', () => {
    it('left player defaults to white', () => {
      const p = new PlayerState(Player.LEFT);
      expect(p.side).toBe('left');
      expect(p.color).toBe('white');
    });

    it('right player defaults to black', () => {
      const p = new PlayerState(Player.RIGHT);
      expect(p.color).toBe('black');
    });

    it('starts with zeroed state and no flag', () => {
      const p = new PlayerState(Player.LEFT);
      expect(p.timeMs).toBe(0);
      expect(p.currentPeriod).toBe(0);
      expect(p.moves).toBe(0);
      expect(p.flagState).toBe(FlagState.NONE);
      expect(p.flagSetTime).toBeNull();
      expect(p.hasStarted).toBe(false);
    });
  });

  describe('init()', () => {
    it('applies the period configuration', () => {
      const p = new PlayerState(Player.LEFT);
      p.init({ timeMs: 300000, byoMoments: 5, byoTimeMs: 30000 });
      expect(p.timeMs).toBe(300000);
      expect(p.byoMomentsRemaining).toBe(5);
      expect(p.byoMomentTimeMs).toBe(30000);
    });

    it('defaults missing values to 0 (?? 0)', () => {
      const p = new PlayerState(Player.LEFT);
      p.init({});
      expect(p.timeMs).toBe(0);
      expect(p.byoMomentsRemaining).toBe(0);
      expect(p.byoMomentTimeMs).toBe(0);
    });

    it('treats null like undefined but keeps an explicit 0', () => {
      const p = new PlayerState(Player.LEFT);
      p.init({ timeMs: null, byoMoments: null, byoTimeMs: 0 });
      expect(p.timeMs).toBe(0);
      expect(p.byoMomentsRemaining).toBe(0);
      expect(p.byoMomentTimeMs).toBe(0);
    });

    it('resets the in-game state of a previously used player', () => {
      const p = new PlayerState(Player.RIGHT);
      p.timeMs = 1;
      p.currentPeriod = 2;
      p.moves = 40;
      p.flagState = FlagState.BLINKING;
      p.flagSetTime = 123;
      p.delayRemainingMs = 500;
      p.inDelay = true;
      p.turnStartTimeMs = 999;
      p.hasStarted = true;

      p.init({ timeMs: 60000 });

      expect(p.timeMs).toBe(60000);
      expect(p.currentPeriod).toBe(0);
      expect(p.moves).toBe(0);
      expect(p.flagState).toBe(FlagState.NONE);
      expect(p.flagSetTime).toBeNull();
      expect(p.delayRemainingMs).toBe(0);
      expect(p.inDelay).toBe(false);
      expect(p.turnStartTimeMs).toBe(0);
      expect(p.hasStarted).toBe(false);
    });

    it('does not change the color assignment', () => {
      const p = new PlayerState(Player.LEFT);
      p.swapColor();
      p.init({ timeMs: 1000 });
      expect(p.color).toBe('black');
    });
  });

  describe('setFlag() / clearFlag()', () => {
    let nowSpy;
    beforeEach(() => {
      nowSpy = jest.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);
    });
    afterEach(() => nowSpy.mockRestore());

    it('setFlag records the state and the current timestamp', () => {
      const p = new PlayerState(Player.LEFT);
      p.setFlag(FlagState.BLINKING);
      expect(p.flagState).toBe(FlagState.BLINKING);
      expect(p.flagSetTime).toBe(1_700_000_000_000);
    });

    it('setFlag with non-blinking state', () => {
      const p = new PlayerState(Player.LEFT);
      p.setFlag(FlagState.NON_BLINKING);
      expect(p.flagState).toBe(FlagState.NON_BLINKING);
    });

    it('clearFlag resets state and timestamp', () => {
      const p = new PlayerState(Player.LEFT);
      p.setFlag(FlagState.BLINKING);
      p.clearFlag();
      expect(p.flagState).toBe(FlagState.NONE);
      expect(p.flagSetTime).toBeNull();
    });
  });

  describe('swapColor()', () => {
    it('toggles white <-> black', () => {
      const p = new PlayerState(Player.LEFT);
      p.swapColor();
      expect(p.color).toBe('black');
      p.swapColor();
      expect(p.color).toBe('white');
    });
  });

  describe('snapshot() / restore()', () => {
    function populated() {
      const p = new PlayerState(Player.LEFT);
      p.timeMs = 123456;
      p.currentPeriod = 1;
      p.moves = 41;
      p.flagState = FlagState.NON_BLINKING;
      p.flagSetTime = 42;
      p.color = 'black';
      p.delayRemainingMs = 1500;
      p.inDelay = true;
      p.turnStartTimeMs = 130000;
      p.byoMomentsRemaining = 3;
      p.byoMomentTimeMs = 30000;
      p.hasStarted = true;
      return p;
    }

    it('round trips all fields', () => {
      const source = populated();
      const snap = source.snapshot();
      const target = new PlayerState(Player.LEFT);
      target.restore(snap);
      expect(target.snapshot()).toEqual(snap);
    });

    it('snapshot is a detached copy', () => {
      const p = populated();
      const snap = p.snapshot();
      p.timeMs = 0;
      p.moves = 0;
      expect(snap.timeMs).toBe(123456);
      expect(snap.moves).toBe(41);
    });

    it('restoring a snapshot undoes later changes', () => {
      const p = populated();
      const snap = p.snapshot();
      p.timeMs = 1;
      p.setFlag(FlagState.BLINKING);
      p.swapColor();
      p.restore(snap);
      expect(p.timeMs).toBe(123456);
      expect(p.flagState).toBe(FlagState.NON_BLINKING);
      expect(p.flagSetTime).toBe(42);
      expect(p.color).toBe('black');
    });

    it('does not change the side', () => {
      const p = new PlayerState(Player.RIGHT);
      p.restore(populated().snapshot());
      expect(p.side).toBe('right');
    });

    it('defaults missing flagSetTime and turnStartTimeMs (older snapshots)', () => {
      const snap = populated().snapshot();
      delete snap.flagSetTime;
      delete snap.turnStartTimeMs;
      const p = new PlayerState(Player.LEFT);
      p.restore(snap);
      expect(p.flagSetTime).toBeNull();
      expect(p.turnStartTimeMs).toBe(0);
    });

    it('ignores unknown fields (no prototype pollution / stale data)', () => {
      const snap = { ...populated().snapshot(), evil: 'x', side: 'right' };
      const p = new PlayerState(Player.LEFT);
      p.restore(snap);
      expect(p.evil).toBeUndefined();
      expect(p.side).toBe('left');
    });
  });
});
