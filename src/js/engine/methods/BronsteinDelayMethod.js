/**
 * BronsteinDelayMethod - Bronstein Delay timing
 *
 * Delay time is conceptually added to main time before the move.
 * If player uses less time than delay: clock resets to start-of-turn value.
 * If player uses more: only the delay amount is recovered.
 * Total time can NEVER exceed the amount at start of the move (no accumulation).
 * FREEZE is ON by default.
 */

import { TimingMethod } from '../TimingMethod.js';
import { TimingMethodType } from '../../utils/constants.js';

export class BronsteinDelayMethod extends TimingMethod {
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
    // Record time at start of turn
    playerState.turnStartTimeMs = playerState.timeMs;
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
    // Do not compensate if player has already expired
    if (playerState.timeMs <= 0) return;
    // Guard against uninitialized turnStartTimeMs
    if (playerState.turnStartTimeMs <= 0) return;

    // Calculate time used this turn
    const timeUsed = playerState.turnStartTimeMs - playerState.timeMs;

    // Add back the minimum of delay and time used
    const compensation = Math.min(this.delayMs, Math.max(0, timeUsed));
    playerState.timeMs += compensation;

    // Ensure time never exceeds start-of-turn value
    if (playerState.timeMs > playerState.turnStartTimeMs) {
      playerState.timeMs = playerState.turnStartTimeMs;
    }
  }

  isExpired(playerState) {
    return playerState.timeMs <= 0;
  }

  getType() {
    return TimingMethodType.DELAY;
  }
}
