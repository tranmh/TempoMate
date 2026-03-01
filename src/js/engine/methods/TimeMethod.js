/**
 * TimeMethod - Guillotine / Sudden Death timing
 *
 * Simple countdown to zero. No bonus or delay per move.
 * When a player reaches 0:00, a flag appears.
 */

import { TimingMethod } from '../TimingMethod.js';
import { TimingMethodType } from '../../utils/constants.js';

export class TimeMethod extends TimingMethod {
  constructor(config) {
    super(config);
  }

  onTurnStart(playerState) {
    // No special action on turn start for simple time
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
    // No bonus or delay to apply
  }

  isExpired(playerState) {
    return playerState.timeMs <= 0;
  }

  getType() {
    return TimingMethodType.TIME;
  }
}
