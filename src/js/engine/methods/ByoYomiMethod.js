/**
 * ByoYomiMethod - Japanese Byo-yomi timing
 *
 * Used primarily in Go and Shogi. Each player gets a fixed amount of time
 * per move in byo-yomi. If completed within time, clock resets to start value.
 * If time expires, a non-blinking flag is shown and byo-yomi reloads.
 *
 * Tournament variant: multiple byo-yomi periods (moments).
 * Display shows TOTAL remaining time (moments * timePerMoment).
 * Sound ON by default.
 */

import { TimingMethod } from '../TimingMethod.js';
import { TimingMethodType } from '../../utils/constants.js';

export class ByoYomiMethod extends TimingMethod {
  /**
   * @param {object} config
   * @param {number} config.byoTimeMs - Time per byo-yomi moment
   * @param {number} config.byoMoments - Number of byo-yomi moments (max 99, 0 = infinite repeating)
   */
  constructor(config) {
    super(config);
    this.byoTimeMs = config.byoTimeMs || 0;
    this.byoMoments = config.byoMoments || 0;
    /** @type {number} Moments remaining at the start of the current turn */
    this._momentsAtTurnStart = 0;
  }

  onTurnStart(playerState) {
    // Track moments at the start of turn for proper reset on turn end
    this._momentsAtTurnStart = playerState.byoMomentsRemaining;
  }

  onTick(deltaMs, playerState) {
    playerState.timeMs -= deltaMs;

    if (playerState.timeMs <= 0) {
      let momentExpired = false;

      if (this.byoMoments === 0) {
        // Infinite repeating: always reload, account for overflow
        const overflow = -playerState.timeMs;
        playerState.timeMs = this.byoTimeMs - overflow;
        if (playerState.timeMs <= 0) playerState.timeMs = 1; // Prevent immediate re-expiry
        return { expired: false, remainingMs: playerState.timeMs, momentExpired: true };
      }

      // Multiple moments: consume moments in a loop to handle large deltas
      while (playerState.timeMs <= 0 && playerState.byoMomentsRemaining > 0) {
        playerState.byoMomentsRemaining--;
        momentExpired = true;

        if (playerState.byoMomentsRemaining <= 0) {
          // All moments exhausted
          playerState.timeMs = 0;
          return { expired: true, remainingMs: 0 };
        }

        // Reload with overflow carried into next moment
        playerState.timeMs += this.byoTimeMs;
      }

      if (playerState.timeMs <= 0) {
        playerState.timeMs = 0;
        return { expired: true, remainingMs: 0 };
      }

      if (momentExpired) {
        return { expired: false, remainingMs: playerState.timeMs, momentExpired: true };
      }
    }

    return { expired: false, remainingMs: playerState.timeMs };
  }

  onTurnEnd(playerState) {
    // If the move was completed within time and no moments were consumed,
    // reset to the current moment's full time
    if (playerState.timeMs > 0) {
      const momentsConsumed = (this._momentsAtTurnStart || 0) -
        (this.byoMoments === 0 ? (this._momentsAtTurnStart || 0) : playerState.byoMomentsRemaining);
      if (momentsConsumed <= 0) {
        // No moments consumed during this turn — reset current moment time
        playerState.timeMs = this.byoTimeMs;
      }
      // If moments were consumed, keep the current remaining time
      // (player used part of a new moment, don't give it back)
    }
  }

  /**
   * Calculate the total display time based on remaining moments.
   * Display shows total time = moments * timePerMoment
   * @param {import('../../state/PlayerState.js').PlayerState} playerState
   * @returns {number}
   */
  _getTotalDisplayTime(playerState) {
    if (this.byoMoments === 0) {
      // Infinite: show single moment time
      return this.byoTimeMs;
    }
    // Show single moment time (moments count shown separately)
    return this.byoTimeMs;
  }

  getDisplayTime(playerState) {
    return Math.max(0, playerState.timeMs);
  }

  isExpired(playerState) {
    if (this.byoMoments === 0) return false; // Infinite never truly expires
    return playerState.timeMs <= 0 && playerState.byoMomentsRemaining <= 0;
  }

  getType() {
    return TimingMethodType.BYO_YOMI;
  }
}
