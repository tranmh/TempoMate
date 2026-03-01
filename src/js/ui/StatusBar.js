/**
 * StatusBar - Displays timing method, period, icons, option number
 *
 * Shows:
 * - Active timing method name per player
 * - Current period number per player
 * - Freeze icon (snowflake)
 * - Sound icon (musical note)
 * - Option number
 * - Play/Pause indicator
 */

import { GameStatus, TimingMethodType } from '../utils/constants.js';

export class StatusBar {
  /**
   * @param {HTMLElement} containerEl - Status bar container element
   */
  constructor(containerEl) {
    this._el = containerEl;
    this._messageText = null;

    // Create sub-elements
    this._leftMethodEl = null;
    this._rightMethodEl = null;
    this._leftPeriodEl = null;
    this._rightPeriodEl = null;
    this._freezeIconEl = null;
    this._soundIconEl = null;
    this._optionEl = null;
    this._moveEl = null;
    this._stateEl = null;
    this._delayEl = null;

    // Dirty-checking cache for update()
    this._prev = {};

    this._build();
  }

  _build() {
    this._el.innerHTML = '';
    this._el.classList.add('status-bar');

    // Left side info
    const leftInfo = document.createElement('div');
    leftInfo.className = 'status-left';
    this._leftMethodEl = document.createElement('span');
    this._leftMethodEl.className = 'status-method';
    this._leftPeriodEl = document.createElement('span');
    this._leftPeriodEl.className = 'status-period';
    leftInfo.appendChild(this._leftMethodEl);
    leftInfo.appendChild(this._leftPeriodEl);

    // Center info
    const centerInfo = document.createElement('div');
    centerInfo.className = 'status-center';
    this._freezeIconEl = document.createElement('span');
    this._freezeIconEl.className = 'status-icon freeze-icon';
    this._freezeIconEl.textContent = '\u2744'; // Snowflake
    this._freezeIconEl.title = 'Freeze mode';
    this._freezeIconEl.setAttribute('role', 'img');
    this._freezeIconEl.setAttribute('aria-label', 'Freeze mode enabled');
    this._soundIconEl = document.createElement('span');
    this._soundIconEl.className = 'status-icon sound-icon';
    this._soundIconEl.textContent = '\u266B'; // Musical note
    this._soundIconEl.title = 'Sound enabled';
    this._soundIconEl.setAttribute('role', 'img');
    this._soundIconEl.setAttribute('aria-label', 'Sound enabled');
    this._optionEl = document.createElement('span');
    this._optionEl.className = 'status-option';
    this._moveEl = document.createElement('span');
    this._moveEl.className = 'status-move';
    this._stateEl = document.createElement('span');
    this._stateEl.className = 'status-state';
    this._delayEl = document.createElement('span');
    this._delayEl.className = 'status-delay';

    centerInfo.appendChild(this._freezeIconEl);
    centerInfo.appendChild(this._soundIconEl);
    centerInfo.appendChild(this._optionEl);
    centerInfo.appendChild(this._moveEl);
    centerInfo.appendChild(this._stateEl);
    centerInfo.appendChild(this._delayEl);

    // Right side info
    const rightInfo = document.createElement('div');
    rightInfo.className = 'status-right';
    this._rightMethodEl = document.createElement('span');
    this._rightMethodEl.className = 'status-method';
    this._rightPeriodEl = document.createElement('span');
    this._rightPeriodEl.className = 'status-period';
    rightInfo.appendChild(this._rightPeriodEl);
    rightInfo.appendChild(this._rightMethodEl);

    this._el.appendChild(leftInfo);
    this._el.appendChild(centerInfo);
    this._el.appendChild(rightInfo);
  }

  /**
   * Show a temporary message in the center area.
   * @param {string} text
   */
  showMessage(text) {
    this._messageText = text;
    if (this._optionEl) this._optionEl.textContent = '';
    if (this._moveEl) this._moveEl.textContent = '';
    if (this._stateEl) this._stateEl.textContent = text;
    if (this._delayEl) this._delayEl.classList.add('hidden');
    this._freezeIconEl.classList.add('hidden');
    this._soundIconEl.classList.add('hidden');
  }

