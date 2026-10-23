import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { SoundManager } from '../../src/js/ui/SoundManager.js';
import { SoundConfig } from '../../src/js/utils/constants.js';

/** Minimal fake of the Web Audio API used by SoundManager. */
class FakeAudioContext {
  constructor() {
    FakeAudioContext.instances.push(this);
    this.state = FakeAudioContext.initialState;
    this.currentTime = 0;
    this.destination = {};
    this.oscillators = [];
    this.resume = jest.fn(() => { this.state = 'running'; return Promise.resolve(); });
    this.close = jest.fn(() => Promise.resolve());
  }

  createOscillator() {
    const osc = {
      type: null,
      frequency: { setValueAtTime: jest.fn() },
      connect: jest.fn(),
      disconnect: jest.fn(),
      start: jest.fn(),
      stop: jest.fn(),
      onended: null,
    };
    this.oscillators.push(osc);
    return osc;
  }

  createGain() {
    return {
      gain: { setValueAtTime: jest.fn(), exponentialRampToValueAtTime: jest.fn() },
      connect: jest.fn(),
      disconnect: jest.fn(),
    };
  }
}
FakeAudioContext.instances = [];
FakeAudioContext.initialState = 'running';

const beeps = (ctx) => ctx.oscillators.map((o) => ({
  freq: o.frequency.setValueAtTime.mock.calls[0][0],
  durationS: o.stop.mock.calls[0][0] - o.start.mock.calls[0][0],
}));

