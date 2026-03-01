/**
 * TempoMate - Main Application
 *
 * Initializes all components, wires up event handling, and manages
 * the main game loop.
 */

import { GameState } from './state/GameState.js';
import { TimerEngine } from './engine/TimerEngine.js';
import { PeriodManager } from './engine/PeriodManager.js';
import { MoveCounter } from './engine/MoveCounter.js';
import { ClockDisplay } from './ui/ClockDisplay.js';
import { StatusBar } from './ui/StatusBar.js';
import { SettingsPanel } from './ui/SettingsPanel.js';
import { CorrectionMode } from './ui/CorrectionMode.js';
import { SoundManager } from './ui/SoundManager.js';
import { ThemeManager } from './ui/ThemeManager.js';
import { RotationManager } from './ui/RotationManager.js';
import { InputHandler } from './input/InputHandler.js';
import { StorageManager } from './storage/StorageManager.js';
import { getPreset } from './presets/presets.js';
import { GameStatus, Player, FlagState, TimingMethodType, CLOCK_FONTS, Limits } from './utils/constants.js';
import { WakeLockManager } from './utils/WakeLockManager.js';

export class App {
  constructor() {
    // Core state
    this.gameState = new GameState();
    this.timerEngine = new TimerEngine();
    this.periodManager = new PeriodManager(this.gameState);
    this.moveCounter = new MoveCounter();
    this.soundManager = new SoundManager();
    this.themeManager = new ThemeManager();
    this.rotationManager = new RotationManager();
    this.inputHandler = new InputHandler();

    // UI components (initialized in init())
    this.clockDisplay = null;
    this.statusBar = null;
    this.settingsPanel = null;
    this.correctionMode = null;

    // State flags
    this._showingMoves = false;
    this._wakeLockManager = new WakeLockManager();

    this._resetPending = false;
    this._resetConfirmTimer = null;

    // Bind methods
    this._onTick = this._onTick.bind(this);
  }

  /**
   * Initialize the application.
   */
  init() {
    // Initialize theme
    this.themeManager.init();

    // Initialize rotation
    this.rotationManager.init(document.getElementById('app'));

    // Create UI components
    this.clockDisplay = new ClockDisplay(document.getElementById('clock-container'));
    this.statusBar = new StatusBar(document.getElementById('status-bar'));
    this.settingsPanel = new SettingsPanel(document.getElementById('settings-panel'));
    this.correctionMode = new CorrectionMode(document.getElementById('correction-overlay'));

    // Wire up input handling
    this._setupInput();

    // Wire up settings panel
    this.settingsPanel.setCallbacks(
      (config, optionNumber) => this._selectOption(config, optionNumber),
      () => {},
    );

    // Set up timer engine
    this.timerEngine.setTickCallback(this._onTick);

    // Load saved clock font
    const savedFontId = StorageManager.loadFont();
    const fontDef = CLOCK_FONTS.find((f) => f.id === savedFontId);
    if (fontDef) {
      document.documentElement.style.setProperty('--clock-font', fontDef.family);
    }

    // Load last option or default to option 1
    const lastOption = StorageManager.loadLastOption();
    this._loadOption(lastOption);

    // Initial render
    this._updateDisplay();
  }

