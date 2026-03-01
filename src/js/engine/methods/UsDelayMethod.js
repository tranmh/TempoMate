/**
 * UsDelayMethod - US Delay timing
 *
 * At the start of each turn, a separate delay countdown runs first.
 * Main time does not count down until the delay reaches zero.
 * The delay countdown is shown in a separate display area.
 * Functionally identical outcome to Bronstein, but displayed differently.
 * FREEZE is OFF by default.
 */

import { TimingMethod } from '../TimingMethod.js';
import { TimingMethodType } from '../../utils/constants.js';

export class UsDelayMethod extends TimingMethod {
  /**
   * @param {object} config
   * @param {number} config.timeMs - Main time
   * @param {number} config.delayMs - Delay time per move
   */
  constructor(config) {
    super(config);
    this.delayMs = config.delayMs || 0;
  }

  onTurnStart(playerState) {
    // Reset delay countdown at start of each turn
    playerState.delayRemainingMs = this.delayMs;
    playerState.inDelay = true;
  }

  onTick(deltaMs, playerState) {
    if (playerState.inDelay) {
      // Delay phase: count down the delay first
      playerState.delayRemainingMs -= deltaMs;

      if (playerState.delayRemainingMs <= 0) {
        // Delay expired, remaining delta goes to main time
        const overflow = -playerState.delayRemainingMs;
        playerState.delayRemainingMs = 0;
        playerState.inDelay = false;

        // Apply overflow to main time
        if (overflow > 0) {
          playerState.timeMs -= overflow;
        }
      }
    } else {
      // Main time phase
      playerState.timeMs -= deltaMs;
    }

    if (playerState.timeMs <= 0) {
      playerState.timeMs = 0;
      return { expired: true, remainingMs: 0 };
    }

    return { expired: false, remainingMs: playerState.timeMs };
  }

  onTurnEnd(playerState) {
    // Clear delay state
    playerState.inDelay = false;
    playerState.delayRemainingMs = 0;
  }

  isExpired(playerState) {
    return playerState.timeMs <= 0;
  }

  getDisplayTime(playerState) {
    return Math.max(0, playerState.timeMs);
  }

  getType() {
    return TimingMethodType.US_DELAY;
  }
}
