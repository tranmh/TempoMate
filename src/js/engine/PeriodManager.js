/**
 * PeriodManager - Manages multi-period transitions
 *
 * Handles up to 4 periods per player. Manages transitions when time expires
 * or move count is reached. Handles the complex logic of:
 * - Adding next period time to both players on expiry
 * - Move-based transitions (per player independently)
 * - Bonus/delay difference calculations on transition
 * - Flag display logic
 */

import { FlagState, TimingMethodType } from '../utils/constants.js';
import { TimeMethod } from './methods/TimeMethod.js';
import { FischerMethod } from './methods/FischerMethod.js';
import { BronsteinDelayMethod } from './methods/BronsteinDelayMethod.js';
import { UsDelayMethod } from './methods/UsDelayMethod.js';
import { ByoYomiMethod } from './methods/ByoYomiMethod.js';
import { CanadianByoYomiMethod } from './methods/CanadianByoYomiMethod.js';
import { UpcountMethod } from './methods/UpcountMethod.js';

export class PeriodManager {
  /**
   * @param {import('../state/GameState.js').GameState} gameState
   */
  constructor(gameState) {
    this.gameState = gameState;

    /** @type {Map<string, import('./TimingMethod.js').TimingMethod>} Active timing method per player side */
    this.activeMethods = new Map();

    /** @type {number} Track moves at start of period for move-based transitions */
    this._periodStartMoves = { left: 0, right: 0 };
  }

  /**
   * Create a TimingMethod instance from a period configuration.
   * @param {object} periodConfig
   * @returns {import('./TimingMethod.js').TimingMethod}
   */
  static createMethod(periodConfig) {
    switch (periodConfig.method) {
      case TimingMethodType.TIME:
        return new TimeMethod(periodConfig);
      case TimingMethodType.FISCHER:
        return new FischerMethod(periodConfig);
      case TimingMethodType.DELAY:
        return new BronsteinDelayMethod(periodConfig);
      case TimingMethodType.US_DELAY:
        return new UsDelayMethod(periodConfig);
      case TimingMethodType.BYO_YOMI:
        return new ByoYomiMethod(periodConfig);
      case TimingMethodType.CANADIAN_BYO:
        return new CanadianByoYomiMethod(periodConfig);
      case TimingMethodType.UPCOUNT:
        return new UpcountMethod(periodConfig);
      default:
        return new TimeMethod(periodConfig);
    }
  }

  /**
   * Initialize timing methods for both players based on current game config.
   */
  init() {
    const config = this.gameState.optionConfig;
    if (!config || !config.periods || !config.periods.length) return;

    this.activeMethods.clear();
    const firstPeriod = config.periods[0];
    this.activeMethods.set('left', PeriodManager.createMethod(firstPeriod));
    this.activeMethods.set('right', PeriodManager.createMethod(firstPeriod));
    this._periodStartMoves = { left: 0, right: 0 };
  }

  /**
   * Get the active timing method for a player.
   * @param {string} side
   * @returns {import('./TimingMethod.js').TimingMethod|null}
   */
  getMethod(side) {
    return this.activeMethods.get(side) || null;
  }

  /**
   * Handle turn start for a player.
   * @param {string} side
   */
  onTurnStart(side) {
    const method = this.getMethod(side);
    const player = this.gameState.getPlayer(side);
    if (method && player) {
      method.onTurnStart(player);
    }
  }

  /**
   * Handle a timer tick for the active player.
   * @param {number} deltaMs
   * @param {string} side
   * @returns {{ expired: boolean, periodTransition: boolean }}
   */
  onTick(deltaMs, side) {
    const method = this.getMethod(side);
    const player = this.gameState.getPlayer(side);

    if (!method || !player) {
      return { expired: false, periodTransition: false };
    }

    const result = method.onTick(deltaMs, player);

    if (result.expired) {
      return this._handleExpiry(side);
    }

    // Check for move-based period transition (Fischer with movesRequired > 0)
    if (method instanceof FischerMethod && method.isPeriodCompleteByMoves(player, this._periodStartMoves[side] || 0)) {
      return this._transitionToNextPeriod(side, true);
    }

    return { expired: false, periodTransition: false };
  }

  /**
   * Handle turn end for a player.
   * @param {string} side
   */
  onTurnEnd(side) {
    const method = this.getMethod(side);
    const player = this.gameState.getPlayer(side);
    if (method && player) {
      method.onTurnEnd(player);
    }
  }

