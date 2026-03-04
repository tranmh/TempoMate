import { describe, it, expect, beforeEach } from '@jest/globals';
import { GardeClockRenderer } from '../../src/js/ui/renderers/GardeClockRenderer.js';
import { InsaClockRenderer } from '../../src/js/ui/renderers/InsaClockRenderer.js';
import { FlagState, TimingMethodType } from '../../src/js/utils/constants.js';
import { StorageManager } from '../../src/js/storage/StorageManager.js';
import { ClockFaceStyle } from '../../src/js/utils/constants.js';

describe('Analog hand angle calculations', () => {
  let garde;

  beforeEach(() => {
    garde = new GardeClockRenderer();
  });

  it('computes 0° for zero remaining time (expired)', () => {
    const angles = garde._computeAngles(0);
    expect(angles.minute).toBe(0);
    expect(angles.hour).toBe(0);
  });

  it('computes 330° for 5:00 remaining (minute hand at 11 o\'clock)', () => {
    const angles = garde._computeAngles(5 * 60 * 1000);
    // 5 min → raw 30° → 360-30 = 330° (11 o'clock)
    expect(angles.minute).toBe(330);
  });

  it('computes 90° for 45:00 remaining (minute hand at 3 o\'clock)', () => {
    const angles = garde._computeAngles(45 * 60 * 1000);
    // 45 min → raw 270° → 360-270 = 90° (3 o'clock)
    expect(angles.minute).toBe(90);
  });

  it('computes 180° for 30:00 remaining (minute hand at 6 o\'clock)', () => {
    const angles = garde._computeAngles(30 * 60 * 1000);
    expect(angles.minute).toBe(180);
  });

  it('computes 270° for 15:00 remaining (minute hand at 9 o\'clock)', () => {
    const angles = garde._computeAngles(15 * 60 * 1000);
    // 15 min → raw 90° → 360-90 = 270° (9 o'clock)
    expect(angles.minute).toBe(270);
  });

  it('computes correct minute angle with seconds', () => {
    // 10:30 remaining = 10 minutes 30 seconds
    const angles = garde._computeAngles(10 * 60 * 1000 + 30 * 1000);
    // raw = 10.5*6 + (30/60)*6 = 63+3 = 66 → 360-66 = 294
    expect(angles.minute).toBe(294);
  });

  it('computes correct hour angle for 1 hour', () => {
    const angles = garde._computeAngles(60 * 60 * 1000);
    // 1 hour → raw 30° → 360-30 = 330°
    expect(angles.hour).toBe(330);
  });

  it('computes correct hour angle for 2.5 hours', () => {
    const angles = garde._computeAngles(2.5 * 60 * 60 * 1000);
    // raw 75° → 360-75 = 285°
    expect(angles.hour).toBe(285);
  });

  it('wraps hour angle at 12 hours', () => {
    const angles = garde._computeAngles(12 * 60 * 60 * 1000);
    // raw 0° → (360-0)%360 = 0°
    expect(angles.hour).toBe(0);
  });

  it('wraps minute angle at 60 minutes', () => {
    const angles = garde._computeAngles(60 * 60 * 1000);
    // minutesPart = 0 → raw 0° → (360-0)%360 = 0°
    expect(angles.minute).toBe(0);
  });

  it('handles negative time as 0', () => {
    const angles = garde._computeAngles(-5000);
    expect(angles.minute).toBe(0);
    expect(angles.hour).toBe(0);
  });

  it('computes seconds angle: 0s remaining → 0° (12 o\'clock)', () => {
    const angles = garde._computeAngles(0);
    expect(angles.second).toBe(0);
  });

  it('computes seconds angle: 45s remaining → 90° (3 o\'clock)', () => {
    // 45 seconds remaining → raw 45*6=270 → 360-270=90
    const angles = garde._computeAngles(45 * 1000);
    expect(angles.second).toBe(90);
  });

  it('computes seconds angle: 30s remaining → 180° (6 o\'clock)', () => {
    const angles = garde._computeAngles(30 * 1000);
    expect(angles.second).toBe(180);
  });

  it('computes seconds angle: 15s remaining → 270° (9 o\'clock)', () => {
    const angles = garde._computeAngles(15 * 1000);
    expect(angles.second).toBe(270);
  });

  it('seconds angle uses discrete ticks (floor)', () => {
    // 10.7 seconds remaining → floor(10.7)=10 → raw 60° → 360-60=300
    const angles = garde._computeAngles(10700);
    expect(angles.second).toBe(300);
  });
});

