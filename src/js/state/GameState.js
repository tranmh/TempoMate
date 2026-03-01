/**
 * GameState - Central game state management
 *
 * Manages the overall clock state, active player, timing configuration,
 * and coordinates between the timer engine and player states.
 */

import { GameStatus, Player, FlagState, TimingMethodType, Limits } from '../utils/constants.js';
import { PlayerState } from './PlayerState.js';

export class GameState {
  constructor() {
    /** @type {string} Current game status */
    this.status = GameStatus.IDLE;

    /** @type {string|null} Currently active player (whose clock is running) */
    this.activePlayer = null;

    /** @type {PlayerState} */
    this.left = new PlayerState(Player.LEFT);

    /** @type {PlayerState} */
    this.right = new PlayerState(Player.RIGHT);

    /** @type {number} Selected option number (1-30) */
    this.selectedOption = 1;

    /** @type {object|null} Full option configuration */
    this.optionConfig = null;

    /** @type {boolean} Whether freeze mode is active */
    this.freezeEnabled = false;

    /** @type {boolean} Whether sound is enabled */
    this.soundEnabled = false;

    /** @type {boolean} Whether the game has been started at least once */
    this.hasBeenStarted = false;

    /** @type {string|null} Status before entering correction mode */
    this._preCorrectionStatus = null;

    /** @type {Array<Function>} State change listeners */
    this._listeners = [];
  }

  /**
   * Subscribe to state changes.
   * @param {Function} listener - (gameState: GameState) => void
   * @returns {Function} Unsubscribe function
   */
  onChange(listener) {
    this._listeners.push(listener);
    return () => {
      this._listeners = this._listeners.filter((l) => l !== listener);
    };
  }

  /**
   * Notify all listeners of a state change.
   */
  notify() {
    for (const listener of this._listeners) {
      try {
        listener(this);
      } catch (e) {
        console.error('State listener error:', e);
      }
    }
  }

  /**
   * Get the PlayerState for a given side.
   * @param {string} side - Player.LEFT or Player.RIGHT
   * @returns {PlayerState}
   */
  getPlayer(side) {
    if (side === Player.LEFT) return this.left;
    if (side === Player.RIGHT) return this.right;
    throw new Error(`Invalid player side: ${side}`);
  }

  /**
   * Get the opponent's PlayerState.
   * @param {string} side - Player.LEFT or Player.RIGHT
   * @returns {PlayerState}
   */
  getOpponent(side) {
    return side === Player.LEFT ? this.right : this.left;
  }

  /**
   * Get the active PlayerState.
   * @returns {PlayerState|null}
   */
  getActivePlayerState() {
    if (!this.activePlayer) return null;
    return this.getPlayer(this.activePlayer);
  }

  /**
   * Initialize the game with an option configuration.
   * @param {object} config - Option configuration
   * @param {Array} config.periods - Array of period configurations
   * @param {boolean} [config.freezeDefault] - Default freeze setting
   * @param {boolean} [config.soundDefault] - Default sound setting
   * @param {number} [config.leftTimeMs] - Override left player time (for asymmetric)
   * @param {number} [config.rightTimeMs] - Override right player time (for asymmetric)
   */
  initGame(config) {
    this.optionConfig = config;
    this.status = GameStatus.IDLE;
    this.activePlayer = null;
    this.hasBeenStarted = false;

    // Set defaults based on config
    this.freezeEnabled = config.freezeDefault ?? false;
    this.soundEnabled = config.soundDefault ?? false;

    // Validate periods
    if (!config.periods || config.periods.length === 0) {
      throw new Error('Config must have at least one period');
    }

    // Initialize both players with first period
    const firstPeriod = config.periods[0];

    this.left.init({
      timeMs: config.leftTimeMs ?? firstPeriod.timeMs,
      delayMs: firstPeriod.delayMs,
      byoMoments: firstPeriod.byoMoments,
      byoTimeMs: firstPeriod.byoTimeMs,
    });

    this.right.init({
      timeMs: config.rightTimeMs ?? firstPeriod.timeMs,
      delayMs: firstPeriod.delayMs,
      byoMoments: firstPeriod.byoMoments,
      byoTimeMs: firstPeriod.byoTimeMs,
    });

    // Reset color assignments
    this.left.color = 'white';
    this.right.color = 'black';

    this.notify();
  }

