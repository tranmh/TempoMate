import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { App } from '../../src/js/app.js';
import { GameStatus, Player, FlagState, StorageKeys, TimingMethodType, UIConfig } from '../../src/js/utils/constants.js';
import { StorageManager } from '../../src/js/storage/StorageManager.js';

/*
 * App wiring tests. The real engine/state/UI modules are used; only browser
 * boundaries are faked: requestAnimationFrame, performance.now, ResizeObserver,
 * matchMedia and AudioContext.
 */

const BODY = `
  <div id="app">
    <button id="btn-settings"></button>
    <button id="btn-pause" disabled></button>
    <button id="btn-reset"></button>
    <button id="btn-sound"></button>
    <button id="btn-theme"></button>
    <button id="btn-rotate"></button>
    <div id="clock-container"></div>
    <div id="status-bar"></div>
  </div>
  <div id="settings-panel" class="hidden"></div>
  <div id="correction-overlay" class="hidden"></div>
`;

class FakeResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

class FakeAudioContext {
  constructor() {
    this.state = 'running';
    this.currentTime = 0;
    this.destination = {};
  }
  resume() { return Promise.resolve(); }
  close() { return Promise.resolve(); }
  createOscillator() {
    return {
      frequency: { setValueAtTime() {} }, connect() {}, disconnect() {}, start() {}, stop() {},
    };
  }
  createGain() {
    return { gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {}, disconnect() {} };
  }
}

