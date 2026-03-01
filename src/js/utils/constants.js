/**
 * Application-wide constants for TempoMate
 */

/** Game states */
export const GameStatus = Object.freeze({
  IDLE: 'idle',
  RUNNING: 'running',
  PAUSED: 'paused',
  FROZEN: 'frozen',
  CORRECTING: 'correcting',
});

/** Player identifiers */
export const Player = Object.freeze({
  LEFT: 'left',
  RIGHT: 'right',
});

/** Timing method identifiers */
export const TimingMethodType = Object.freeze({
  TIME: 'TIME',
  FISCHER: 'FISCH',
  US_DELAY: 'US-DLY',
  DELAY: 'DELAY',
  BYO_YOMI: 'BYO',
  CANADIAN_BYO: 'CAN-BYO',
  UPCOUNT: 'UPCNT',
  END: 'END',
});

/** Flag states */
export const FlagState = Object.freeze({
  NONE: 'none',
  BLINKING: 'blinking',       // Final period expired
  NON_BLINKING: 'non_blinking', // Non-final period expired
});

/** Maximum configurable values */
export const Limits = Object.freeze({
  MAX_PERIODS: 4,
  MAX_BYO_MOMENTS: 99,
  MAX_CANADIAN_TIME_MS: 599000, // 9:59
  MAX_HOURS: 9,
  MAX_MANUAL_OPTIONS: 5,
  MANUAL_OPTION_START: 27,
  MANUAL_OPTION_END: 31,
  TOTAL_PRESETS: 26,           // Options 1-26
  FLAG_DISPLAY_DURATION_MS: 300000, // 5 minutes
});

/** Clock font identifiers */
export const ClockFont = Object.freeze({
  DSEG7_CLASSIC: 'dseg7-classic',
  DSEG7_MODERN: 'dseg7-modern',
  ORBITRON: 'orbitron',
  DIGITAL7: 'digital7',
  MONOSPACE: 'monospace',
});

/** Clock font display definitions */
export const CLOCK_FONTS = Object.freeze([
  { id: ClockFont.DSEG7_CLASSIC, name: 'DSEG7 Classic', family: "'DSEG7 Classic'" },
  { id: ClockFont.DSEG7_MODERN, name: 'DSEG7 Modern', family: "'DSEG7 Modern'" },
  { id: ClockFont.ORBITRON, name: 'Orbitron', family: "'Orbitron'" },
  { id: ClockFont.DIGITAL7, name: 'Digital-7', family: "'Digital-7'" },
  { id: ClockFont.MONOSPACE, name: 'Monospace', family: "'SF Mono', 'Cascadia Mono', 'Fira Code', 'Consolas', 'Courier New', monospace" },
]);

/** Sound configuration */
export const SoundConfig = Object.freeze({
  WARNING_TIME_MS: 10000,     // Beep at 10 seconds
  COUNTDOWN_START_MS: 5000,   // Beep every second in last 5 seconds
  FINAL_BEEP_MS: 1000,        // Longer beep in last second
  BEEP_FREQUENCY: 880,        // Hz - A5
  BEEP_DURATION_SHORT: 80,    // ms
  BEEP_DURATION_LONG: 300,    // ms
  BEEP_VOLUME: 0.5,
});

/** Keyboard shortcuts */
export const Keys = Object.freeze({
  SWITCH_TURN: [' ', 'Enter'],
  PAUSE: ['p', 'P'],
  SOUND_TOGGLE: ['s', 'S'],
  FREEZE_TOGGLE: ['f', 'F'],
  MOVE_COUNT: ['m', 'M'],
  RESET: ['r', 'R'],
  ESCAPE: ['Escape'],
  NAV_LEFT: ['ArrowLeft'],
  NAV_RIGHT: ['ArrowRight'],
  NAV_UP: ['ArrowUp'],
  NAV_DOWN: ['ArrowDown'],
});

/** UI timing */
export const UIConfig = Object.freeze({
  LONG_PRESS_MS: 3000,        // 3 second hold
  DISPLAY_UPDATE_INTERVAL: 50, // ms between display refreshes
  FLAG_BLINK_INTERVAL: 500,   // ms
  DEBOUNCE_MS: 100,
});

/** localStorage keys */
export const StorageKeys = Object.freeze({
  CUSTOM_OPTIONS: 'tempomate_custom_options',
  LAST_OPTION: 'tempomate_last_option',
  THEME: 'tempomate_theme',
  SOUND_ENABLED: 'tempomate_sound',
  FONT: 'tempomate_font',
  ROTATION: 'tempomate_rotation',
});
