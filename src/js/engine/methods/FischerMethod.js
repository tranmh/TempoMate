/**
 * FischerMethod - Fischer Bonus timing
 *
 * A fixed bonus time is added AFTER each move (including the first move).
 * Players can accumulate time by playing faster than the bonus.
 * FIDE rules: clock freezes when reaching 0:00 in final period.
 * FREEZE is ON by default.
 */

import { TimingMethod } from '../TimingMethod.js';
import { TimingMethodType } from '../../utils/constants.js';

export class FischerMethod extends TimingMethod {
  /**
   * @param {object} config
   * @param {number} config.timeMs - Main time
   * @param {number} config.delayMs - Bonus time per move (Fischer increment)
   * @param {number} [config.movesRequired=0] - Moves to complete period (0 = until time expires)
   */
  constructor(config) {
    super(config);
    this.bonusMs = config.delayMs || 0;
    this.movesRequired = config.movesRequired || 0;
  }

  onTurnStart(playerState) {
    // Fischer bonus is added at the END of each move, not the start.
    // However, for the very first move of a period (FIDE rules),
    // the bonus is already included in the initial time setup.
    // The bonus for move N is added when move N ends (onTurnEnd).
  }

  onTick(deltaMs, playerState) {
    playerState.timeMs -= deltaMs;

    if (playerState.timeMs <= 0) {
      playerState.timeMs = 0;
      return { expired: true, remainingMs: 0 };
    }

    return { expired: false, remainingMs: playerState.timeMs };
  }

  onTurnEnd(playerState) {
    // Do not add bonus if player has already expired
    if (playerState.timeMs <= 0) return;
    // Add Fischer bonus after each move
    playerState.timeMs += this.bonusMs;
  }

  /**
   * Check if the period is complete based on move count.
   * @param {import('../../state/PlayerState.js').PlayerState} playerState
   * @returns {boolean} Whether the required moves have been completed
   */
  /**
   * Check if the period is complete based on move count.
   * @param {import('../../state/PlayerState.js').PlayerState} playerState
   * @param {number} [periodStartMoves=0] - Moves at start of this period
   * @returns {boolean} Whether the required moves have been completed
   */
  isPeriodCompleteByMoves(playerState, periodStartMoves = 0) {
    if (this.movesRequired <= 0) return false;
    return (playerState.moves - periodStartMoves) >= this.movesRequired;
  }

  isExpired(playerState) {
    return playerState.timeMs <= 0;
  }

  getType() {
    return TimingMethodType.FISCHER;
  }
}