describe('Insa hand angle calculations', () => {
  let insa;

  beforeEach(() => {
    insa = new InsaClockRenderer();
  });

  it('matches Garde angle calculations', () => {
    const garde = new GardeClockRenderer();
    const testTimes = [0, 1000, 30000, 60000, 300000, 2700000, 3600000];
    for (const t of testTimes) {
      const gAngles = garde._computeAngles(t);
      const iAngles = insa._computeAngles(t);
      expect(iAngles.minute).toBe(gAngles.minute);
      expect(iAngles.hour).toBe(gAngles.hour);
    }
  });
});

describe('Renderer lifecycle', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
  });

  it('GardeClockRenderer builds SVG elements', () => {
    const renderer = new GardeClockRenderer();
    renderer.build(container, 'left');

    expect(container.querySelector('svg')).not.toBeNull();
    expect(container.classList.contains('garde-clock')).toBe(true);
    expect(container.classList.contains('analog-clock')).toBe(true);
  });

  it('InsaClockRenderer builds SVG elements with oscillator', () => {
    const renderer = new InsaClockRenderer();
    renderer.build(container, 'right');

    expect(container.querySelector('svg')).not.toBeNull();
    expect(container.classList.contains('insa-clock')).toBe(true);
    expect(container.querySelector('.insa-oscillator')).not.toBeNull();
  });

  it('GardeClockRenderer destroy cleans up classes', () => {
    const renderer = new GardeClockRenderer();
    renderer.build(container, 'left');
    renderer.destroy();

    expect(container.classList.contains('garde-clock')).toBe(false);
    expect(container.classList.contains('analog-clock')).toBe(false);
  });

  it('InsaClockRenderer destroy cleans up classes', () => {
    const renderer = new InsaClockRenderer();
    renderer.build(container, 'right');
    renderer.destroy();

    expect(container.classList.contains('insa-clock')).toBe(false);
    expect(container.classList.contains('analog-clock')).toBe(false);
  });

  it('GardeClockRenderer update sets hand transforms', () => {
    const renderer = new GardeClockRenderer();
    renderer.build(container, 'left');

    renderer.update({
      timeMs: 2700000, // 45 minutes
      isActive: true,
      isPaused: false,
      isFrozen: false,
      color: 'white',
      flagState: FlagState.NONE,
      moves: 0,
      showMoves: false,
      gameStatus: 'running',
    });

    const minuteHand = container.querySelector('.garde-hand-minute');
    // 45 min → 360 - 270 = 90° (3 o'clock, moves clockwise toward 12)
    expect(minuteHand.getAttribute('transform')).toBe('rotate(90)');
    expect(container.classList.contains('active')).toBe(true);
  });

  it('InsaClockRenderer update activates oscillator when active', () => {
    const renderer = new InsaClockRenderer();
    renderer.build(container, 'right');

    renderer.update({
      timeMs: 300000,
      isActive: true,
      isPaused: false,
      isFrozen: false,
      color: 'black',
      flagState: FlagState.NONE,
      moves: 5,
      showMoves: true,
      gameStatus: 'running',
    });

    const oscillator = container.querySelector('.insa-oscillator');
    expect(oscillator.classList.contains('oscillating')).toBe(true);
  });

  it('InsaClockRenderer stops oscillator when paused', () => {
    const renderer = new InsaClockRenderer();
    renderer.build(container, 'right');

    renderer.update({
      timeMs: 300000,
      isActive: true,
      isPaused: false,
      isFrozen: false,
      color: 'black',
      flagState: FlagState.NONE,
      moves: 0,
      showMoves: false,
      gameStatus: 'running',
    });

    renderer.update({
      timeMs: 300000,
      isActive: false,
      isPaused: true,
      isFrozen: false,
      color: 'black',
      flagState: FlagState.NONE,
      moves: 0,
      showMoves: false,
      gameStatus: 'paused',
    });

    const oscillator = container.querySelector('.insa-oscillator');
    expect(oscillator.classList.contains('oscillating')).toBe(false);
  });
});

describe('StorageManager clock face', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('defaults to digital', () => {
    expect(StorageManager.loadClockFace()).toBe(ClockFaceStyle.DIGITAL);
  });

  it('saves and loads clock face', () => {
    StorageManager.saveClockFace(ClockFaceStyle.GARDE);
    expect(StorageManager.loadClockFace()).toBe(ClockFaceStyle.GARDE);
  });

  it('saves and loads insa', () => {
    StorageManager.saveClockFace(ClockFaceStyle.INSA);
    expect(StorageManager.loadClockFace()).toBe(ClockFaceStyle.INSA);
  });

  it('returns digital for invalid value', () => {
    localStorage.setItem('tempomate_clock_face', 'invalid');
    expect(StorageManager.loadClockFace()).toBe(ClockFaceStyle.DIGITAL);
  });
});