describe('SoundManager', () => {
  let sm;
  let origAC;
  let origWebkit;

  beforeEach(() => {
    origAC = window.AudioContext;
    origWebkit = window.webkitAudioContext;
    FakeAudioContext.instances = [];
    FakeAudioContext.initialState = 'running';
    window.AudioContext = FakeAudioContext;
    delete window.webkitAudioContext;
    sm = new SoundManager();
  });

  afterEach(() => {
    if (origAC === undefined) delete window.AudioContext; else window.AudioContext = origAC;
    if (origWebkit === undefined) delete window.webkitAudioContext; else window.webkitAudioContext = origWebkit;
  });

  describe('enable / toggle', () => {
    it('is disabled by default and creates no AudioContext', () => {
      expect(sm.isEnabled()).toBe(false);
      expect(FakeAudioContext.instances.length).toBe(0);
    });

    it('toggle() enables, returns the new state and creates the context', () => {
      expect(sm.toggle()).toBe(true);
      expect(sm.isEnabled()).toBe(true);
      expect(FakeAudioContext.instances.length).toBe(1);
    });

    it('toggle() twice mutes again and reuses the context later', () => {
      sm.toggle();
      expect(sm.toggle()).toBe(false);
      expect(sm.isEnabled()).toBe(false);
      sm.toggle();
      expect(FakeAudioContext.instances.length).toBe(1);
    });

    it('setEnabled(false) does not create a context', () => {
      sm.setEnabled(false);
      expect(sm.isEnabled()).toBe(false);
      expect(FakeAudioContext.instances.length).toBe(0);
    });

    it('setEnabled(true) creates the context', () => {
      sm.setEnabled(true);
      expect(sm.isEnabled()).toBe(true);
      expect(FakeAudioContext.instances.length).toBe(1);
    });

    it('init() resumes a suspended context', () => {
      FakeAudioContext.initialState = 'suspended';
      sm.init();
      const ctx = FakeAudioContext.instances[0];
      expect(ctx.resume).toHaveBeenCalledTimes(1);
      sm.init();
      expect(FakeAudioContext.instances.length).toBe(1);
      expect(ctx.resume).toHaveBeenCalledTimes(1);
    });

    it('falls back to webkitAudioContext', () => {
      delete window.AudioContext;
      window.webkitAudioContext = FakeAudioContext;
      sm.init();
      expect(FakeAudioContext.instances.length).toBe(1);
    });
  });

  describe('when muted', () => {
    it('checkAndBeep plays nothing', () => {
      sm.init();
      const ctx = FakeAudioContext.instances[0];
      [10000, 5000, 4000, 1000, 500].forEach((ms) => sm.checkAndBeep(ms));
      expect(ctx.oscillators.length).toBe(0);
    });

    it('moment and period beeps play nothing', () => {
      sm.init();
      const ctx = FakeAudioContext.instances[0];
      sm.playMomentBeep();
      sm.playPeriodBeep();
      expect(ctx.oscillators.length).toBe(0);
    });
  });

  describe('checkAndBeep (enabled)', () => {
    let ctx;
    beforeEach(() => {
      sm.setEnabled(true);
      ctx = FakeAudioContext.instances[0];
    });

    it('no beep above 10 seconds', () => {
      sm.checkAndBeep(10001);
      sm.checkAndBeep(60000);
      expect(ctx.oscillators.length).toBe(0);
    });

    it('plays a single short warning beep at 10 seconds', () => {
      sm.checkAndBeep(10000);
      sm.checkAndBeep(9500);
      sm.checkAndBeep(8000);
      sm.checkAndBeep(5001);
      expect(beeps(ctx)).toEqual([
        { freq: SoundConfig.BEEP_FREQUENCY, durationS: SoundConfig.BEEP_DURATION_SHORT / 1000 },
      ]);
    });

    it('beeps once per second in the last 5 seconds', () => {
      const samples = [5000, 4900, 4500, 4001, 4000, 3500, 3000, 2000, 1500, 1001];
      samples.forEach((ms) => sm.checkAndBeep(ms));
      // seconds 5, 4, 3, 2 → four short beeps
      expect(ctx.oscillators.length).toBe(4);
      beeps(ctx).forEach((b) => expect(b.durationS).toBe(SoundConfig.BEEP_DURATION_SHORT / 1000));
    });

    it('plays a single long beep in the last second', () => {
      sm.checkAndBeep(1000);
      sm.checkAndBeep(600);
      sm.checkAndBeep(1);
      expect(beeps(ctx)).toEqual([
        { freq: SoundConfig.BEEP_FREQUENCY, durationS: SoundConfig.BEEP_DURATION_LONG / 1000 },
      ]);
    });

    it('does not beep at 0 or below', () => {
      sm.checkAndBeep(0);
      sm.checkAndBeep(-100);
      expect(ctx.oscillators.length).toBe(0);
    });

    it('full countdown from 12s to 0 produces warning + 4 countdown + final beeps', () => {
      for (let ms = 12000; ms >= 0; ms -= 100) sm.checkAndBeep(ms);
      const d = beeps(ctx).map((b) => b.durationS * 1000);
      expect(d).toEqual([
        SoundConfig.BEEP_DURATION_SHORT, // warning
        SoundConfig.BEEP_DURATION_SHORT, SoundConfig.BEEP_DURATION_SHORT,
        SoundConfig.BEEP_DURATION_SHORT, SoundConfig.BEEP_DURATION_SHORT,
        SoundConfig.BEEP_DURATION_LONG, // final second
      ]);
    });

    it('resetBeepState() allows the warning beep again (new turn)', () => {
      sm.checkAndBeep(9000);
      sm.resetBeepState();
      sm.checkAndBeep(9000);
      expect(ctx.oscillators.length).toBe(2);
    });

    it('starts the oscillator and disconnects nodes when it ends', () => {
      sm.checkAndBeep(10000);
      const osc = ctx.oscillators[0];
      expect(osc.type).toBe('square');
      expect(osc.start).toHaveBeenCalled();
      osc.onended();
      expect(osc.disconnect).toHaveBeenCalled();
    });
  });

  describe('special beeps (enabled)', () => {
    it('moment beep uses 1.5x frequency and long duration', () => {
      sm.setEnabled(true);
      sm.playMomentBeep();
      const ctx = FakeAudioContext.instances[0];
      expect(beeps(ctx)).toEqual([
        { freq: SoundConfig.BEEP_FREQUENCY * 1.5, durationS: SoundConfig.BEEP_DURATION_LONG / 1000 },
      ]);
    });

    it('period beep uses base frequency and long duration', () => {
      sm.setEnabled(true);
      sm.playPeriodBeep();
      const ctx = FakeAudioContext.instances[0];
      expect(beeps(ctx)).toEqual([
        { freq: SoundConfig.BEEP_FREQUENCY, durationS: SoundConfig.BEEP_DURATION_LONG / 1000 },
      ]);
    });
  });

  describe('error handling', () => {
    it('swallows errors thrown while building the beep', () => {
      sm.setEnabled(true);
      const ctx = FakeAudioContext.instances[0];
      ctx.createOscillator = () => { throw new Error('audio device lost'); };
      expect(() => sm.checkAndBeep(10000)).not.toThrow();
    });

    it('destroy() closes the context and a later beep re-creates it', () => {
      sm.setEnabled(true);
      const ctx = FakeAudioContext.instances[0];
      sm.destroy();
      expect(ctx.close).toHaveBeenCalledTimes(1);
      sm.playPeriodBeep();
      expect(FakeAudioContext.instances.length).toBe(2);
    });

    it('destroy() without a context does nothing', () => {
      expect(() => sm.destroy()).not.toThrow();
    });

    // aqaa: suspected bug: init() runs `new (window.AudioContext || window.webkitAudioContext)()`
    // without a guard, so it throws a TypeError when the Web Audio API is unavailable.
    // App._handleClockTap calls soundManager.init() before starting the game, so the clock
    // cannot be started at all in such an environment.
    it.skip('aqaa: open bug, see report - init()/setEnabled() do not throw when AudioContext is unavailable', () => {
      delete window.AudioContext;
      delete window.webkitAudioContext;
      expect(() => sm.init()).not.toThrow();
      expect(() => sm.setEnabled(true)).not.toThrow();
      expect(() => sm.checkAndBeep(10000)).not.toThrow();
    });
  });
});
