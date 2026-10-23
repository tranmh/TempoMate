import { describe, it, expect, beforeEach } from '@jest/globals';
import { StatusBar } from '../../src/js/ui/StatusBar.js';
import { GameStatus, TimingMethodType } from '../../src/js/utils/constants.js';

describe('StatusBar', () => {
  let el;
  let bar;

  const state = (over = {}) => ({
    leftMethod: TimingMethodType.TIME,
    rightMethod: TimingMethodType.TIME,
    leftPeriod: 0,
    rightPeriod: 0,
    totalPeriods: 1,
    freezeEnabled: false,
    soundEnabled: false,
    optionNumber: 1,
    moveNumber: 0,
    gameStatus: GameStatus.IDLE,
    delayRemainingMs: 0,
    ...over,
  });

  const q = (sel) => el.querySelector(sel);
  const leftMethod = () => q('.status-left .status-method');
  const rightMethod = () => q('.status-right .status-method');
  const leftPeriod = () => q('.status-left .status-period');
  const rightPeriod = () => q('.status-right .status-period');

  beforeEach(() => {
    document.body.innerHTML = '<div id="status-bar"></div>';
    el = document.getElementById('status-bar');
    bar = new StatusBar(el);
  });

  it('builds the left/center/right structure', () => {
    expect(el.classList.contains('status-bar')).toBe(true);
    expect(q('.status-left')).not.toBeNull();
    expect(q('.status-center')).not.toBeNull();
    expect(q('.status-right')).not.toBeNull();
    expect(q('.freeze-icon').getAttribute('aria-label')).toBe('Freeze mode enabled');
  });

  describe('method labels and periods', () => {
    it('shows the method per player', () => {
      bar.update(state({ leftMethod: TimingMethodType.FISCHER, rightMethod: TimingMethodType.BYO_YOMI }));
      expect(leftMethod().textContent).toBe('FISCH');
      expect(rightMethod().textContent).toBe('BYO');
    });

    it('shows an empty label for a missing method', () => {
      bar.update(state({ leftMethod: undefined }));
      expect(leftMethod().textContent).toBe('');
    });

    it('hides period numbers for single-period controls', () => {
      bar.update(state({ totalPeriods: 1 }));
      expect(leftPeriod().textContent).toBe('');
      expect(rightPeriod().textContent).toBe('');
    });

    it('shows 1-based period numbers for multi-period controls', () => {
      bar.update(state({ totalPeriods: 2, leftPeriod: 0, rightPeriod: 1 }));
      expect(leftPeriod().textContent).toBe('P1');
      expect(rightPeriod().textContent).toBe('P2');
    });
  });

  describe('option and move number', () => {
    it('shows a zero-padded option number', () => {
      bar.update(state({ optionNumber: 5 }));
      expect(q('.status-option').textContent).toBe('#05');
      bar.update(state({ optionNumber: 27 }));
      expect(q('.status-option').textContent).toBe('#27');
    });

    it('hides the move number at 0', () => {
      bar.update(state({ moveNumber: 0 }));
      expect(q('.status-move').textContent).toBe('');
    });

    it('shows the move number when > 0', () => {
      bar.update(state({ moveNumber: 1 }));
      expect(q('.status-move').textContent).toBe('M1');
      bar.update(state({ moveNumber: 42 }));
      expect(q('.status-move').textContent).toBe('M42');
    });
  });

  describe('game status indicator', () => {
    it.each([
      [GameStatus.IDLE, '▶'],
      [GameStatus.RUNNING, '▶'],
      [GameStatus.PAUSED, '⏸'],
      [GameStatus.FROZEN, '⚠'],
      [GameStatus.CORRECTING, '✎'],
      ['bogus', ''],
    ])('status %s shows %j', (status, icon) => {
      bar.update(state({ gameStatus: status }));
      expect(q('.status-state').textContent).toBe(icon);
    });
  });

  describe('icons', () => {
    it('freeze and sound icons follow the flags', () => {
      bar.update(state({ freezeEnabled: false, soundEnabled: false }));
      expect(q('.freeze-icon').classList.contains('hidden')).toBe(true);
      expect(q('.sound-icon').classList.contains('hidden')).toBe(true);
      bar.update(state({ freezeEnabled: true, soundEnabled: true }));
      expect(q('.freeze-icon').classList.contains('hidden')).toBe(false);
      expect(q('.sound-icon').classList.contains('hidden')).toBe(false);
    });
  });

  describe('delay display', () => {
    it('shows the US delay countdown with one decimal', () => {
      bar.update(state({ delayRemainingMs: 1500 }));
      expect(q('.status-delay').textContent).toBe('DLY 1.5');
      expect(q('.status-delay').classList.contains('hidden')).toBe(false);
    });

    it('hides the delay at 0 or when undefined', () => {
      bar.update(state({ delayRemainingMs: 1500 }));
      bar.update(state({ delayRemainingMs: 0 }));
      expect(q('.status-delay').classList.contains('hidden')).toBe(true);
      bar.update(state({ delayRemainingMs: 200 }));
      bar.update(state({ delayRemainingMs: undefined }));
      expect(q('.status-delay').classList.contains('hidden')).toBe(true);
    });
  });

  describe('dirty-checking (B20)', () => {
    it('does not touch the DOM when the state is unchanged', () => {
      bar.update(state({ optionNumber: 3, moveNumber: 2 }));
      // Tamper with the DOM: an unchanged update must not rewrite it
      q('.status-option').textContent = 'tampered';
      q('.status-move').textContent = 'tampered';
      bar.update(state({ optionNumber: 3, moveNumber: 2 }));
      expect(q('.status-option').textContent).toBe('tampered');
      expect(q('.status-move').textContent).toBe('tampered');
    });

    it('rewrites only the fields that changed', () => {
      bar.update(state({ optionNumber: 3, moveNumber: 2 }));
      q('.status-option').textContent = 'tampered';
      bar.update(state({ optionNumber: 3, moveNumber: 3 }));
      expect(q('.status-option').textContent).toBe('tampered');
      expect(q('.status-move').textContent).toBe('M3');
    });
  });

  describe('temporary messages', () => {
    it('showMessage replaces the center content and hides icons', () => {
      bar.update(state({ freezeEnabled: true, soundEnabled: true, optionNumber: 4, moveNumber: 7 }));
      bar.showMessage('Tap again to reset');
      expect(q('.status-state').textContent).toBe('Tap again to reset');
      expect(q('.status-option').textContent).toBe('');
      expect(q('.status-move').textContent).toBe('');
      expect(q('.freeze-icon').classList.contains('hidden')).toBe(true);
      expect(q('.sound-icon').classList.contains('hidden')).toBe(true);
    });

    it('update() does not overwrite a showing message', () => {
      bar.showMessage('hello');
      bar.update(state({ optionNumber: 9, gameStatus: GameStatus.PAUSED }));
      expect(q('.status-state').textContent).toBe('hello');
      expect(q('.status-option').textContent).toBe('');
    });

    it('after clearMessage, a changed state is rendered again', () => {
      bar.showMessage('hello');
      bar.clearMessage();
      bar.update(state({ optionNumber: 9, gameStatus: GameStatus.PAUSED }));
      expect(q('.status-state').textContent).toBe('⏸');
      expect(q('.status-option').textContent).toBe('#09');
    });

    // aqaa: suspected bug: showMessage() blanks the option/move text, overwrites the state
    // indicator and hides the icons, but clearMessage() does not reset the dirty-check cache.
    // The next update() with an unchanged state therefore skips every field: the message
    // (e.g. "Tap again to reset") stays on screen and the option number and icons stay hidden.
    // In the app this happens when the reset confirmation times out while paused (B22).
    it.skip('aqaa: open bug, see report - clearMessage() + update(sameState) restores the status bar [B22]', () => {
      const s = state({ freezeEnabled: true, soundEnabled: true, optionNumber: 4, moveNumber: 7, gameStatus: GameStatus.PAUSED });
      bar.update(s);
      bar.showMessage('Tap again to reset');
      bar.clearMessage();
      bar.update(s);
      expect(q('.status-state').textContent).toBe('⏸');
      expect(q('.status-option').textContent).toBe('#04');
      expect(q('.status-move').textContent).toBe('M7');
      expect(q('.freeze-icon').classList.contains('hidden')).toBe(false);
      expect(q('.sound-icon').classList.contains('hidden')).toBe(false);
    });
  });
});
