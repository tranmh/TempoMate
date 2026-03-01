/**
 * TimingMethod - Base class / interface for all timing methods.
 *
 * Each timing method implements specific rules for how time counts,
 * what happens on turn start/end, and when time expires.
 */

export class TimingMethod {
  /**
   * @param {object} config - Period-specific configuration
   * @param {number} [config.timeMs] - Main time in milliseconds
   * @param {number} [config.delayMs] - Delay or bonus time per move
   * @param {number} [config.movesRequired] - Moves required to complete period (0 = until time expires)
   * @param {number} [config.byoMoments] - Number of byo-yomi moments
   * @param {number} [config.byoTimeMs] - Time per byo-yomi moment
   */
  constructor(config) {
    this.config = config || {};
  }

  /**
   * Called when a player's turn begins.
   * @param {import('../state/PlayerState.js').PlayerState} playerState
   */
  onTurnStart(playerState) {
    // Override in subclasses
  }

  /**
   * Called each timer tick while this player's clock is running.
   * @param {number} deltaMs - Time elapsed since last tick
   * @param {import('../state/PlayerState.js').PlayerState} playerState
   * @returns {{ expired: boolean, remainingMs: number }} Result of the tick
   */
  onTick(deltaMs, playerState) {
    // Override in subclasses
    return { expired: false, remainingMs: playerState.timeMs };
  }

  /**
   * Called when a player's turn ends (they pressed the clock).
   * @param {import('../state/PlayerState.js').PlayerState} playerState
   */
  onTurnEnd(playerState) {
    // Override in subclasses
  }

  /**
   * Check if the player's time has expired.
   * @param {import('../state/PlayerState.js').PlayerState} playerState
   * @returns {boolean}
   */
  isExpired(playerState) {
    return playerState.timeMs <= 0;
  }

  /**
   * Get the display time for this player.
   * @param {import('../state/PlayerState.js').PlayerState} playerState
   * @returns {number} Time in milliseconds to display
   */
  getDisplayTime(playerState) {
    return Math.max(0, playerState.timeMs);
  }

  /**
   * Get the timing method type identifier.
   * @returns {string}
   */
  getType() {
    return 'TIME';
  }
}