  /**
   * Clear any temporary message.
   */
  clearMessage() {
    this._messageText = null;
  }

  /**
   * Update the status bar display.
   * @param {object} state
   * @param {string} state.leftMethod - Left player timing method type
   * @param {string} state.rightMethod - Right player timing method type
   * @param {number} state.leftPeriod - Left player current period (0-based)
   * @param {number} state.rightPeriod - Right player current period (0-based)
   * @param {number} state.totalPeriods - Total periods in config
   * @param {boolean} state.freezeEnabled
   * @param {boolean} state.soundEnabled
   * @param {number} state.optionNumber
   * @param {number} state.moveNumber - Current chess move number
   * @param {string} state.gameStatus
   * @param {number} [state.delayRemainingMs] - US-Delay countdown remaining
   */
  update(state) {
    // If a temporary message is showing, don't overwrite it
    if (this._messageText) return;

    const p = this._prev;

    // Method names
    const leftMethod = state.leftMethod || '';
    if (leftMethod !== p.leftMethod) {
      this._leftMethodEl.textContent = leftMethod;
      p.leftMethod = leftMethod;
    }
    const rightMethod = state.rightMethod || '';
    if (rightMethod !== p.rightMethod) {
      this._rightMethodEl.textContent = rightMethod;
      p.rightMethod = rightMethod;
    }

    // Period numbers (1-based display)
    const showPeriods = state.totalPeriods > 1;
    const leftPeriodText = showPeriods ? `P${state.leftPeriod + 1}` : '';
    const rightPeriodText = showPeriods ? `P${state.rightPeriod + 1}` : '';
    if (leftPeriodText !== p.leftPeriodText) {
      this._leftPeriodEl.textContent = leftPeriodText;
      p.leftPeriodText = leftPeriodText;
    }
    if (rightPeriodText !== p.rightPeriodText) {
      this._rightPeriodEl.textContent = rightPeriodText;
      p.rightPeriodText = rightPeriodText;
    }

    // Icons
    if (state.freezeEnabled !== p.freezeEnabled) {
      this._freezeIconEl.classList.toggle('hidden', !state.freezeEnabled);
      p.freezeEnabled = state.freezeEnabled;
    }
    if (state.soundEnabled !== p.soundEnabled) {
      this._soundIconEl.classList.toggle('hidden', !state.soundEnabled);
      p.soundEnabled = state.soundEnabled;
    }

    // Option number
    if (state.optionNumber !== p.optionNumber) {
      this._optionEl.textContent = `#${String(state.optionNumber).padStart(2, '0')}`;
      p.optionNumber = state.optionNumber;
    }

    // Move number
    if (state.moveNumber !== p.moveNumber) {
      this._moveEl.textContent = state.moveNumber > 0 ? `M${state.moveNumber}` : '';
      p.moveNumber = state.moveNumber;
    }

    // Game state indicator
    if (state.gameStatus !== p.gameStatus) {
      const stateIcons = {
        [GameStatus.IDLE]: '\u25B6',     // Play triangle
        [GameStatus.RUNNING]: '\u25B6',
        [GameStatus.PAUSED]: '\u23F8',   // Pause
        [GameStatus.FROZEN]: '\u26A0',   // Warning
        [GameStatus.CORRECTING]: '\u270E', // Pencil
      };
      this._stateEl.textContent = stateIcons[state.gameStatus] || '';
      p.gameStatus = state.gameStatus;
    }

    // Delay display
    if (state.delayRemainingMs !== p.delayRemainingMs) {
      if (state.delayRemainingMs !== undefined && state.delayRemainingMs > 0) {
        const delaySec = (state.delayRemainingMs / 1000).toFixed(1);
        this._delayEl.textContent = `DLY ${delaySec}`;
        this._delayEl.classList.remove('hidden');
      } else {
        this._delayEl.classList.add('hidden');
      }
      p.delayRemainingMs = state.delayRemainingMs;
    }
  }
}
