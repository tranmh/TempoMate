/**
 * UpcountMethod - Upcount timing (used in Scrabble)
 *
 * Time counts UP from 0:00 instead of counting down.
 * Used to track overtime for penalty point calculation.
 * No configurable settings. Can only be set as the last period.
 */

import { TimingMethod } from '../TimingMethod.js';
import { TimingMethodType } from '../../utils/constants.js';

export class UpcountMethod extends TimingMethod {
  constructor(config) {
    super(config || {});
  }

  onTurnStart(playerState) {
    // No special action
  }

  onTick(deltaMs, playerState) {
    // Count UP instead of down
    playerState.timeMs += deltaMs;

    // Upcount never expires
    return { expired: false, remainingMs: playerState.timeMs };
  }

  onTurnEnd(playerState) {
    // No special action
  }

  isExpired(_playerState) {
    // Upcount never expires
    return false;
  }

  getDisplayTime(playerState) {
    return Math.max(0, playerState.timeMs);
  }

  getType() {
    return TimingMethodType.UPCOUNT;
  }
}