  /**
   * Set up all input event handlers.
   */
  _setupInput() {
    const input = this.inputHandler;
    const faces = this.clockDisplay.getClockFaces();

    // Bind clock faces for tap
    input.bindClockFaces(faces.left, faces.right);

    // Bind keyboard
    input.bindKeyboard();

    // Bind toolbar buttons
    const pauseBtn = document.getElementById('btn-pause');
    const settingsBtn = document.getElementById('btn-settings');
    const resetBtn = document.getElementById('btn-reset');
    const soundBtn = document.getElementById('btn-sound');
    const themeBtn = document.getElementById('btn-theme');

    if (pauseBtn) input.bindButton(pauseBtn, 'togglePause', 'enterCorrection');
    if (settingsBtn) settingsBtn.addEventListener('click', () => this._openSettings());
    if (resetBtn) resetBtn.addEventListener('click', () => this._confirmReset());
    if (soundBtn) soundBtn.addEventListener('click', () => this._toggleSound());
    if (themeBtn) themeBtn.addEventListener('click', () => this._cycleTheme());

    const rotateBtn = document.getElementById('btn-rotate');
    if (rotateBtn) rotateBtn.addEventListener('click', () => this._toggleRotation());

    // Event handlers
    input.on('clockTap', (side) => this._handleClockTap(side));
    input.on('switchTurn', () => this._handleSwitchTurn());
    input.on('togglePause', () => this._handleTogglePause());
    input.on('toggleSound', () => this._toggleSound());
    input.on('toggleFreeze', () => this._toggleFreeze());
    input.on('showMoves', (show) => this._showMoves(show));
    input.on('reset', () => this._confirmReset());
    input.on('escape', () => this._handleEscape());
    input.on('navLeft', () => this._handleNav('left'));
    input.on('navRight', () => this._handleNav('right'));
    input.on('navUp', () => this._handleNav('up'));
    input.on('navDown', () => this._handleNav('down'));
    input.on('quickPreset', (num) => this._quickPreset(num));
    input.on('enterCorrection', () => this._enterCorrection());
  }

  /**
   * Handle clock face tap.
   * @param {string} side - Which side was tapped
   */
  _handleClockTap(side) {
    const gs = this.gameState;

    // Wake lock must be requested before AudioContext init — Safari's
    // transient user-activation is consumed by the first privileged API call.
    this._ensureWakeLock();
    this.soundManager.init();

    if (gs.status === GameStatus.IDLE) {
      // First tap: start the game. Tapping a side means "I'm done"
      // so the opponent's clock starts
      gs.startGame(side);
      this.periodManager.init();

      // Start turn for the now-active player
      this.periodManager.onTurnStart(gs.activePlayer);
      this.soundManager.resetBeepState();
      this.timerEngine.start();
      this._updateDisplay();
      return;
    }

    if (gs.status === GameStatus.RUNNING) {
      // Can only tap the active side to end turn
      if (side === gs.activePlayer) {
        this._switchTurn();
      }
      return;
    }

    if (gs.status === GameStatus.FROZEN) {
      // Clock is frozen, no interaction
      return;
    }
  }

  /**
   * Handle spacebar/enter to switch turns.
   */
  _handleSwitchTurn() {
    const gs = this.gameState;

    this._ensureWakeLock();
    this.soundManager.init();

    if (gs.status === GameStatus.IDLE) {
      // Start with left player's clock (right player goes first)
      gs.startGame(Player.LEFT);
      this.periodManager.init();
      this.periodManager.onTurnStart(gs.activePlayer);
      this.soundManager.resetBeepState();
      this.timerEngine.start();
      this._updateDisplay();
      return;
    }

    if (gs.status === GameStatus.RUNNING) {
      this._switchTurn();
    }
  }

  /**
   * Switch the active turn.
   */
  _switchTurn() {
    const gs = this.gameState;
    const previousActive = gs.activePlayer;

    // End turn for current player
    this.periodManager.onTurnEnd(previousActive);
    this.moveCounter.recordMove(previousActive);

    // Switch turns in game state (this increments the move counter on player state too)
    gs.switchTurn();

    // Start turn for new active player
    this.periodManager.onTurnStart(gs.activePlayer);
    this.soundManager.resetBeepState();

    this._updateDisplay();
  }

  /**
   * Handle pause toggle.
   */
  _handleTogglePause() {
    const gs = this.gameState;

    if (gs.status === GameStatus.RUNNING) {
      gs.pause();
      this.timerEngine.stop();
      this._updateDisplay();
    } else if (gs.status === GameStatus.PAUSED) {
      gs.resume();
      this.timerEngine.start();
      this._updateDisplay();
    }
  }

