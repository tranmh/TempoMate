import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { ClockDisplay } from '../../src/js/ui/ClockDisplay.js';
import { ClockFaceStyle, FlagState, GameStatus, Player, TimingMethodType } from '../../src/js/utils/constants.js';

class FakeResizeObserver {
  constructor(cb) {
    this.cb = cb;
    this.observed = [];
    this.disconnect = jest.fn();
    FakeResizeObserver.instances.push(this);
  }
  observe(el) { this.observed.push(el); }
  unobserve() {}
}
FakeResizeObserver.instances = [];

describe('ClockDisplay', () => {
  let container;
  let cd;
  let origRO;
  let origRaf;
  let rafQueue;

  const fullState = (over = {}) => ({
    leftTimeMs: 300000,
    rightTimeMs: 240000,
    activePlayer: null,
    gameStatus: GameStatus.IDLE,
    leftColor: 'white',
    rightColor: 'black',
    leftFlagState: FlagState.NONE,
    rightFlagState: FlagState.NONE,
    leftMoves: 0,
    rightMoves: 0,
    showMoves: false,
    leftByoMoments: 0,
    rightByoMoments: 0,
    leftMethod: TimingMethodType.TIME,
    rightMethod: TimingMethodType.TIME,
    ...over,
  });

  beforeEach(() => {
    origRO = global.ResizeObserver;
    origRaf = global.requestAnimationFrame;
    FakeResizeObserver.instances = [];
    global.ResizeObserver = FakeResizeObserver;
    rafQueue = [];
    global.requestAnimationFrame = jest.fn((cb) => { rafQueue.push(cb); return rafQueue.length; });
    document.body.innerHTML = '<div id="clock-container"></div>';
    container = document.getElementById('clock-container');
    cd = new ClockDisplay(container);
  });

  afterEach(() => {
    cd.destroy();
    global.ResizeObserver = origRO;
    global.requestAnimationFrame = origRaf;
  });

  const faces = () => cd.getClockFaces();

  it('builds two accessible clock faces', () => {
    const { left, right } = faces();
    expect(container.classList.contains('clock-container')).toBe(true);
    expect(left.getAttribute('data-side')).toBe('left');
    expect(right.getAttribute('data-side')).toBe('right');
    for (const f of [left, right]) {
      expect(f.getAttribute('role')).toBe('button');
      expect(f.getAttribute('tabindex')).toBe('0');
    }
  });

  it('uses the digital renderer by default', () => {
    expect(faces().left.querySelector('.clock-time')).not.toBeNull();
    const flags = cd.getFlagElements();
    expect(flags.left).toBe(faces().left.querySelector('.clock-flag'));
    expect(flags.right).toBe(faces().right.querySelector('.clock-flag'));
  });

  it('observes both faces for resizing', () => {
    const ro = FakeResizeObserver.instances[0];
    expect(ro.observed).toEqual([faces().left, faces().right]);
  });

  it('renders both players times (asymmetric)', () => {
    cd.update(fullState());
    expect(faces().left.querySelector('.clock-time').textContent).toBe('5:00');
    expect(faces().right.querySelector('.clock-time').textContent).toBe('4:00');
  });

  it('marks only the running player as active', () => {
    cd.update(fullState({ activePlayer: Player.RIGHT, gameStatus: GameStatus.RUNNING }));
    expect(faces().right.classList.contains('active')).toBe(true);
    expect(faces().left.classList.contains('active')).toBe(false);
  });

  it('no face is active when paused; the paused player gets the paused class', () => {
    cd.update(fullState({ activePlayer: Player.LEFT, gameStatus: GameStatus.PAUSED }));
    expect(faces().left.classList.contains('active')).toBe(false);
    expect(faces().left.classList.contains('paused')).toBe(true);
    expect(faces().right.classList.contains('paused')).toBe(false);
  });

  it('frozen marks only the flagged player', () => {
    cd.update(fullState({
      activePlayer: Player.LEFT,
      gameStatus: GameStatus.FROZEN,
      leftTimeMs: 0,
      leftFlagState: FlagState.BLINKING,
    }));
    expect(faces().left.classList.contains('frozen')).toBe(true);
    expect(faces().right.classList.contains('frozen')).toBe(false);
    expect(faces().left.querySelector('.clock-flag').classList.contains('flag-blinking')).toBe(true);
  });

  it('is not active in IDLE even with an active player set', () => {
    cd.update(fullState({ activePlayer: Player.LEFT, gameStatus: GameStatus.IDLE }));
    expect(faces().left.classList.contains('active')).toBe(false);
  });

  it('passes move count and byo-yomi moments to the renderers', () => {
    cd.update(fullState({ leftMoves: 3, rightMoves: 2, showMoves: true, rightByoMoments: 5 }));
    expect(faces().left.querySelector('.clock-moves').textContent).toBe('Moves: 3');
    expect(faces().right.querySelector('.clock-moves').textContent).toBe('Moves: 2');
    expect(faces().right.querySelector('.clock-byo').textContent).toBe('×5');
  });

  describe('setClockFaceStyle', () => {
    it('switches to an analog renderer keeping the face containers', () => {
      const { left, right } = faces();
      cd.setClockFaceStyle(ClockFaceStyle.GARDE);
      expect(faces().left).toBe(left);
      expect(faces().right).toBe(right);
      expect(container.classList.contains('analog-mode')).toBe(true);
      expect(left.querySelector('svg')).not.toBeNull();
      expect(left.querySelector('.clock-time')).toBeNull();
    });

    it('analog faces have no digital flag elements', () => {
      cd.setClockFaceStyle(ClockFaceStyle.INSA);
      expect(cd.getFlagElements()).toEqual({ left: null, right: null });
    });

    it('switching back to digital rebuilds the digital face', () => {
      cd.setClockFaceStyle(ClockFaceStyle.GARDE);
      cd.setClockFaceStyle(ClockFaceStyle.DIGITAL);
      expect(container.classList.contains('analog-mode')).toBe(false);
      expect(faces().left.querySelector('.clock-time')).not.toBeNull();
      expect(faces().left.querySelector('svg')).toBeNull();
      cd.update(fullState());
      expect(faces().left.querySelector('.clock-time').textContent).toBe('5:00');
    });

    it('setting the current style is a no-op', () => {
      const timeEl = faces().left.querySelector('.clock-time');
      cd.setClockFaceStyle(ClockFaceStyle.DIGITAL);
      expect(faces().left.querySelector('.clock-time')).toBe(timeEl);
    });

    it('unknown style ids fall back to the digital renderer', () => {
      cd.setClockFaceStyle('nonsense');
      expect(faces().left.querySelector('.clock-time')).not.toBeNull();
    });

    it('update works after switching to analog', () => {
      cd.setClockFaceStyle(ClockFaceStyle.GARDE);
      expect(() => cd.update(fullState({ activePlayer: Player.LEFT, gameStatus: GameStatus.RUNNING }))).not.toThrow();
    });
  });

  it('pending font-sync frames do not throw with zero-sized containers', () => {
    expect(() => rafQueue.splice(0).forEach((cb) => cb(0))).not.toThrow();
  });

  it('destroy() disconnects the resize observer', () => {
    const ro = FakeResizeObserver.instances[0];
    cd.destroy();
    expect(ro.disconnect).toHaveBeenCalled();
  });
});
