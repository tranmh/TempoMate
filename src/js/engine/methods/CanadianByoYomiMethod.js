/**
 * CanadianByoYomiMethod - Canadian Byo-yomi timing
 *
 * A fixed number of moves must be completed within the byo-yomi time.
 * Time resets when required moves are played (player must trigger reload).
 * Cannot save time by playing faster (time always resets to full).
 * Max byo-yomi time: 9:59.
 * Sound ON by default.
 */

import { TimingMethod } from '../TimingMethod.js';
import { TimingMethodType } from '../../utils/constants.js';

export class CanadianByoYomiMethod extends TimingMethod {
  /**
   * @param {object} config
   * @param {number} config.byoTimeMs - Total time for the move group (max 599000ms = 9:59)
   * @param {number} [config.movesRequired] - Number of moves required (determined by game rules, not set on clock)
   */
  constructor(config) {
    super(config);
    this.byoTimeMs = Math.min(config.byoTimeMs || 0, 599000);
    this.movesRequired = config.movesRequired || 0;
    /** @type {number} Moves made in current byo-yomi period */
    this._movesInPeriod = 0;
  }

  onTurnStart(playerState) {
    // No special action on turn start
  }

  onTick(deltaMs, playerState) {
    playerState.timeMs -= deltaMs;

    if (playerState.timeMs <= 0) {
      // Time expired - flag shown but reload still possible
      playerState.timeMs = 0;
      return { expired: true, remainingMs: 0 };
    }

    return { expired: false, remainingMs: playerState.timeMs };
  }

  onTurnEnd(playerState) {
    this._movesInPeriod++;
  }

  /**
   * Reload the byo-yomi time (triggered by 3-second hold on back button).
   * Resets time to full byo-yomi time and move counter.
   * @param {import('../../state/PlayerState.js').PlayerState} playerState
   */
  reload(playerState) {
    playerState.timeMs = this.byoTimeMs;
    this._movesInPeriod = 0;
  }

  /**
   * Get the number of moves made in the current byo-yomi period.
   * @returns {number}
   */
  getMovesInPeriod() {
    return this._movesInPeriod;
  }

  /**
   * Reset moves in period counter.
   */
  resetMovesInPeriod() {
    this._movesInPeriod = 0;
  }

  isExpired(playerState) {
    return playerState.timeMs <= 0;
  }

  getType() {
    return TimingMethodType.CANADIAN_BYO;
  }
}