  /**
   * Start the clock. The active player is determined by which side taps.
   * @param {string} side - The side that tapped (their opponent's clock starts)
   */
  startGame(side) {
    // The side that taps ends their turn => opponent's clock starts
    this.activePlayer = side === Player.LEFT ? Player.RIGHT : Player.LEFT;
    this.status = GameStatus.RUNNING;
    this.hasBeenStarted = true;

    // The player who taps first is white (white moves first in chess)
    this.getPlayer(side).color = 'white';
    this.getOpponent(side).color = 'black';

    this.notify();
  }

  /**
   * Switch turns (current active player tapped their clock).
   */
  switchTurn() {
    if (this.status !== GameStatus.RUNNING) return;

    const currentPlayer = this.getActivePlayerState();
    if (currentPlayer) {
      currentPlayer.moves++;
    }

    this.activePlayer = this.activePlayer === Player.LEFT ? Player.RIGHT : Player.LEFT;
    this.notify();
  }

  /**
   * Pause the clock.
   */
  pause() {
    if (this.status === GameStatus.RUNNING) {
      this.status = GameStatus.PAUSED;
      this.notify();
    }
  }

  /**
   * Resume the clock from pause.
   */
  resume() {
    if (this.status === GameStatus.PAUSED) {
      this.status = GameStatus.RUNNING;
      this.notify();
    }
  }

  /**
   * Toggle pause/resume.
   */
  togglePause() {
    if (this.status === GameStatus.RUNNING) {
      this.pause();
    } else if (this.status === GameStatus.PAUSED) {
      this.resume();
    }
  }

  /**
   * Freeze the clock (player lost on time).
   */
  freeze() {
    if (this.status === GameStatus.RUNNING || this.status === GameStatus.PAUSED) {
      this.status = GameStatus.FROZEN;
      this.notify();
    }
  }

  /**
   * Enter correction mode.
   */
  enterCorrectionMode() {
    if (this.status === GameStatus.PAUSED || this.status === GameStatus.FROZEN) {
      this._preCorrectionStatus = this.status;
      this.status = GameStatus.CORRECTING;
      this.notify();
    }
  }

  /**
   * Exit correction mode. Restores the status from before entering correction.
   */
  exitCorrectionMode() {
    if (this.status === GameStatus.CORRECTING) {
      this.status = this._preCorrectionStatus || GameStatus.PAUSED;
      this._preCorrectionStatus = null;
      this.notify();
    }
  }

  /**
   * Reset the game with the same configuration.
   */
  reset() {
    if (this.optionConfig) {
      this.initGame(this.optionConfig);
    }
  }

  /**
   * Toggle sound.
   */
  toggleSound() {
    this.soundEnabled = !this.soundEnabled;
    this.notify();
  }

  /**
   * Toggle freeze mode (only before first start).
   * @returns {boolean} Whether the toggle was applied
   */
  toggleFreeze() {
    if (!this.hasBeenStarted) {
      this.freezeEnabled = !this.freezeEnabled;
      this.notify();
      return true;
    }
    return false;
  }

  /**
   * Get the current period config for a player.
   * @param {string} side
   * @returns {object|null} Period configuration
   */
  getCurrentPeriodConfig(side) {
    if (!this.optionConfig) return null;
    const player = this.getPlayer(side);
    return this.optionConfig.periods[player.currentPeriod] || null;
  }

  /**
   * Check if a player is in their final period.
   * @param {string} side
   * @returns {boolean}
   */
  isInFinalPeriod(side) {
    if (!this.optionConfig) return true;
    const player = this.getPlayer(side);
    return player.currentPeriod >= this.optionConfig.periods.length - 1;
  }

  /**
   * Check if the game is in a playable state.
   * @returns {boolean}
   */
  isPlayable() {
    return this.status === GameStatus.RUNNING || this.status === GameStatus.IDLE;
  }
}