describe('App wiring', () => {
  let app;
  let frames;
  let nextFrameId;
  let clock;
  let saved;

  const runFrame = (advanceMs) => {
    clock.perf += advanceMs;
    const cbs = [...frames.values()];
    frames.clear();
    cbs.forEach((cb) => cb(clock.perf));
  };
  const engineFramePending = () => app.timerEngine._rafId !== null && frames.has(app.timerEngine._rafId);

  const press = (k, target = document) => {
    target.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));
    target.dispatchEvent(new KeyboardEvent('keyup', { key: k, bubbles: true, cancelable: true }));
  };
  const face = (side) => document.querySelector(`.clock-${side}`);
  const tap = (side) => face(side).dispatchEvent(new MouseEvent('click', { bubbles: true }));
  const timeText = (side) => document.querySelector(`.clock-${side} .clock-time`).textContent;
  const gs = () => app.gameState;
  const startApp = () => {
    app = new App();
    app.init();
  };

  const useFakeTimeouts = () => jest.useFakeTimers({
    doNotFake: ['Date', 'performance', 'requestAnimationFrame', 'cancelAnimationFrame', 'hrtime', 'nextTick', 'queueMicrotask'],
  });

  beforeEach(() => {
    localStorage.clear();
    document.body.innerHTML = BODY;
    document.documentElement.removeAttribute('data-theme');

    saved = {
      raf: global.requestAnimationFrame,
      caf: global.cancelAnimationFrame,
      ro: global.ResizeObserver,
      mm: window.matchMedia,
      ac: window.AudioContext,
    };
    frames = new Map();
    nextFrameId = 1;
    clock = { perf: 1000 };
    global.requestAnimationFrame = (cb) => { const id = nextFrameId++; frames.set(id, cb); return id; };
    global.cancelAnimationFrame = (id) => { frames.delete(id); };
    jest.spyOn(performance, 'now').mockImplementation(() => clock.perf);
    global.ResizeObserver = FakeResizeObserver;
    window.matchMedia = (q) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {} });
    window.AudioContext = FakeAudioContext;
  });

  afterEach(() => {
    if (app) app.destroy();
    app = null;
    jest.useRealTimers();
    jest.restoreAllMocks();
    global.requestAnimationFrame = saved.raf;
    global.cancelAnimationFrame = saved.caf;
    global.ResizeObserver = saved.ro;
    if (saved.mm === undefined) delete window.matchMedia; else window.matchMedia = saved.mm;
    if (saved.ac === undefined) delete window.AudioContext; else window.AudioContext = saved.ac;
  });

  describe('init()', () => {
    it('starts IDLE with option 1 (5 min) when nothing is stored', () => {
      startApp();
      expect(gs().status).toBe(GameStatus.IDLE);
      expect(gs().selectedOption).toBe(1);
      expect(gs().left.timeMs).toBe(300000);
      expect(gs().right.timeMs).toBe(300000);
      expect(timeText('left')).toBe('5:00');
      expect(document.querySelector('.status-option').textContent).toBe('#01');
      expect(document.getElementById('btn-pause').disabled).toBe(true);
      expect(app.timerEngine.isRunning()).toBe(false);
    });

    it('restores the last selected preset', () => {
      localStorage.setItem(StorageKeys.LAST_OPTION, '2');
      startApp();
      expect(gs().selectedOption).toBe(2);
      expect(gs().left.timeMs).toBe(600000);
    });

    it('restores a saved custom option (27-31) across reload (B10)', () => {
      StorageManager.saveCustomOption(0, { name: 'Mine', periods: [{ method: TimingMethodType.TIME, timeMs: 90000 }] });
      localStorage.setItem(StorageKeys.LAST_OPTION, '27');
      startApp();
      expect(gs().selectedOption).toBe(27);
      expect(gs().left.timeMs).toBe(90000);
    });

    it('falls back to option 1 when the stored custom slot is empty', () => {
      localStorage.setItem(StorageKeys.LAST_OPTION, '28');
      startApp();
      expect(gs().selectedOption).toBe(1);
      expect(gs().left.timeMs).toBe(300000);
    });

    it('applies the theme to the document', () => {
      startApp();
      expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    });
  });

  describe('starting and switching turns (B1, B4)', () => {
    beforeEach(startApp);

    it('tapping a clock face in IDLE starts the opponent clock', () => {
      tap('left');
      expect(gs().status).toBe(GameStatus.RUNNING);
      expect(gs().activePlayer).toBe(Player.RIGHT);
      expect(gs().left.color).toBe('white');
      expect(app.timerEngine.isRunning()).toBe(true);
      expect(face('right').classList.contains('active')).toBe(true);
      expect(document.getElementById('btn-pause').disabled).toBe(false);
    });

    it('tapping the right face in IDLE starts the left clock', () => {
      tap('right');
      expect(gs().activePlayer).toBe(Player.LEFT);
      expect(gs().right.color).toBe('white');
    });

    it('Space in IDLE starts the game (right player clock runs)', () => {
      press(' ');
      expect(gs().status).toBe(GameStatus.RUNNING);
      expect(gs().activePlayer).toBe(Player.RIGHT);
    });

    it('tapping the active clock switches turns and counts the move', () => {
      tap('left');
      tap('right');
      expect(gs().activePlayer).toBe(Player.LEFT);
      expect(gs().right.moves).toBe(1);
      expect(face('left').classList.contains('active')).toBe(true);
      expect(face('right').classList.contains('active')).toBe(false);
    });

    it('tapping the inactive clock is ignored', () => {
      tap('left');
      tap('left');
      expect(gs().activePlayer).toBe(Player.RIGHT);
      expect(gs().right.moves).toBe(0);
      expect(gs().left.moves).toBe(0);
    });

    it.each([' ', 'Enter'])('key %j switches turns while running', (k) => {
      tap('left');
      press(k);
      expect(gs().activePlayer).toBe(Player.LEFT);
      press(k);
      expect(gs().activePlayer).toBe(Player.RIGHT);
    });

    // aqaa: suspected bug: the clock faces are focusable role="button" elements whose own
    // keydown handler emits clockTap for Space/Enter but does not stop propagation. The same
    // keydown then bubbles to the document handler, which emits switchTurn. With the active
    // face focused, one Space press switches the turn twice, i.e. not at all (B4, B5).
    it.skip('aqaa: open bug, see report - Space on the focused active clock face switches turns exactly once [B4, B5]', () => {
      tap('left'); // right is running
      face('right').focus();
      press(' ', face('right'));
      expect(gs().activePlayer).toBe(Player.LEFT);
      expect(gs().right.moves).toBe(1);
    });
  });

  describe('timing', () => {
    beforeEach(startApp);

    it('ticks only the active player clock', () => {
      tap('left'); // right runs
      runFrame(1000);
      runFrame(500);
      expect(gs().right.timeMs).toBe(298500);
      expect(gs().left.timeMs).toBe(300000);
      expect(timeText('right')).toBe('4:58');
    });

    it('a single huge frame gap is clamped to 1 second', () => {
      tap('left');
      runFrame(10_000);
      expect(gs().right.timeMs).toBe(299000);
    });

    it('after switching, the other clock runs', () => {
      tap('left');
      runFrame(1000);
      tap('right');
      runFrame(1000);
      expect(gs().right.timeMs).toBe(299000);
      expect(gs().left.timeMs).toBe(299000);
    });
  });

  describe('pause / resume (B1)', () => {
    beforeEach(startApp);

    it('P pauses the running clock and stops the timer', () => {
      tap('left');
      press('p');
      expect(gs().status).toBe(GameStatus.PAUSED);
      expect(app.timerEngine.isRunning()).toBe(false);
      expect(engineFramePending()).toBe(false);
      runFrame(1000);
      expect(gs().right.timeMs).toBe(300000);
      expect(document.getElementById('btn-pause').title).toBe('Resume (P)');
    });

    it('P again resumes without losing or adding time', () => {
      tap('left');
      runFrame(1000);
      press('P');
      clock.perf += 60_000; // time passes while paused
      press('P');
      expect(gs().status).toBe(GameStatus.RUNNING);
      runFrame(100);
      expect(gs().right.timeMs).toBe(298900);
    });

    it('P in IDLE does nothing', () => {
      press('p');
      expect(gs().status).toBe(GameStatus.IDLE);
    });

    it('taps and Space are ignored while paused', () => {
      tap('left');
      press('p');
      tap('right');
      press(' ');
      expect(gs().status).toBe(GameStatus.PAUSED);
      expect(gs().activePlayer).toBe(Player.RIGHT);
    });

    it('the pause button tap toggles pause', () => {
      tap('left');
      const btn = document.getElementById('btn-pause');
      btn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
      btn.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
      expect(gs().status).toBe(GameStatus.PAUSED);
    });

    it('Escape pauses a running game', () => {
      tap('left');
      press('Escape');
      expect(gs().status).toBe(GameStatus.PAUSED);
    });
  });

  describe('expiry (B2)', () => {
    beforeEach(startApp);

    it('with freeze enabled, expiry sets a blinking flag, freezes and stops the clock', () => {
      app._selectOption({ periods: [{ method: TimingMethodType.TIME, timeMs: 1500 }], freezeDefault: true }, 27);
      tap('left'); // right runs
      runFrame(1000);
      expect(gs().status).toBe(GameStatus.RUNNING);
      runFrame(1000);
      expect(gs().status).toBe(GameStatus.FROZEN);
      expect(gs().right.timeMs).toBe(0);
      expect(gs().right.flagState).toBe(FlagState.BLINKING);
      expect(app.timerEngine.isRunning()).toBe(false);
      expect(face('right').classList.contains('frozen')).toBe(true);
      expect(document.querySelector('.status-state').textContent).toBe('⚠');
    });

    it('a frozen clock ignores taps, Space and pause', () => {
      app._selectOption({ periods: [{ method: TimingMethodType.TIME, timeMs: 500 }], freezeDefault: true }, 27);
      tap('left');
      runFrame(1000);
      tap('right');
      press(' ');
      press('p');
      expect(gs().status).toBe(GameStatus.FROZEN);
      expect(gs().activePlayer).toBe(Player.RIGHT);
      expect(gs().left.timeMs).toBe(500);
    });

    it('without freeze, the flag is shown but the game keeps running', () => {
      app._selectOption({ periods: [{ method: TimingMethodType.TIME, timeMs: 500 }], freezeDefault: false }, 27);
      tap('left');
      runFrame(1000);
      expect(gs().right.flagState).toBe(FlagState.BLINKING);
      expect(gs().status).toBe(GameStatus.RUNNING);
      tap('right');
      expect(gs().activePlayer).toBe(Player.LEFT);
    });

    it('does not freeze on expiry of a non-final period', () => {
      app._selectOption({
        periods: [
          { method: TimingMethodType.TIME, timeMs: 500 },
          { method: TimingMethodType.TIME, timeMs: 60000 },
        ],
        freezeDefault: true,
      }, 27);
      tap('left');
      runFrame(1000);
      expect(gs().status).toBe(GameStatus.RUNNING);
      expect(gs().right.currentPeriod).toBe(1);
      expect(gs().right.flagState).toBe(FlagState.NON_BLINKING);
      expect(gs().right.timeMs).toBe(60000);
    });

    it('F toggles freeze before the start but not afterwards', () => {
      expect(gs().freezeEnabled).toBe(false);
      press('f');
      expect(gs().freezeEnabled).toBe(true);
      tap('left');
      press('F');
      expect(gs().freezeEnabled).toBe(true);
    });
  });

  describe('reset (B3)', () => {
    beforeEach(startApp);

    it('R in IDLE does nothing', () => {
      press('r');
      expect(app._resetPending).toBe(false);
      expect(document.querySelector('.status-state').textContent).not.toBe('Tap again to reset');
    });

    it('first R asks for confirmation, second R resets to IDLE', () => {
      tap('left');
      runFrame(1000);
      tap('right');
      press('r');
      expect(gs().status).toBe(GameStatus.RUNNING);
      expect(document.querySelector('.status-state').textContent).toBe('Tap again to reset');
      expect(document.getElementById('btn-reset').classList.contains('confirm-active')).toBe(true);
      press('R');
      expect(gs().status).toBe(GameStatus.IDLE);
      expect(gs().activePlayer).toBeNull();
      expect(gs().left.timeMs).toBe(300000);
      expect(gs().right.timeMs).toBe(300000);
      expect(gs().right.moves).toBe(0);
      expect(app.timerEngine.isRunning()).toBe(false);
      expect(document.getElementById('btn-reset').classList.contains('confirm-active')).toBe(false);
    });

    it('the reset button also needs two taps', () => {
      tap('left');
      const btn = document.getElementById('btn-reset');
      btn.click();
      expect(gs().status).toBe(GameStatus.RUNNING);
      btn.click();
      expect(gs().status).toBe(GameStatus.IDLE);
    });

    it('resets a frozen game to IDLE', () => {
      app._selectOption({ periods: [{ method: TimingMethodType.TIME, timeMs: 500 }], freezeDefault: true }, 27);
      tap('left');
      runFrame(1000);
      expect(gs().status).toBe(GameStatus.FROZEN);
      press('r');
      press('r');
      expect(gs().status).toBe(GameStatus.IDLE);
      expect(gs().right.flagState).toBe(FlagState.NONE);
      expect(gs().right.timeMs).toBe(500);
    });

    it('Escape cancels a pending reset', () => {
      useFakeTimeouts();
      tap('left');
      press('r');
      press('Escape');
      expect(app._resetPending).toBe(false);
      expect(gs().status).toBe(GameStatus.RUNNING);
      press('r');
      expect(gs().status).toBe(GameStatus.RUNNING);
    });

    it('the confirmation expires after 3 seconds', () => {
      useFakeTimeouts();
      tap('left');
      press('r');
      jest.advanceTimersByTime(3000);
      expect(app._resetPending).toBe(false);
      press('r');
      expect(gs().status).toBe(GameStatus.RUNNING);
    });

    // aqaa: suspected bug: after the reset confirmation times out while the game is paused,
    // _updateDisplay() calls StatusBar.update() with an unchanged state; StatusBar's dirty-check
    // cache was never reset after showMessage(), so "Tap again to reset" stays on screen and the
    // option number is not shown again (B22). Same root cause as the StatusBar test.
    it.skip('aqaa: open bug, see report - status bar is restored after the reset confirmation times out [B22]', () => {
      useFakeTimeouts();
      tap('left');
      press('p');
      press('r');
      jest.advanceTimersByTime(3000);
      expect(document.querySelector('.status-state').textContent).toBe('⏸');
      expect(document.querySelector('.status-option').textContent).toBe('#01');
    });
  });

  describe('correction mode (B6, B7, B8)', () => {
    beforeEach(startApp);

    const longPressPause = () => {
      const btn = document.getElementById('btn-pause');
      btn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
      jest.advanceTimersByTime(UIConfig.LONG_PRESS_MS);
      btn.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
    };
    const overlay = () => document.getElementById('correction-overlay');
    const fields = () => [...overlay().querySelectorAll('.correction-field')];

    it('a 3s long press on pause while paused enters correction mode', () => {
      useFakeTimeouts();
      tap('left');
      press('p');
      longPressPause();
      expect(gs().status).toBe(GameStatus.CORRECTING);
      expect(overlay().classList.contains('hidden')).toBe(false);
      expect(fields()[1].textContent).toBe('05');
    });

    it('a long press while running does not enter correction mode nor toggle pause', () => {
      useFakeTimeouts();
      tap('left');
      longPressPause();
      expect(gs().status).toBe(GameStatus.RUNNING);
      expect(overlay().classList.contains('hidden')).toBe(true);
    });

    it('arrow keys navigate and adjust; Save applies corrections and returns to PAUSED', () => {
      useFakeTimeouts();
      tap('left');
      tap('right'); // right: 1 move, left active
      press('p');
      longPressPause();
      press('ArrowUp'); // left hours 0 -> 1
      press('ArrowRight'); // left minutes
      press('ArrowDown'); // 5 -> 4
      press('ArrowRight');
      press('ArrowRight');
      press('ArrowRight');
      press('ArrowRight'); // right seconds
      press('ArrowUp'); // 0 -> 1
      [...overlay().querySelectorAll('button')].find((b) => b.textContent === 'Save').click();

      expect(gs().status).toBe(GameStatus.PAUSED);
      expect(overlay().classList.contains('hidden')).toBe(true);
      expect(gs().left.timeMs).toBe((3600 + 4 * 60) * 1000);
      expect(gs().right.timeMs).toBe((5 * 60 + 1) * 1000);
      expect(gs().right.moves).toBe(1);
      expect(timeText('left')).toBe('1:04:00');

      press('p');
      expect(gs().status).toBe(GameStatus.RUNNING);
      runFrame(1000);
      expect(gs().left.timeMs).toBe((3600 + 3 * 60 + 59) * 1000);
    });

    it('Escape cancels correction mode without applying changes', () => {
      useFakeTimeouts();
      tap('left');
      press('p');
      longPressPause();
      press('ArrowUp');
      press('Escape');
      expect(gs().status).toBe(GameStatus.PAUSED);
      expect(overlay().classList.contains('hidden')).toBe(true);
      expect(gs().left.timeMs).toBe(300000);
    });

    it('can be entered from FROZEN and returns to FROZEN after saving', () => {
      useFakeTimeouts();
      app._selectOption({ periods: [{ method: TimingMethodType.TIME, timeMs: 500 }], freezeDefault: true }, 27);
      tap('left');
      runFrame(1000);
      longPressPause();
      expect(gs().status).toBe(GameStatus.CORRECTING);
      [...overlay().querySelectorAll('button')].find((b) => b.textContent === 'Save').click();
      expect(gs().status).toBe(GameStatus.FROZEN);
    });

    it('arrow keys do nothing outside correction mode', () => {
      tap('left');
      press('ArrowUp');
      expect(gs().status).toBe(GameStatus.RUNNING);
      expect(gs().left.timeMs).toBe(300000);
    });

    // aqaa: suspected bug: README says "Press Enter to save" in correction mode, but Enter is
    // mapped to switchTurn and _handleSwitchTurn() ignores the CORRECTING status, so Enter
    // neither saves nor exits correction mode (B7).
    it.skip('aqaa: open bug, see report - Enter saves in correction mode [B7]', () => {
      useFakeTimeouts();
      tap('left');
      press('p');
      longPressPause();
      press('ArrowUp');
      press('Enter');
      expect(gs().status).toBe(GameStatus.PAUSED);
      expect(overlay().classList.contains('hidden')).toBe(true);
      expect(gs().left.timeMs).toBe((3600 + 5 * 60) * 1000);
    });
  });

  describe('other shortcuts (B5)', () => {
    beforeEach(startApp);

    it.each([['2', 2, 600000], ['0', 10, null]])('quick preset key %j selects option %i in IDLE', (k, num, ms) => {
      press(k);
      expect(gs().selectedOption).toBe(num);
      expect(localStorage.getItem(StorageKeys.LAST_OPTION)).toBe(String(num));
      if (ms !== null) expect(gs().left.timeMs).toBe(ms);
    });

    it('quick preset keys are ignored while a game runs', () => {
      tap('left');
      press('3');
      expect(gs().selectedOption).toBe(1);
      expect(gs().status).toBe(GameStatus.RUNNING);
    });

    it('S toggles sound and updates the sound button', () => {
      press('s');
      expect(gs().soundEnabled).toBe(true);
      expect(app.soundManager.isEnabled()).toBe(true);
      expect(document.getElementById('btn-sound').classList.contains('active')).toBe(true);
      press('S');
      expect(gs().soundEnabled).toBe(false);
      expect(app.soundManager.isEnabled()).toBe(false);
    });

    it('holding M shows the move counts, releasing hides them', () => {
      tap('left');
      tap('right');
      const down = new KeyboardEvent('keydown', { key: 'm', bubbles: true });
      document.dispatchEvent(down);
      const moves = document.querySelector('.clock-right .clock-moves');
      expect(moves.classList.contains('hidden')).toBe(false);
      expect(moves.textContent).toBe('Moves: 1');
      document.dispatchEvent(new KeyboardEvent('keyup', { key: 'm', bubbles: true }));
      expect(moves.classList.contains('hidden')).toBe(true);
    });

    it('the theme button cycles and persists the theme', () => {
      document.getElementById('btn-theme').click();
      expect(localStorage.getItem(StorageKeys.THEME)).toBe('light');
      expect(document.getElementById('btn-theme').title).toBe('Theme: light');
    });

    it('the rotate button toggles rotation', () => {
      document.getElementById('btn-rotate').click();
      expect(document.getElementById('app').classList.contains('rotated')).toBe(true);
    });
  });

  describe('settings', () => {
    beforeEach(startApp);

    it('opening settings pauses a running game', () => {
      tap('left');
      document.getElementById('btn-settings').click();
      expect(gs().status).toBe(GameStatus.PAUSED);
      expect(app.settingsPanel.isVisible()).toBe(true);
    });

    it('selecting a preset in the panel loads it in IDLE and remembers it', () => {
      tap('left');
      document.getElementById('btn-settings').click();
      document.querySelector('.preset-card[data-option="4"]').click();
      expect(gs().status).toBe(GameStatus.IDLE);
      expect(gs().selectedOption).toBe(4);
      expect(gs().left.timeMs).toBe(3600000);
      expect(localStorage.getItem(StorageKeys.LAST_OPTION)).toBe('4');
      expect(app.settingsPanel.isVisible()).toBe(false);
    });

    it('Escape closes the settings panel', () => {
      document.getElementById('btn-settings').click();
      press('Escape');
      expect(app.settingsPanel.isVisible()).toBe(false);
    });

    it('quick preset keys are ignored while the settings panel is open', () => {
      document.getElementById('btn-settings').click();
      press('2');
      expect(gs().selectedOption).toBe(1);
    });
  });

  describe('destroy()', () => {
    it('stops the timer and removes the keyboard listeners', () => {
      startApp();
      tap('left');
      const a = app;
      a.destroy();
      app = null;
      expect(a.timerEngine.isRunning()).toBe(false);
      press('p');
      expect(a.gameState.status).toBe(GameStatus.RUNNING);
    });
  });
});
