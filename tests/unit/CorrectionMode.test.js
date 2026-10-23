import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { CorrectionMode } from '../../src/js/ui/CorrectionMode.js';

// Field order (see CorrectionMode FIELDS)
const F = {
  leftHours: 0, leftMinutes: 1, leftSeconds: 2,
  rightHours: 3, rightMinutes: 4, rightSeconds: 5,
  leftMoves: 6, rightMoves: 7, leftPeriod: 8, rightPeriod: 9,
};

const hms = (h, m, s) => (h * 3600 + m * 60 + s) * 1000;

describe('CorrectionMode', () => {
  let overlay;
  let cm;
  let onSave;
  let onCancel;

  const baseState = (over = {}) => ({
    leftTimeMs: hms(1, 2, 3),
    rightTimeMs: hms(0, 4, 59),
    leftMoves: 10,
    rightMoves: 9,
    leftPeriod: 0,
    rightPeriod: 0,
    totalPeriods: 1,
    ...over,
  });

  const fields = () => [...overlay.querySelectorAll('.correction-field')];
  const text = (i) => fields()[i].textContent;
  const goTo = (index) => fields()[index].dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));

  beforeEach(() => {
    document.body.innerHTML = '<div id="correction-overlay" class="hidden"></div>';
    overlay = document.getElementById('correction-overlay');
    cm = new CorrectionMode(overlay);
    onSave = jest.fn();
    onCancel = jest.fn();
  });

  describe('enter()', () => {
    it('shows the overlay and becomes active', () => {
      expect(cm.isActive()).toBe(false);
      cm.enter(baseState(), onSave, onCancel);
      expect(cm.isActive()).toBe(true);
      expect(overlay.classList.contains('hidden')).toBe(false);
      expect(overlay.querySelector('.correction-title').textContent).toBe('Time Correction');
    });

    it('splits times into zero-padded h/m/s fields and pads moves to 3 digits', () => {
      cm.enter(baseState({ totalPeriods: 2 }), onSave, onCancel);
      expect(fields().map((f) => f.textContent)).toEqual([
        '01', '02', '03', '00', '04', '59', '010', '009', '00', '00',
      ]);
    });

    it('drops sub-second remainder (floors to whole seconds)', () => {
      cm.enter(baseState({ leftTimeMs: 59999 }), onSave, onCancel);
      expect(text(F.leftMinutes)).toBe('00');
      expect(text(F.leftSeconds)).toBe('59');
    });

    it('shows negative time as 00:00:00', () => {
      cm.enter(baseState({ leftTimeMs: -5000 }), onSave, onCancel);
      expect([text(0), text(1), text(2)]).toEqual(['00', '00', '00']);
    });

    it('highlights the first field', () => {
      cm.enter(baseState(), onSave, onCancel);
      expect(fields()[0].classList.contains('correction-active')).toBe(true);
      expect(overlay.querySelectorAll('.correction-active').length).toBe(1);
    });

    it('hides the period row for single-period controls', () => {
      cm.enter(baseState({ totalPeriods: 1 }), onSave, onCancel);
      expect(overlay.querySelector('.correction-period-row')).toBeNull();
    });

    it('shows the period row with the 0-based period index for multi-period controls', () => {
      cm.enter(baseState({ totalPeriods: 3, leftPeriod: 1, rightPeriod: 2 }), onSave, onCancel);
      const row = overlay.querySelector('.correction-period-row');
      expect(row).not.toBeNull();
      expect(text(F.leftPeriod)).toBe('01');
      expect(text(F.rightPeriod)).toBe('02');
    });
  });

  describe('navigation', () => {
    beforeEach(() => cm.enter(baseState({ totalPeriods: 2 }), onSave, onCancel));

    const activeIndex = () => fields().findIndex((f) => f.classList.contains('correction-active'));

    it('nextField moves the highlight forward', () => {
      cm.nextField();
      expect(activeIndex()).toBe(1);
    });

    it('nextField wraps from the last to the first field', () => {
      for (let i = 0; i < 10; i++) cm.nextField();
      expect(activeIndex()).toBe(0);
    });

    it('prevField wraps from the first to the last field', () => {
      cm.prevField();
      expect(activeIndex()).toBe(9);
    });

    it('clicking a field selects it', () => {
      goTo(F.rightSeconds);
      expect(activeIndex()).toBe(F.rightSeconds);
    });

    it('the touch control buttons navigate and adjust', () => {
      overlay.querySelector('button[title="Next field"]').click();
      expect(activeIndex()).toBe(1);
      overlay.querySelector('button[title="Previous field"]').click();
      expect(activeIndex()).toBe(0);
      overlay.querySelector('button[title="Increase"]').click();
      expect(text(F.leftHours)).toBe('02');
      overlay.querySelector('button[title="Decrease"]').click();
      expect(text(F.leftHours)).toBe('01');
    });
  });

  describe('adjusting values (boundaries)', () => {
    it('hours are clamped to 0..9', () => {
      cm.enter(baseState({ leftTimeMs: hms(8, 0, 0) }), onSave, onCancel);
      cm.increment();
      cm.increment();
      cm.increment();
      expect(text(F.leftHours)).toBe('09');
      for (let i = 0; i < 12; i++) cm.decrement();
      expect(text(F.leftHours)).toBe('00');
    });

    it('minutes are clamped to 0..59', () => {
      cm.enter(baseState({ leftTimeMs: hms(0, 58, 0) }), onSave, onCancel);
      goTo(F.leftMinutes);
      cm.increment();
      cm.increment();
      expect(text(F.leftMinutes)).toBe('59');
      cm.enter(baseState({ leftTimeMs: hms(0, 0, 0) }), onSave, onCancel);
      goTo(F.leftMinutes);
      cm.decrement();
      expect(text(F.leftMinutes)).toBe('00');
    });

    it('seconds are clamped to 0..59 and do not carry into minutes', () => {
      cm.enter(baseState({ rightTimeMs: hms(0, 4, 59) }), onSave, onCancel);
      goTo(F.rightSeconds);
      cm.increment();
      expect(text(F.rightSeconds)).toBe('59');
      expect(text(F.rightMinutes)).toBe('04');
    });

    it('move counts never go below 0', () => {
      cm.enter(baseState({ leftMoves: 0, rightMoves: 0 }), onSave, onCancel);
      goTo(F.rightMoves);
      cm.decrement();
      expect(text(F.rightMoves)).toBe('000');
      goTo(F.leftMoves);
      cm.decrement();
      expect(text(F.leftMoves)).toBe('000');
      expect(text(F.rightMoves)).toBe('000');
    });

    it('changing left moves also shifts right moves (linked)', () => {
      cm.enter(baseState({ leftMoves: 10, rightMoves: 9 }), onSave, onCancel);
      goTo(F.leftMoves);
      cm.increment();
      expect(text(F.leftMoves)).toBe('011');
      expect(text(F.rightMoves)).toBe('010');
      cm.decrement();
      cm.decrement();
      expect(text(F.leftMoves)).toBe('009');
      expect(text(F.rightMoves)).toBe('008');
    });

    it('linked right moves are clamped at 0 when left moves decrease', () => {
      cm.enter(baseState({ leftMoves: 3, rightMoves: 0 }), onSave, onCancel);
      goTo(F.leftMoves);
      cm.decrement();
      expect(text(F.leftMoves)).toBe('002');
      expect(text(F.rightMoves)).toBe('000');
    });

    it('changing right moves does not affect left moves', () => {
      cm.enter(baseState({ leftMoves: 10, rightMoves: 9 }), onSave, onCancel);
      goTo(F.rightMoves);
      cm.increment();
      expect(text(F.rightMoves)).toBe('010');
      expect(text(F.leftMoves)).toBe('010');
    });

    it('period is clamped to 0..totalPeriods-1', () => {
      cm.enter(baseState({ totalPeriods: 3 }), onSave, onCancel);
      goTo(F.leftPeriod);
      cm.decrement();
      expect(text(F.leftPeriod)).toBe('00');
      cm.increment();
      cm.increment();
      cm.increment();
      expect(text(F.leftPeriod)).toBe('02');
    });

    it('period stays 0 for single-period controls', () => {
      cm.enter(baseState({ totalPeriods: 1 }), onSave, onCancel);
      cm.prevField(); // right period
      cm.increment();
      cm.save();
      expect(onSave.mock.calls[0][0].rightPeriod).toBe(0);
    });
  });

  describe('save()', () => {
    it('reports the unchanged values when nothing was edited', () => {
      cm.enter(baseState(), onSave, onCancel);
      cm.save();
      expect(onSave).toHaveBeenCalledWith({
        leftTimeMs: hms(1, 2, 3),
        rightTimeMs: hms(0, 4, 59),
        leftMoves: 10,
        rightMoves: 9,
        leftPeriod: 0,
        rightPeriod: 0,
      });
    });

    it('converts edited h/m/s back to milliseconds', () => {
      cm.enter(baseState(), onSave, onCancel);
      cm.increment(); // left hours 1 -> 2
      goTo(F.rightMinutes);
      cm.decrement(); // right minutes 4 -> 3
      goTo(F.rightSeconds);
      cm.decrement(); // right seconds 59 -> 58
      cm.save();
      const v = onSave.mock.calls[0][0];
      expect(v.leftTimeMs).toBe(hms(2, 2, 3));
      expect(v.rightTimeMs).toBe(hms(0, 3, 58));
    });

    it('exits and hides/clears the overlay', () => {
      cm.enter(baseState(), onSave, onCancel);
      cm.save();
      expect(cm.isActive()).toBe(false);
      expect(overlay.classList.contains('hidden')).toBe(true);
      expect(overlay.innerHTML).toBe('');
      expect(onCancel).not.toHaveBeenCalled();
    });

    it('the Save button saves', () => {
      cm.enter(baseState(), onSave, onCancel);
      [...overlay.querySelectorAll('button')].find((b) => b.textContent === 'Save').click();
      expect(onSave).toHaveBeenCalledTimes(1);
      expect(cm.isActive()).toBe(false);
    });

    it('is ignored when not active', () => {
      cm.save();
      expect(onSave).not.toHaveBeenCalled();
    });

    it('works without a save callback', () => {
      cm.enter(baseState(), null, null);
      expect(() => cm.save()).not.toThrow();
      expect(cm.isActive()).toBe(false);
    });
  });

  describe('cancel()', () => {
    it('calls onCancel, not onSave, and exits', () => {
      cm.enter(baseState(), onSave, onCancel);
      cm.increment();
      cm.cancel();
      expect(onCancel).toHaveBeenCalledTimes(1);
      expect(onSave).not.toHaveBeenCalled();
      expect(cm.isActive()).toBe(false);
      expect(overlay.classList.contains('hidden')).toBe(true);
    });

    it('the Cancel button cancels', () => {
      cm.enter(baseState(), onSave, onCancel);
      [...overlay.querySelectorAll('button')].find((b) => b.textContent === 'Cancel').click();
      expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it('re-entering discards edits from a cancelled session', () => {
      cm.enter(baseState(), onSave, onCancel);
      cm.increment();
      cm.cancel();
      cm.enter(baseState(), onSave, onCancel);
      expect(text(F.leftHours)).toBe('01');
    });
  });

  describe('when inactive', () => {
    it('navigation and adjustments are no-ops', () => {
      expect(() => {
        cm.nextField();
        cm.prevField();
        cm.increment();
        cm.decrement();
      }).not.toThrow();
      expect(overlay.innerHTML).toBe('');
    });
  });
});
