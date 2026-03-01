/**
 * CorrectionMode - Time correction / arbiter mode UI
 *
 * Allows editing:
 * - Time for both players (all digits)
 * - Move counts
 * - Period numbers
 * - Color swap (by changing right side moves independently)
 *
 * Navigation with arrow keys/buttons, adjustment with +/-.
 */

import { formatTimeFull } from '../utils/TimeFormatter.js';
import { GameStatus, Player } from '../utils/constants.js';

/**
 * Editable fields in correction mode.
 * Order: leftHours, leftMin, leftSec, rightHours, rightMin, rightSec,
 *        leftMoves, rightMoves, leftPeriod, rightPeriod
 */
const FIELDS = [
  { side: 'left', type: 'hours', label: 'Left Hours' },
  { side: 'left', type: 'minutes', label: 'Left Minutes' },
  { side: 'left', type: 'seconds', label: 'Left Seconds' },
  { side: 'right', type: 'hours', label: 'Right Hours' },
  { side: 'right', type: 'minutes', label: 'Right Minutes' },
  { side: 'right', type: 'seconds', label: 'Right Seconds' },
  { side: 'left', type: 'moves', label: 'Left Moves' },
  { side: 'right', type: 'moves', label: 'Right Moves' },
  { side: 'left', type: 'period', label: 'Left Period' },
  { side: 'right', type: 'period', label: 'Right Period' },
];

export class CorrectionMode {
  /**
   * @param {HTMLElement} overlayEl - Overlay container for correction mode
   */
  constructor(overlayEl) {
    this._overlay = overlayEl;
    this._activeFieldIndex = 0;
    this._values = {};
    this._fieldElements = [];
    this._onSave = null;
    this._onCancel = null;
    this._active = false;
  }

  /**
   * Enter correction mode with current game state values.
   * @param {object} state
   * @param {number} state.leftTimeMs
   * @param {number} state.rightTimeMs
   * @param {number} state.leftMoves
   * @param {number} state.rightMoves
   * @param {number} state.leftPeriod
   * @param {number} state.rightPeriod
   * @param {number} state.totalPeriods
   * @param {Function} onSave - (correctedValues) => void
   * @param {Function} onCancel - () => void
   */
  enter(state, onSave, onCancel) {
    this._onSave = onSave;
    this._onCancel = onCancel;
    this._active = true;

    // Parse current times into hours/min/sec
    const leftTime = this._msToComponents(state.leftTimeMs);
    const rightTime = this._msToComponents(state.rightTimeMs);

    this._values = {
      leftHours: leftTime.hours,
      leftMinutes: leftTime.minutes,
      leftSeconds: leftTime.seconds,
      rightHours: rightTime.hours,
      rightMinutes: rightTime.minutes,
      rightSeconds: rightTime.seconds,
      leftMoves: state.leftMoves,
      rightMoves: state.rightMoves,
      leftPeriod: state.leftPeriod,
      rightPeriod: state.rightPeriod,
      totalPeriods: state.totalPeriods,
    };

    this._activeFieldIndex = 0;
    this._render();
    this._overlay.classList.remove('hidden');
  }

  /**
   * Exit correction mode.
   */
  exit() {
    this._active = false;
    this._overlay.classList.add('hidden');
    this._overlay.innerHTML = '';
    this._fieldElements = [];
  }

  /**
   * @returns {boolean}
   */
  isActive() {
    return this._active;
  }

  /**
   * Navigate to the next field.
   */
  nextField() {
    if (!this._active) return;
    this._activeFieldIndex = (this._activeFieldIndex + 1) % FIELDS.length;
    this._updateHighlight();
  }

  /**
   * Navigate to the previous field.
   */
  prevField() {
    if (!this._active) return;
    this._activeFieldIndex = (this._activeFieldIndex - 1 + FIELDS.length) % FIELDS.length;
    this._updateHighlight();
  }

  /**
   * Increment the active field.
   */
  increment() {
    if (!this._active) return;
    this._adjustField(1);
  }

  /**
   * Decrement the active field.
   */
  decrement() {
    if (!this._active) return;
    this._adjustField(-1);
  }

  /**
   * Save and exit correction mode.
   */
  save() {
    if (!this._active) return;

    const leftTimeMs = this._componentsToMs(
      this._values.leftHours,
      this._values.leftMinutes,
      this._values.leftSeconds,
    );
    const rightTimeMs = this._componentsToMs(
      this._values.rightHours,
      this._values.rightMinutes,
      this._values.rightSeconds,
    );

    if (this._onSave) {
      this._onSave({
        leftTimeMs,
        rightTimeMs,
        leftMoves: this._values.leftMoves,
        rightMoves: this._values.rightMoves,
        leftPeriod: this._values.leftPeriod,
        rightPeriod: this._values.rightPeriod,
      });
    }

    this.exit();
  }

