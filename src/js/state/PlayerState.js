/**
 * PlayerState - Per-player state for the clock
 *
 * Tracks remaining time, current period, move count, flag status,
 * and timing method state for a single player.
 */

import { FlagState, Player } from '../utils/constants.js';

export class PlayerState {
  /**
   * @param {string} side - Player.LEFT or Player.RIGHT
   */
  constructor(side) {
    /** @type {string} */
    this.side = side;

    /** @type {number} Remaining time in milliseconds */
    this.timeMs = 0;

    /** @type {number} Current period index (0-based) */
    this.currentPeriod = 0;

    /** @type {number} Move count */
    this.moves = 0;

    /** @type {string} Flag state */
    this.flagState = FlagState.NONE;

    /** @type {number|null} Timestamp when flag was set (for auto-hide after 5 min) */
    this.flagSetTime = null;

    /** @type {string} Color assignment: 'white' or 'black' */
    this.color = side === Player.LEFT ? 'white' : 'black';

    /** @type {number} Delay countdown remaining (for US-Delay display) */
    this.delayRemainingMs = 0;

    /** @type {boolean} Whether delay is currently counting (for US-Delay) */
    this.inDelay = false;

    /** @type {number} Time at the start of the current turn (for Bronstein) */
    this.turnStartTimeMs = 0;

    /** @type {number} Current byo-yomi moments remaining */
    this.byoMomentsRemaining = 0;

    /** @type {number} Time at start of current byo-yomi moment */
    this.byoMomentTimeMs = 0;

    /** @type {boolean} Whether player has started their first move */
    this.hasStarted = false;
  }

  /**
   * Initialize the player state with a time control configuration.
   * @param {object} periodConfig - Configuration for the initial period
   * @param {number} periodConfig.timeMs - Main time in milliseconds
   * @param {number} [periodConfig.delayMs] - Delay/bonus time per move
   * @param {number} [periodConfig.byoMoments] - Number of byo-yomi moments
   * @param {number} [periodConfig.byoTimeMs] - Time per byo-yomi moment
   */
  init(periodConfig) {
    this.timeMs = periodConfig.timeMs ?? 0;
    this.currentPeriod = 0;
    this.moves = 0;
    this.flagState = FlagState.NONE;
    this.flagSetTime = null;
    this.delayRemainingMs = 0;
    this.inDelay = false;
    this.turnStartTimeMs = 0;
    this.byoMomentsRemaining = periodConfig.byoMoments ?? 0;
    this.byoMomentTimeMs = periodConfig.byoTimeMs ?? 0;
    this.hasStarted = false;
  }

  /**
   * Reset flag state.
   */
  clearFlag() {
    this.flagState = FlagState.NONE;
    this.flagSetTime = null;
  }

  /**
   * Set a flag on this player.
   * @param {string} state - FlagState.BLINKING or FlagState.NON_BLINKING
   */
  setFlag(state) {
    this.flagState = state;
    this.flagSetTime = Date.now();
  }

  /**
   * Swap color assignment (used in correction mode).
   */
  swapColor() {
    this.color = this.color === 'white' ? 'black' : 'white';
  }

  /**
   * Create a snapshot of the current state (for undo/correction).
   * @returns {object}
   */
  snapshot() {
    return {
      timeMs: this.timeMs,
      currentPeriod: this.currentPeriod,
      moves: this.moves,
      flagState: this.flagState,
      flagSetTime: this.flagSetTime,
      color: this.color,
      delayRemainingMs: this.delayRemainingMs,
      inDelay: this.inDelay,
      turnStartTimeMs: this.turnStartTimeMs,
      byoMomentsRemaining: this.byoMomentsRemaining,
      byoMomentTimeMs: this.byoMomentTimeMs,
      hasStarted: this.hasStarted,
    };
  }

  /**
   * Restore from a snapshot.
   * @param {object} snap
   */
  restore(snap) {
    // Only restore known fields to prevent prototype pollution or stale data
    this.timeMs = snap.timeMs;
    this.currentPeriod = snap.currentPeriod;
    this.moves = snap.moves;
    this.flagState = snap.flagState;
    this.flagSetTime = snap.flagSetTime ?? null;
    this.color = snap.color;
    this.delayRemainingMs = snap.delayRemainingMs;
    this.inDelay = snap.inDelay;
    this.turnStartTimeMs = snap.turnStartTimeMs ?? 0;
    this.byoMomentsRemaining = snap.byoMomentsRemaining;
    this.byoMomentTimeMs = snap.byoMomentTimeMs;
    this.hasStarted = snap.hasStarted;
  }
}
