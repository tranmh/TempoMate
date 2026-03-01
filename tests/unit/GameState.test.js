import { describe, it, expect, beforeEach } from '@jest/globals';
import { GameState } from '../../src/js/state/GameState.js';
import { GameStatus, Player, FlagState, TimingMethodType } from '../../src/js/utils/constants.js';

describe('GameState', () => {
  let gs;
  const basicConfig = {
    periods: [{ method: TimingMethodType.TIME, timeMs: 300000 }],
    freezeDefault: false,
    soundDefault: false,
  };

  beforeEach(() => {
    gs = new GameState();
  });

  describe('initialization', () => {
    it('starts in IDLE state', () => {
      expect(gs.status).toBe(GameStatus.IDLE);
      expect(gs.activePlayer).toBeNull();
    });

    it('initializes game with config', () => {
      gs.initGame(basicConfig);
      expect(gs.status).toBe(GameStatus.IDLE);
      expect(gs.left.timeMs).toBe(300000);
      expect(gs.right.timeMs).toBe(300000);
      expect(gs.freezeEnabled).toBe(false);
      expect(gs.soundEnabled).toBe(false);
    });

    it('supports asymmetric times', () => {
      gs.initGame({
        ...basicConfig,
        leftTimeMs: 300000,
        rightTimeMs: 240000,
      });
      expect(gs.left.timeMs).toBe(300000);
      expect(gs.right.timeMs).toBe(240000);
    });

    it('sets freeze/sound defaults from config', () => {
      gs.initGame({
        periods: [{ method: TimingMethodType.FISCHER, timeMs: 180000, delayMs: 2000 }],
        freezeDefault: true,
        soundDefault: true,
      });
      expect(gs.freezeEnabled).toBe(true);
      expect(gs.soundEnabled).toBe(true);
    });
  });

  describe('game flow', () => {
    beforeEach(() => {
      gs.initGame(basicConfig);
    });

    it('starts game from left side tap', () => {
      gs.startGame(Player.LEFT);
      expect(gs.status).toBe(GameStatus.RUNNING);
      expect(gs.activePlayer).toBe(Player.RIGHT);
      expect(gs.hasBeenStarted).toBe(true);
    });

    it('assigns white to the player who taps first (left taps)', () => {
      gs.startGame(Player.LEFT);
      expect(gs.left.color).toBe('white');
      expect(gs.right.color).toBe('black');
    });

    it('assigns white to the player who taps first (right taps)', () => {
      gs.startGame(Player.RIGHT);
      expect(gs.right.color).toBe('white');
      expect(gs.left.color).toBe('black');
    });

    it('starts game from right side tap', () => {
      gs.startGame(Player.RIGHT);
      expect(gs.status).toBe(GameStatus.RUNNING);
      expect(gs.activePlayer).toBe(Player.LEFT);
    });

    it('switches turns', () => {
      gs.startGame(Player.LEFT);
      expect(gs.activePlayer).toBe(Player.RIGHT);

      gs.switchTurn();
      expect(gs.activePlayer).toBe(Player.LEFT);
      expect(gs.right.moves).toBe(1);

      gs.switchTurn();
      expect(gs.activePlayer).toBe(Player.RIGHT);
      expect(gs.left.moves).toBe(1);
    });

    it('does not switch turn when not running', () => {
      gs.startGame(Player.LEFT);
      gs.pause();
      const active = gs.activePlayer;
      gs.switchTurn();
      expect(gs.activePlayer).toBe(active); // Unchanged
    });

    it('pauses and resumes', () => {
      gs.startGame(Player.LEFT);
      gs.pause();
      expect(gs.status).toBe(GameStatus.PAUSED);

      gs.resume();
      expect(gs.status).toBe(GameStatus.RUNNING);
    });

    it('toggles pause', () => {
      gs.startGame(Player.LEFT);
      gs.togglePause();
      expect(gs.status).toBe(GameStatus.PAUSED);
      gs.togglePause();
      expect(gs.status).toBe(GameStatus.RUNNING);
    });

    it('freezes the clock', () => {
      gs.startGame(Player.LEFT);
      gs.freeze();
      expect(gs.status).toBe(GameStatus.FROZEN);
    });
  });

  describe('correction mode', () => {
    beforeEach(() => {
      gs.initGame(basicConfig);
      gs.startGame(Player.LEFT);
      gs.pause();
    });

    it('enters correction mode from paused', () => {
      gs.enterCorrectionMode();
      expect(gs.status).toBe(GameStatus.CORRECTING);
    });

    it('exits correction mode to paused', () => {
      gs.enterCorrectionMode();
      gs.exitCorrectionMode();
      expect(gs.status).toBe(GameStatus.PAUSED);
    });

    it('cannot enter correction from running', () => {
      gs.resume();
      gs.enterCorrectionMode();
      expect(gs.status).toBe(GameStatus.RUNNING); // Unchanged
    });
  });

  describe('reset', () => {
    it('resets to initial state', () => {
      gs.initGame(basicConfig);
      gs.startGame(Player.LEFT);
      gs.left.timeMs = 100000;
      gs.right.timeMs = 200000;

      gs.reset();
      expect(gs.status).toBe(GameStatus.IDLE);
      expect(gs.left.timeMs).toBe(300000);
      expect(gs.right.timeMs).toBe(300000);
      expect(gs.activePlayer).toBeNull();
    });
  });

  describe('freeze toggle', () => {
    beforeEach(() => {
      gs.initGame(basicConfig);
    });

    it('toggles freeze before game start', () => {
      expect(gs.freezeEnabled).toBe(false);
      const toggled = gs.toggleFreeze();
      expect(toggled).toBe(true);
      expect(gs.freezeEnabled).toBe(true);
    });

    it('does not toggle freeze after game start', () => {
      gs.startGame(Player.LEFT);
      const toggled = gs.toggleFreeze();
      expect(toggled).toBe(false);
    });
  });

  describe('sound toggle', () => {
    it('toggles sound', () => {
      gs.initGame(basicConfig);
      expect(gs.soundEnabled).toBe(false);
      gs.toggleSound();
      expect(gs.soundEnabled).toBe(true);
      gs.toggleSound();
      expect(gs.soundEnabled).toBe(false);
    });
  });

  describe('state listeners', () => {
    it('notifies listeners on state changes', () => {
      let notified = false;
      gs.onChange(() => { notified = true; });
      gs.initGame(basicConfig);
      expect(notified).toBe(true);
    });

    it('unsubscribes listeners', () => {
      let count = 0;
      const unsub = gs.onChange(() => { count++; });
      gs.initGame(basicConfig);
      expect(count).toBe(1);

      unsub();
      gs.initGame(basicConfig);
      expect(count).toBe(1); // Not called again
    });
  });

  describe('helper methods', () => {
    beforeEach(() => {
      gs.initGame(basicConfig);
    });

    it('getPlayer returns correct player', () => {
      expect(gs.getPlayer(Player.LEFT)).toBe(gs.left);
      expect(gs.getPlayer(Player.RIGHT)).toBe(gs.right);
    });

    it('getOpponent returns correct opponent', () => {
      expect(gs.getOpponent(Player.LEFT)).toBe(gs.right);
      expect(gs.getOpponent(Player.RIGHT)).toBe(gs.left);
    });

    it('getActivePlayerState returns active player', () => {
      expect(gs.getActivePlayerState()).toBeNull();
      gs.startGame(Player.LEFT);
      expect(gs.getActivePlayerState()).toBe(gs.right);
    });

    it('isInFinalPeriod returns true for single period', () => {
      expect(gs.isInFinalPeriod(Player.LEFT)).toBe(true);
    });

    it('isInFinalPeriod returns false for first of multiple periods', () => {
      gs.initGame({
        periods: [
          { method: TimingMethodType.TIME, timeMs: 300000 },
          { method: TimingMethodType.TIME, timeMs: 150000 },
        ],
        freezeDefault: false,
        soundDefault: false,
      });
      expect(gs.isInFinalPeriod(Player.LEFT)).toBe(false);
    });
  });
});