  /**
   * Handle time expiry for a player.
   * @param {string} side
   * @returns {{ expired: boolean, periodTransition: boolean }}
   */
  _handleExpiry(side) {
    const player = this.gameState.getPlayer(side);
    const isLastPeriod = this.gameState.isInFinalPeriod(side);

    if (isLastPeriod) {
      // Final period: blinking flag, game over (or freeze)
      player.setFlag(FlagState.BLINKING);
      return { expired: true, periodTransition: false };
    }

    // Non-final period: transition to next period
    return this._transitionToNextPeriod(side, false);
  }

  /**
   * Transition a player (or both) to the next period.
   * @param {string} side - The player transitioning
   * @param {boolean} moveBasedTransition - Whether this is a move-based transition
   * @returns {{ expired: boolean, periodTransition: boolean }}
   */
  _transitionToNextPeriod(side, moveBasedTransition) {
    const config = this.gameState.optionConfig;
    const player = this.gameState.getPlayer(side);
    const opponent = this.gameState.getOpponent(side);

    const currentPeriodIdx = player.currentPeriod;
    const nextPeriodIdx = currentPeriodIdx + 1;

    if (nextPeriodIdx >= config.periods.length) {
      // No more periods (shouldn't happen if isInFinalPeriod check worked)
      player.setFlag(FlagState.BLINKING);
      return { expired: true, periodTransition: false };
    }

    const currentPeriodConfig = config.periods[currentPeriodIdx];
    const nextPeriodConfig = config.periods[nextPeriodIdx];

    // Skip END markers
    if (nextPeriodConfig.method === TimingMethodType.END) {
      player.setFlag(FlagState.BLINKING);
      return { expired: true, periodTransition: false };
    }

    if (moveBasedTransition) {
      // Move-based: transition per player independently
      this._transitionPlayerToPeriod(side, nextPeriodIdx, currentPeriodConfig, nextPeriodConfig);
    } else {
      // Time-based: non-blinking flag, add time to BOTH players simultaneously
      player.setFlag(FlagState.NON_BLINKING);

      // Transition this player
      this._transitionPlayerToPeriod(side, nextPeriodIdx, currentPeriodConfig, nextPeriodConfig);

      // Also add time to opponent if they haven't transitioned yet
      if (opponent.currentPeriod === currentPeriodIdx) {
        this._transitionPlayerToPeriod(
          side === 'left' ? 'right' : 'left',
          nextPeriodIdx,
          currentPeriodConfig,
          nextPeriodConfig,
        );
      }
    }

    return { expired: false, periodTransition: true };
  }

  /**
   * Transition a single player to a new period.
   * @param {string} side
   * @param {number} periodIdx
   * @param {object} oldConfig
   * @param {object} newConfig
   */
  _transitionPlayerToPeriod(side, periodIdx, oldConfig, newConfig) {
    const player = this.gameState.getPlayer(side);

    // Update period index
    player.currentPeriod = periodIdx;

    // Handle time assignment based on the new method type
    const newMethod = newConfig.method;

    if (newMethod === TimingMethodType.BYO_YOMI) {
      // Byo-yomi: set up moments and reset time to byo time
      player.byoMomentsRemaining = newConfig.byoMoments || 0;
      player.byoMomentTimeMs = newConfig.byoTimeMs || 0;
      player.timeMs = newConfig.byoTimeMs || 0;
    } else if (newMethod === TimingMethodType.CANADIAN_BYO) {
      // Canadian byo-yomi: reset time to byo time
      player.timeMs = newConfig.byoTimeMs || 0;
    } else if (newMethod === TimingMethodType.UPCOUNT) {
      // Upcount: start counting up from zero
      player.timeMs = 0;
    } else {
      // TIME, FISCHER, DELAY, US_DELAY: add new period's main time
      player.timeMs += newConfig.timeMs || 0;
    }

    // Reset delay state for the new period
    player.delayRemainingMs = 0;
    player.inDelay = false;

    // Create new timing method instance
    this.activeMethods.set(side, PeriodManager.createMethod(newConfig));

    // Reset period start moves
    this._periodStartMoves[side] = player.moves;
  }

  /**
   * Get the current timing method type for a player.
   * @param {string} side
   * @returns {string}
   */
  getMethodType(side) {
    const method = this.getMethod(side);
    return method ? method.getType() : TimingMethodType.TIME;
  }

  /**
   * Trigger Canadian Byo-yomi reload for a player.
   * @param {string} side
   * @returns {boolean} Whether reload was performed
   */
  reloadCanadianByo(side) {
    const method = this.getMethod(side);
    const player = this.gameState.getPlayer(side);

    if (method instanceof CanadianByoYomiMethod) {
      method.reload(player);
      player.clearFlag();
      return true;
    }
    return false;
  }
}