  /**
   * Cancel and exit correction mode.
   */
  cancel() {
    if (this._onCancel) {
      this._onCancel();
    }
    this.exit();
  }

  /**
   * Adjust the current field value.
   * @param {number} delta
   */
  _adjustField(delta) {
    const field = FIELDS[this._activeFieldIndex];
    const key = `${field.side}${field.type.charAt(0).toUpperCase()}${field.type.slice(1)}`;

    switch (field.type) {
      case 'hours':
        this._values[key] = Math.max(0, Math.min(9, this._values[key] + delta));
        break;
      case 'minutes':
        this._values[key] = Math.max(0, Math.min(59, this._values[key] + delta));
        break;
      case 'seconds':
        this._values[key] = Math.max(0, Math.min(59, this._values[key] + delta));
        break;
      case 'moves': {
        const newVal = Math.max(0, this._values[key] + delta);
        const oldVal = this._values[key];
        this._values[key] = newVal;

        // Linked behavior: changing left moves auto-updates right
        if (field.side === 'left') {
          const diff = newVal - oldVal;
          this._values.rightMoves = Math.max(0, this._values.rightMoves + diff);
        }
        break;
      }
      case 'period':
        this._values[key] = Math.max(0, Math.min(this._values.totalPeriods - 1, this._values[key] + delta));
        break;
    }

    this._updateDisplay();
  }