  /**
   * Timer tick callback.
   * @param {number} deltaMs
   */
  _onTick(deltaMs) {
    const gs = this.gameState;
    if (gs.status !== GameStatus.RUNNING || !gs.activePlayer) return;

    const result = this.periodManager.onTick(deltaMs, gs.activePlayer);
    const activeState = gs.getActivePlayerState();

    // Check sound
    if (gs.soundEnabled && activeState) {
      const method = this.periodManager.getMethod(gs.activePlayer);
      if (method && method.getType() !== TimingMethodType.UPCOUNT) {
        this.soundManager.checkAndBeep(activeState.timeMs);
      }

      // Byo-yomi moment expired beep
      if (result.momentExpired) {
        this.soundManager.playMomentBeep();
      }
    }

    if (result.expired) {
      // Set flag on the expired player regardless of freeze mode
      if (activeState && activeState.flagState === FlagState.NONE) {
        activeState.setFlag(FlagState.BLINKING);
      }

      if (gs.freezeEnabled && gs.isInFinalPeriod(gs.activePlayer)) {
        gs.freeze();
        this.timerEngine.stop();
      }
      // If not freeze, the clock continues (opponent can still play)
    }

    if (result.periodTransition) {
      if (gs.soundEnabled) {
        this.soundManager.playPeriodBeep();
      }
      this.soundManager.resetBeepState();
    }

    this._updateDisplay();
  }

  /**
   * Open the settings panel.
   */
  _openSettings() {
    if (this._resetPending) this._cancelResetConfirmation();
    const gs = this.gameState;
    // Only allow settings when idle or paused
    if (gs.status === GameStatus.RUNNING) {
      gs.pause();
      this.timerEngine.stop();
      this._updateDisplay();
    }
    this.settingsPanel.show();
  }

  /**
   * Select an option configuration.
   * @param {object} config
   * @param {number} optionNumber
   */
  _selectOption(config, optionNumber) {
    this.gameState.selectedOption = optionNumber;
    this.gameState.initGame(config);
    this.moveCounter.reset();
    StorageManager.saveLastOption(optionNumber);
    this._updateDisplay();
  }

  /**
   * Load an option by number.
   * @param {number} optionNumber
   */
  _loadOption(optionNumber) {
    if (optionNumber >= 1 && optionNumber <= Limits.TOTAL_PRESETS) {
      const preset = getPreset(optionNumber);
      if (preset) {
        this._selectOption(preset, optionNumber);
        return;
      }
    }

    if (optionNumber >= Limits.MANUAL_OPTION_START && optionNumber <= Limits.MANUAL_OPTION_END) {
      const slot = optionNumber - Limits.MANUAL_OPTION_START;
      const custom = StorageManager.loadCustomOption(slot);
      if (custom) {
        this._selectOption(custom, optionNumber);
        return;
      }
    }

    // Fallback to option 1
    const preset = getPreset(1);
    if (preset) {
      this._selectOption(preset, 1);
    }
  }

  /**
   * Quick preset selection (number keys).
   * @param {number} num
   */
  _quickPreset(num) {
    if (this.gameState.status !== GameStatus.IDLE) return;
    if (this.settingsPanel.isVisible()) return;

    const preset = getPreset(num);
    if (preset) {
      this._selectOption(preset, num);
    }
  }

  /**
   * Toggle sound.
   */
  _toggleSound() {
    this.gameState.toggleSound();
    this.soundManager.setEnabled(this.gameState.soundEnabled);
    this._updateDisplay();
  }

  /**
   * Toggle freeze mode.
   */
  _toggleFreeze() {
    this.gameState.toggleFreeze();
    this._updateDisplay();
  }

  /**
   * Confirm and execute reset (double-tap when game is not idle).
   */
  _confirmReset() {
    const gs = this.gameState;
    if (gs.status === GameStatus.IDLE) return;

    if (this._resetPending) {
      // Second tap — execute reset
      this._cancelResetConfirmation();
      this.timerEngine.stop();
      gs.reset();
      this.moveCounter.reset();
      this._updateDisplay();
      return;
    }

    // First tap — enter confirmation state
    this._resetPending = true;
    const resetBtn = document.getElementById('btn-reset');
    if (resetBtn) resetBtn.classList.add('confirm-active');
    this.statusBar.showMessage('Tap again to reset');

    this._resetConfirmTimer = setTimeout(() => {
      this._cancelResetConfirmation();
      this._updateDisplay();
    }, 3000);
  }

