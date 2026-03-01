/**
 * Presets - All 24 pre-programmed timing options
 *
 * Each preset defines:
 * - name: Display name
 * - periods: Array of period configurations
 * - freezeDefault: Whether freeze mode is on by default
 * - soundDefault: Whether sound is on by default
 *
 * Period configuration:
 * - method: TimingMethodType
 * - timeMs: Main time in ms
 * - delayMs: Bonus/delay per move in ms
 * - movesRequired: Moves to complete period (0 = until time expires)
 * - byoTimeMs: Byo-yomi time per moment in ms
 * - byoMoments: Number of byo-yomi moments
 */

import { TimingMethodType } from '../utils/constants.js';

// Helper to convert minutes to ms
const min = (m) => m * 60 * 1000;
// Helper to convert hours to ms
const hr = (h) => h * 60 * 60 * 1000;
// Helper to convert seconds to ms
const sec = (s) => s * 1000;

export const presets = [
  // ===== TIME Options (Single Period) - Options 01-05 =====
  {
    id: 1,
    name: '5 min',
    description: 'Blitz 5 minutes',
    periods: [{ method: TimingMethodType.TIME, timeMs: min(5) }],
    freezeDefault: false,
    soundDefault: false,
  },
  {
    id: 2,
    name: '10 min',
    description: 'Rapid 10 minutes',
    periods: [{ method: TimingMethodType.TIME, timeMs: min(10) }],
    freezeDefault: false,
    soundDefault: false,
  },
  {
    id: 3,
    name: '25 min',
    description: 'Rapid 25 minutes',
    periods: [{ method: TimingMethodType.TIME, timeMs: min(25) }],
    freezeDefault: false,
    soundDefault: false,
  },
  {
    id: 4,
    name: '1 hour',
    description: 'Classical 1 hour',
    periods: [{ method: TimingMethodType.TIME, timeMs: hr(1) }],
    freezeDefault: false,
    soundDefault: false,
  },
  {
    id: 5,
    name: '2 hours',
    description: 'Classical 2 hours',
    periods: [{ method: TimingMethodType.TIME, timeMs: hr(2) }],
    freezeDefault: false,
    soundDefault: false,
  },

  // ===== TIME Options (Multiple Periods) - Options 06-09 =====
  {
    id: 6,
    name: '2h + 30m',
    description: '2 hours then 30 minutes',
    periods: [
      { method: TimingMethodType.TIME, timeMs: hr(2) },
      { method: TimingMethodType.TIME, timeMs: min(30) },
    ],
    freezeDefault: false,
    soundDefault: false,
  },
  {
    id: 7,
    name: '2h + 1h',
    description: '2 hours then 1 hour',
    periods: [
      { method: TimingMethodType.TIME, timeMs: hr(2) },
      { method: TimingMethodType.TIME, timeMs: hr(1) },
    ],
    freezeDefault: false,
    soundDefault: false,
  },
  {
    id: 8,
    name: '2h + 1h + 30m',
    description: '2 hours, 1 hour, then 30 minutes',
    periods: [
      { method: TimingMethodType.TIME, timeMs: hr(2) },
      { method: TimingMethodType.TIME, timeMs: hr(1) },
      { method: TimingMethodType.TIME, timeMs: min(30) },
    ],
    freezeDefault: false,
    soundDefault: false,
  },
  {
    id: 9,
    name: '2h + 1h + 1h',
    description: '2 hours, 1 hour, then 1 hour',
    periods: [
      { method: TimingMethodType.TIME, timeMs: hr(2) },
      { method: TimingMethodType.TIME, timeMs: hr(1) },
      { method: TimingMethodType.TIME, timeMs: hr(1) },
    ],
    freezeDefault: false,
    soundDefault: false,
  },

  // ===== FISCHER Options - Options 10-14 =====
  {
    id: 10,
    name: '3+2 Fischer',
    description: '3 min + 2s/move bonus',
    periods: [
      { method: TimingMethodType.FISCHER, timeMs: min(3), delayMs: sec(2) },
    ],
    freezeDefault: true,
    soundDefault: false,
  },
  {
    id: 11,
    name: '25+10 Fischer',
    description: '25 min + 10s/move bonus',
    periods: [
      { method: TimingMethodType.FISCHER, timeMs: min(25), delayMs: sec(10) },
    ],
    freezeDefault: true,
    soundDefault: false,
  },
  {
    id: 12,
    name: '1h30+30s Fischer',
    description: '1h 30min + 30s/move bonus',
    periods: [
      { method: TimingMethodType.FISCHER, timeMs: hr(1) + min(30), delayMs: sec(30) },
    ],
    freezeDefault: true,
    soundDefault: false,
  },
  {
    id: 13,
    name: '1h30+30m+30s Fischer',
    description: '1h30m + 30m (2nd period) + 30s/move bonus all periods',
    periods: [
      { method: TimingMethodType.FISCHER, timeMs: hr(1) + min(30), delayMs: sec(30) },
      { method: TimingMethodType.FISCHER, timeMs: min(30), delayMs: sec(30) },
    ],
    freezeDefault: true,
    soundDefault: false,
  },
  {
    id: 14,
    name: '1h40+50m+15m+30s Fischer',
    description: '1h40m + 50m + 15m + 30s/move bonus all periods',
    periods: [
      { method: TimingMethodType.FISCHER, timeMs: hr(1) + min(40), delayMs: sec(30) },
      { method: TimingMethodType.FISCHER, timeMs: min(50), delayMs: sec(30) },
      { method: TimingMethodType.FISCHER, timeMs: min(15), delayMs: sec(30) },
    ],
    freezeDefault: true,
    soundDefault: false,
  },

  // ===== DELAY (Bronstein) Options - Options 15-18 =====
  {
    id: 15,
    name: '25+10s Bronstein',
    description: '25 min + 10s/move Bronstein delay',
    periods: [
      { method: TimingMethodType.DELAY, timeMs: min(25), delayMs: sec(10) },
    ],
    freezeDefault: true,
    soundDefault: false,
  },
  {
    id: 16,
    name: '1h55+5s Bronstein',
    description: '1h 55min + 5s/move Bronstein delay',
    periods: [
      { method: TimingMethodType.DELAY, timeMs: hr(1) + min(55), delayMs: sec(5) },
    ],
    freezeDefault: true,
    soundDefault: false,
  },
  {
    id: 17,
    name: '2h+15m+30s Bronstein',
    description: '2h + 15m (2nd period) + 30s/move Bronstein delay all periods',
    periods: [
      { method: TimingMethodType.DELAY, timeMs: hr(2), delayMs: sec(30) },
      { method: TimingMethodType.DELAY, timeMs: min(15), delayMs: sec(30) },
    ],
    freezeDefault: true,
    soundDefault: false,
  },
  {
    id: 18,
    name: '2h+1h+15m+30s Bronstein',
    description: '2h + 1h + 15m + 30s/move Bronstein delay all periods',
    periods: [
      { method: TimingMethodType.DELAY, timeMs: hr(2), delayMs: sec(30) },
      { method: TimingMethodType.DELAY, timeMs: hr(1), delayMs: sec(30) },
      { method: TimingMethodType.DELAY, timeMs: min(15), delayMs: sec(30) },
    ],
    freezeDefault: true,
    soundDefault: false,
  },

  // ===== Byo-yomi Options - Options 19-20 =====
  {
    id: 19,
    name: '1h + Canadian Byo',
    description: '1h TIME, then 5m Canadian byo-yomi (repeating)',
    periods: [
      { method: TimingMethodType.TIME, timeMs: hr(1) },
      { method: TimingMethodType.CANADIAN_BYO, byoTimeMs: min(5) },
    ],
    freezeDefault: false,
    soundDefault: true,
  },
  {
    id: 20,
    name: '1h + 1x20s Byo',
    description: '1h TIME, then 1x20s Japanese byo-yomi (repeating)',
    periods: [
      { method: TimingMethodType.TIME, timeMs: hr(1) },
      { method: TimingMethodType.BYO_YOMI, byoTimeMs: sec(20), byoMoments: 1 },
    ],
    freezeDefault: false,
    soundDefault: true,
  },

  // ===== Scrabble Option - Option 21 =====
  {
    id: 21,
    name: '25m + Upcount',
    description: 'Scrabble: 25 min TIME, then upcount',
    periods: [
      { method: TimingMethodType.TIME, timeMs: min(25) },
      { method: TimingMethodType.UPCOUNT },
    ],
    freezeDefault: false,
    soundDefault: true,
  },

  // ===== US-DELAY Options - Options 22-24 =====
  {
    id: 22,
    name: '5+2s US Delay',
    description: '5 min + 2s/move US delay',
    periods: [
      { method: TimingMethodType.US_DELAY, timeMs: min(5), delayMs: sec(2) },
    ],
    freezeDefault: false,
    soundDefault: false,
  },
  {
    id: 23,
    name: '25+5s US Delay',
    description: '25 min + 5s/move US delay',
    periods: [
      { method: TimingMethodType.US_DELAY, timeMs: min(25), delayMs: sec(5) },
    ],
    freezeDefault: false,
    soundDefault: false,
  },
  {
    id: 24,
    name: '1h55+60m+5s US Delay',
    description: '1h55m + 60m (2nd period) + 5s/move US delay',
    periods: [
      { method: TimingMethodType.US_DELAY, timeMs: hr(1) + min(55), delayMs: sec(5) },
      { method: TimingMethodType.US_DELAY, timeMs: hr(1), delayMs: sec(5) },
    ],
    freezeDefault: false,
    soundDefault: false,
  },

  // ===== Bullet Options - Options 25-26 =====
  {
    id: 25,
    name: '1 min',
    description: 'Bullet 1 minute',
    periods: [{ method: TimingMethodType.TIME, timeMs: min(1) }],
    freezeDefault: false,
    soundDefault: false,
  },
  {
    id: 26,
    name: '30 sec',
    description: 'Ultra Bullet 30 seconds',
    periods: [{ method: TimingMethodType.TIME, timeMs: sec(30) }],
    freezeDefault: false,
    soundDefault: false,
  },
];

/**
 * Get a preset by its option number (1-24).
 * @param {number} id - Option number
 * @returns {object|null}
 */
export function getPreset(id) {
  return presets.find((p) => p.id === id) || null;
}

/**
 * Get all presets.
 * @returns {Array<object>}
 */
export function getAllPresets() {
  return presets;
}
