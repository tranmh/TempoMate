import { describe, it, expect, beforeEach } from '@jest/globals';
import { DigitalClockRenderer } from '../../src/js/ui/renderers/DigitalClockRenderer.js';
import { FlagState, TimingMethodType, GameStatus } from '../../src/js/utils/constants.js';

describe('DigitalClockRenderer', () => {
  let container;
  let r;

  const state = (over = {}) => ({
    timeMs: 300000,
    isActive: false,
    isPaused: false,
    isFrozen: false,
    color: 'white',
    flagState: FlagState.NONE,
    moves: 0,
    showMoves: false,
    byoMoments: 0,
    method: TimingMethodType.TIME,
    gameStatus: GameStatus.IDLE,
    ...over,
  });

  const timeText = () => container.querySelector('.clock-time').textContent;
  const ghostText = () => container.querySelector('.clock-ghost').textContent;

  beforeEach(() => {
    container = document.createElement('div');
    r = new DigitalClockRenderer();
    r.build(container, 'left');
  });

  it('builds header, time wrapper and footer', () => {
    expect(container.querySelector('.clock-header .clock-flag')).not.toBeNull();
    expect(container.querySelector('.clock-header .led-indicator')).not.toBeNull();
    expect(container.querySelector('.time-wrapper .clock-ghost')).not.toBeNull();
    expect(timeText()).toBe('0:00');
    expect(r.getTimeElement()).toBe(container.querySelector('.clock-time'));
    expect(r.getGhostElement()).toBe(container.querySelector('.clock-ghost'));
    expect(r.getFlagElement()).toBe(container.querySelector('.clock-flag'));
  });

  describe('time formatting boundaries', () => {
    it.each([
      [0, '0:00.0'],
      [-1500, '0:00.0'],
      [999, '0:00.9'],
      [9_950, '0:09.9'],
      [59_999, '0:59.9'],
      [60_000, '1:00'],
      [61_500, '1:01'],
      [19 * 60_000 + 59_000, '19:59'],
      [20 * 60_000, '20:00'],
      [3_599_999, '59:59'],
      [3_600_000, '1:00:00'],
      [3_600_000 + 5 * 60_000 + 7_000, '1:05:07'],
      [9 * 3_600_000 + 59 * 60_000 + 59_000, '9:59:59'],
    ])('%i ms renders as %j', (ms, expected) => {
      r.update(state({ timeMs: ms }));
      expect(timeText()).toBe(expected);
    });

    it('upcount shows no tenths under one minute', () => {
      r.update(state({ timeMs: 30_000, method: TimingMethodType.UPCOUNT }));
      expect(timeText()).toBe('0:30');
    });
  });

  describe('ghost text and font sync', () => {
    it('ghost mirrors the time with all digits as 8', () => {
      r.update(state({ timeMs: 3_600_000 + 5 * 60_000 + 7_000 }));
      expect(ghostText()).toBe('8:88:88');
    });

    it('requests a font re-sync only when the text length changes', () => {
      expect(r.update(state({ timeMs: 300_000 })).needSync).toBe(true); // first render 5:00
      expect(r.update(state({ timeMs: 299_000 })).needSync).toBe(false); // 4:59
      expect(r.update(state({ timeMs: 59_000 })).needSync).toBe(true); // 0:59.0
      expect(r.update(state({ timeMs: 59_000 })).needSync).toBe(false); // unchanged
    });
  });

  describe('warning classes', () => {
    const timeEl = () => container.querySelector('.clock-time');

    it('marks expired time at 0', () => {
      r.update(state({ timeMs: 0 }));
      expect(timeEl().classList.contains('time-expired')).toBe(true);
      expect(timeEl().classList.contains('time-low')).toBe(false);
    });

    it('marks low time at 10 seconds and below', () => {
      r.update(state({ timeMs: 10_000 }));
      expect(timeEl().classList.contains('time-low')).toBe(true);
      r.update(state({ timeMs: 10_001 }));
      expect(timeEl().classList.contains('time-low')).toBe(false);
    });

    it('upcount never shows expired or low', () => {
      r.update(state({ timeMs: 0, method: TimingMethodType.UPCOUNT }));
      expect(timeEl().classList.contains('time-expired')).toBe(false);
      r.update(state({ timeMs: 5_000, method: TimingMethodType.UPCOUNT }));
      expect(timeEl().classList.contains('time-low')).toBe(false);
    });
  });

  describe('state classes', () => {
    it('toggles active / paused / frozen on the container', () => {
      r.update(state({ isActive: true }));
      expect(container.classList.contains('active')).toBe(true);
      r.update(state({ isActive: false, isPaused: true }));
      expect(container.classList.contains('active')).toBe(false);
      expect(container.classList.contains('paused')).toBe(true);
      r.update(state({ isFrozen: true }));
      expect(container.classList.contains('paused')).toBe(false);
      expect(container.classList.contains('frozen')).toBe(true);
    });

    it('shows the piece color', () => {
      r.update(state({ color: 'black' }));
      const c = container.querySelector('.clock-color');
      expect(c.classList.contains('piece-black')).toBe(true);
      expect(c.getAttribute('aria-label')).toBe('black');
    });

    it.each([
      [FlagState.BLINKING, 'flag-blinking'],
      [FlagState.NON_BLINKING, 'flag-solid'],
      [FlagState.NONE, 'flag-hidden'],
    ])('flag state %s -> %s', (fs, cls) => {
      r.update(state({ flagState: FlagState.BLINKING }));
      r.update(state({ flagState: fs }));
      const flag = container.querySelector('.clock-flag');
      expect(flag.classList.contains(cls)).toBe(true);
      expect(['flag-blinking', 'flag-solid', 'flag-hidden'].filter((c) => flag.classList.contains(c))).toEqual([cls]);
    });
  });

  describe('footer', () => {
    it('shows moves only while showMoves is set', () => {
      const moves = () => container.querySelector('.clock-moves');
      r.update(state({ moves: 12, showMoves: true }));
      expect(moves().textContent).toBe('Moves: 12');
      expect(moves().classList.contains('hidden')).toBe(false);
      r.update(state({ moves: 13, showMoves: true }));
      expect(moves().textContent).toBe('Moves: 13');
      r.update(state({ moves: 13, showMoves: false }));
      expect(moves().classList.contains('hidden')).toBe(true);
    });

    it('shows remaining byo-yomi moments when > 0', () => {
      const byo = () => container.querySelector('.clock-byo');
      r.update(state({ byoMoments: 3 }));
      expect(byo().textContent).toBe('×3');
      expect(byo().classList.contains('hidden')).toBe(false);
      r.update(state({ byoMoments: 0 }));
      expect(byo().classList.contains('hidden')).toBe(true);
    });
  });

  it('destroy() releases element references', () => {
    r.destroy();
    expect(r.getTimeElement()).toBeNull();
    expect(r.getFlagElement()).toBeNull();
  });
});