  /**
   * Cancel the pending reset confirmation.
   */
  _cancelResetConfirmation() {
    this._resetPending = false;
    if (this._resetConfirmTimer) {
      clearTimeout(this._resetConfirmTimer);
      this._resetConfirmTimer = null;
    }
    const resetBtn = document.getElementById('btn-reset');
    if (resetBtn) resetBtn.classList.remove('confirm-active');
    this.statusBar.clearMessage();
  }

  /**
   * Handle escape key.
   */
  _handleEscape() {
    if (this._resetPending) {
      this._cancelResetConfirmation();
      this._updateDisplay();
      return;
    }

    if (this.correctionMode.isActive()) {
      this.correctionMode.cancel();
      this.gameState.exitCorrectionMode();
      this._updateDisplay();
      return;
    }

    if (this.settingsPanel.isVisible()) {
      this.settingsPanel.hide();
      return;
    }

    // Escape can also pause
    if (this.gameState.status === GameStatus.RUNNING) {
      this._handleTogglePause();
    }
  }

  /**
   * Handle navigation keys (for settings/correction mode).
   * @param {string} direction
   */
  _handleNav(direction) {
    if (this.correctionMode.isActive()) {
      switch (direction) {
        case 'left': this.correctionMode.prevField(); break;
        case 'right': this.correctionMode.nextField(); break;
        case 'up': this.correctionMode.increment(); break;
        case 'down': this.correctionMode.decrement(); break;
      }
    }
  }

  /**
   * Enter correction mode.
   */
  _enterCorrection() {
    const gs = this.gameState;
    if (gs.status !== GameStatus.PAUSED && gs.status !== GameStatus.FROZEN) return;

    gs.enterCorrectionMode();

    this.correctionMode.enter(
      {
        leftTimeMs: gs.left.timeMs,
        rightTimeMs: gs.right.timeMs,
        leftMoves: gs.left.moves,
        rightMoves: gs.right.moves,
        leftPeriod: gs.left.currentPeriod,
        rightPeriod: gs.right.currentPeriod,
        totalPeriods: gs.optionConfig ? gs.optionConfig.periods.length : 1,
      },
      (corrected) => {
        // Apply corrections
        gs.left.timeMs = corrected.leftTimeMs;
        gs.right.timeMs = corrected.rightTimeMs;
        gs.left.moves = corrected.leftMoves;
        gs.right.moves = corrected.rightMoves;
        gs.left.currentPeriod = corrected.leftPeriod;
        gs.right.currentPeriod = corrected.rightPeriod;

        // Update move counter
        this.moveCounter.setMoves('left', corrected.leftMoves);
        this.moveCounter.setMoves('right', corrected.rightMoves);

        // Clamp period indices to valid range
        if (gs.optionConfig) {
          const maxPeriod = gs.optionConfig.periods.length - 1;
          gs.left.currentPeriod = Math.max(0, Math.min(corrected.leftPeriod, maxPeriod));
          gs.right.currentPeriod = Math.max(0, Math.min(corrected.rightPeriod, maxPeriod));

          // Sync period methods
          const leftPeriodConfig = gs.optionConfig.periods[gs.left.currentPeriod];
          const rightPeriodConfig = gs.optionConfig.periods[gs.right.currentPeriod];
          if (leftPeriodConfig) {
            this.periodManager.activeMethods.set('left', PeriodManager.createMethod(leftPeriodConfig));
          }
          if (rightPeriodConfig) {
            this.periodManager.activeMethods.set('right', PeriodManager.createMethod(rightPeriodConfig));
          }
        }

        gs.exitCorrectionMode();
        this._updateDisplay();
      },
      () => {
        gs.exitCorrectionMode();
        this._updateDisplay();
      },
    );
  }

  /**
   * Show/hide move count.
   * @param {boolean} show
   */
  _showMoves(show) {
    this._showingMoves = show;
    this._updateDisplay();
  }

  /**
   * Cycle through themes.
   */
  _cycleTheme() {
    const newTheme = this.themeManager.cycle();
    const btn = document.getElementById('btn-theme');
    if (btn) {
      const icons = { auto: '\u25D0', light: '\u2600', dark: '\u263E' };
      btn.textContent = icons[newTheme] || '\u25D0';
      btn.title = `Theme: ${newTheme}`;
    }
  }