  /**
   * Render the correction mode overlay.
   */
  _render() {
    this._overlay.innerHTML = '';

    const container = document.createElement('div');
    container.className = 'correction-container';

    // Title
    const title = document.createElement('h3');
    title.className = 'correction-title';
    title.textContent = 'Time Correction';
    container.appendChild(title);

    // Time editing grid
    const grid = document.createElement('div');
    grid.className = 'correction-grid';

    // Left time
    const leftLabel = document.createElement('div');
    leftLabel.className = 'correction-label';
    leftLabel.textContent = 'Left';
    grid.appendChild(leftLabel);

    const leftTimeRow = document.createElement('div');
    leftTimeRow.className = 'correction-time-row';
    this._fieldElements = [];

    // Build field displays (tappable to select)
    for (let i = 0; i < FIELDS.length; i++) {
      const field = FIELDS[i];
      const key = `${field.side}${field.type.charAt(0).toUpperCase()}${field.type.slice(1)}`;

      const el = document.createElement('span');
      el.className = 'correction-field';
      el.setAttribute('data-field-index', i);
      el.setAttribute('title', field.label);
      el.textContent = String(this._values[key]).padStart(field.type === 'moves' ? 3 : 2, '0');

      // Tap to select this field
      const fieldIndex = i;
      el.addEventListener('click', (e) => {
        e.preventDefault();
        this._activeFieldIndex = fieldIndex;
        this._updateHighlight();
      });

      this._fieldElements.push(el);
    }

    // Arrange: Left time
    const leftTimeDisplay = document.createElement('div');
    leftTimeDisplay.className = 'correction-time';
    leftTimeDisplay.appendChild(this._fieldElements[0]);
    leftTimeDisplay.appendChild(document.createTextNode(':'));
    leftTimeDisplay.appendChild(this._fieldElements[1]);
    leftTimeDisplay.appendChild(document.createTextNode(':'));
    leftTimeDisplay.appendChild(this._fieldElements[2]);
    grid.appendChild(leftTimeDisplay);

    // Right time
    const rightLabel = document.createElement('div');
    rightLabel.className = 'correction-label';
    rightLabel.textContent = 'Right';
    grid.appendChild(rightLabel);

    const rightTimeDisplay = document.createElement('div');
    rightTimeDisplay.className = 'correction-time';
    rightTimeDisplay.appendChild(this._fieldElements[3]);
    rightTimeDisplay.appendChild(document.createTextNode(':'));
    rightTimeDisplay.appendChild(this._fieldElements[4]);
    rightTimeDisplay.appendChild(document.createTextNode(':'));
    rightTimeDisplay.appendChild(this._fieldElements[5]);
    grid.appendChild(rightTimeDisplay);

    // Moves
    const movesLabel = document.createElement('div');
    movesLabel.className = 'correction-label';
    movesLabel.textContent = 'Moves';
    grid.appendChild(movesLabel);

    const movesRow = document.createElement('div');
    movesRow.className = 'correction-moves-row';
    movesRow.appendChild(this._fieldElements[6]);
    movesRow.appendChild(document.createTextNode(' / '));
    movesRow.appendChild(this._fieldElements[7]);
    grid.appendChild(movesRow);

    // Periods (only show if multiple periods)
    if (this._values.totalPeriods > 1) {
      const periodLabel = document.createElement('div');
      periodLabel.className = 'correction-label';
      periodLabel.textContent = 'Period';
      grid.appendChild(periodLabel);

      const periodRow = document.createElement('div');
      periodRow.className = 'correction-period-row';
      periodRow.appendChild(this._fieldElements[8]);
      periodRow.appendChild(document.createTextNode(' / '));
      periodRow.appendChild(this._fieldElements[9]);
      grid.appendChild(periodRow);
    }

    container.appendChild(grid);

    // Touch navigation and adjustment controls
    const controls = document.createElement('div');
    controls.className = 'correction-controls';

    const prevBtn = document.createElement('button');
    prevBtn.className = 'btn btn-control';
    prevBtn.textContent = '\u25C0';
    prevBtn.title = 'Previous field';
    prevBtn.addEventListener('click', (e) => { e.preventDefault(); this.prevField(); });

    const decBtn = document.createElement('button');
    decBtn.className = 'btn btn-control btn-control-adj';
    decBtn.textContent = '\u2212';
    decBtn.title = 'Decrease';
    decBtn.addEventListener('click', (e) => { e.preventDefault(); this.decrement(); });

    const incBtn = document.createElement('button');
    incBtn.className = 'btn btn-control btn-control-adj';
    incBtn.textContent = '+';
    incBtn.title = 'Increase';
    incBtn.addEventListener('click', (e) => { e.preventDefault(); this.increment(); });

    const nextBtn = document.createElement('button');
    nextBtn.className = 'btn btn-control';
    nextBtn.textContent = '\u25B6';
    nextBtn.title = 'Next field';
    nextBtn.addEventListener('click', (e) => { e.preventDefault(); this.nextField(); });

    controls.appendChild(prevBtn);
    controls.appendChild(decBtn);
    controls.appendChild(incBtn);
    controls.appendChild(nextBtn);
    container.appendChild(controls);

    // Buttons
    const buttons = document.createElement('div');
    buttons.className = 'correction-buttons';

    const saveBtn = document.createElement('button');
    saveBtn.className = 'btn btn-primary';
    saveBtn.textContent = 'Save';
    saveBtn.addEventListener('click', () => this.save());

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'btn btn-secondary';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.addEventListener('click', () => this.cancel());

    buttons.appendChild(cancelBtn);
    buttons.appendChild(saveBtn);
    container.appendChild(buttons);

    // Instructions
    const help = document.createElement('div');
    help.className = 'correction-help';
    help.textContent = 'Tap a field to select it. Use \u25C0\u25B6 or \u2190\u2192 to navigate, \u2212/+ or \u2191\u2193 to adjust.';
    container.appendChild(help);

    this._overlay.appendChild(container);
    this._updateHighlight();
  }

  /**
   * Update the field highlight.
   */
  _updateHighlight() {
    for (let i = 0; i < this._fieldElements.length; i++) {
      this._fieldElements[i].classList.toggle('correction-active', i === this._activeFieldIndex);
    }
  }

  /**
   * Update all field display values.
   */
  _updateDisplay() {
    for (let i = 0; i < FIELDS.length; i++) {
      const field = FIELDS[i];
      const key = `${field.side}${field.type.charAt(0).toUpperCase()}${field.type.slice(1)}`;
      const padLen = field.type === 'moves' ? 3 : 2;
      this._fieldElements[i].textContent = String(this._values[key]).padStart(padLen, '0');
    }
  }

  /**
   * Convert ms to hours/minutes/seconds components.
   * @param {number} ms
   * @returns {{ hours: number, minutes: number, seconds: number }}
   */
  _msToComponents(ms) {
    const totalSeconds = Math.floor(Math.max(0, ms) / 1000);
    return {
      hours: Math.floor(totalSeconds / 3600),
      minutes: Math.floor((totalSeconds % 3600) / 60),
      seconds: totalSeconds % 60,
    };
  }

  /**
   * Convert components to ms.
   * @param {number} hours
   * @param {number} minutes
   * @param {number} seconds
   * @returns {number}
   */
  _componentsToMs(hours, minutes, seconds) {
    return (hours * 3600 + minutes * 60 + seconds) * 1000;
  }
}