  /**
   * Toggle 90° rotation.
   */
  _toggleRotation() {
    const rotated = this.rotationManager.toggle();
    const btn = document.getElementById('btn-rotate');
    if (btn) {
      btn.title = rotated ? 'Undo rotation' : 'Rotate 90\u00B0';
    }
    this.clockDisplay.clearFontSizeCache();
    requestAnimationFrame(() => {
      this.clockDisplay._syncFontSizes();
    });
  }

  /**
   * Update all display elements.
   */
  _updateDisplay() {
    const gs = this.gameState;

    // Update clock display
    this.clockDisplay.update({
      leftTimeMs: gs.left.timeMs,
      rightTimeMs: gs.right.timeMs,
      activePlayer: gs.activePlayer,
      gameStatus: gs.status,
      leftColor: gs.left.color,
      rightColor: gs.right.color,
      leftFlagState: gs.left.flagState,
      rightFlagState: gs.right.flagState,
      leftMoves: gs.left.moves,
      rightMoves: gs.right.moves,
      showMoves: this._showingMoves,
      leftByoMoments: gs.left.byoMomentsRemaining,
      rightByoMoments: gs.right.byoMomentsRemaining,
      leftMethod: this.periodManager.getMethodType('left'),
      rightMethod: this.periodManager.getMethodType('right'),
    });

    // Update status bar
    const activePlayer = gs.getActivePlayerState();
    const whitePlayer = gs.left.color === 'white' ? 'left' : 'right';
    this.statusBar.update({
      leftMethod: this.periodManager.getMethodType('left'),
      rightMethod: this.periodManager.getMethodType('right'),
      leftPeriod: gs.left.currentPeriod,
      rightPeriod: gs.right.currentPeriod,
      totalPeriods: gs.optionConfig ? gs.optionConfig.periods.length : 1,
      freezeEnabled: gs.freezeEnabled,
      soundEnabled: gs.soundEnabled,
      optionNumber: gs.selectedOption,
      moveNumber: this.moveCounter.getChessMoveNumber(whitePlayer),
      gameStatus: gs.status,
      delayRemainingMs: activePlayer ? activePlayer.delayRemainingMs : 0,
    });

    // Update button states
    const pauseBtn = document.getElementById('btn-pause');
    if (pauseBtn) {
      const isPaused = gs.status === GameStatus.PAUSED;
      const isRunning = gs.status === GameStatus.RUNNING;
      pauseBtn.textContent = isPaused ? '\u25B6' : '\u23F8'; // Play or Pause icon
      pauseBtn.title = isPaused ? 'Resume (P)' : 'Pause (P)';
      pauseBtn.disabled = !isRunning && !isPaused;
    }

    const soundBtn = document.getElementById('btn-sound');
    if (soundBtn) {
      soundBtn.textContent = gs.soundEnabled ? '\u266B' : '\u266A';
      soundBtn.title = gs.soundEnabled ? 'Sound ON (S)' : 'Sound OFF (S)';
      soundBtn.classList.toggle('active', gs.soundEnabled);
    }
  }

  /**
   * Enable wake lock on first user gesture.
   * WakeLockManager.enable() is synchronous and fires all three strategies
   * (native + video + audio) in the same call stack, preserving the gesture.
   */
  _ensureWakeLock() {
    this._wakeLockManager.enable();
  }

  /**
   * Clean up resources.
   */
  destroy() {
    this.timerEngine.destroy();
    this.soundManager.destroy();
    this.themeManager.destroy();
    this.rotationManager = null;
    this.inputHandler.destroy();
    this._wakeLockManager.destroy();
  }
}

// Auto-initialize when DOM is ready (guarded to prevent double-init in built output)
if (!window.__tempoMateApp) {
  document.addEventListener('DOMContentLoaded', () => {
    if (!window.__tempoMateApp) {
      const app = new App();
      app.init();
      window.__tempoMateApp = app; // Expose for testing/debugging
    }
  });
}
