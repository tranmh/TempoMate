import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { TimerEngine } from '../../src/js/engine/TimerEngine.js';

/**
 * Deterministic fakes for requestAnimationFrame / cancelAnimationFrame,
 * performance.now() and Date.now(). Frames are only run when the test
 * explicitly calls runFrame(timestamp).
 */
function installFakeClock() {
  const frames = new Map();
  let nextId = 1;
  const clock = { perf: 0, wall: 1_000_000 };

  const raf = jest.fn((cb) => {
    const id = nextId++;
    frames.set(id, cb);
    return id;
  });
  const caf = jest.fn((id) => {
    frames.delete(id);
  });

  const origRaf = global.requestAnimationFrame;
  const origCaf = global.cancelAnimationFrame;
  global.requestAnimationFrame = raf;
  global.cancelAnimationFrame = caf;
  const perfSpy = jest.spyOn(performance, 'now').mockImplementation(() => clock.perf);
  const dateSpy = jest.spyOn(Date, 'now').mockImplementation(() => clock.wall);

  return {
    raf,
    caf,
    clock,
    pendingCount: () => frames.size,
    /** Run all pending frames with the given rAF timestamp. */
    runFrame(timestamp) {
      const cbs = [...frames.values()];
      frames.clear();
      cbs.forEach((cb) => cb(timestamp));
    },
    restore() {
      global.requestAnimationFrame = origRaf;
      global.cancelAnimationFrame = origCaf;
      perfSpy.mockRestore();
      dateSpy.mockRestore();
    },
  };
}

let visibility = 'visible';
function setVisibility(state) {
  visibility = state;
  document.dispatchEvent(new Event('visibilitychange'));
}

describe('TimerEngine', () => {
  let fake;
  let engine;
  let onTick;

  beforeEach(() => {
    visibility = 'visible';
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => visibility,
    });
    fake = installFakeClock();
    engine = new TimerEngine();
    onTick = jest.fn();
    engine.setTickCallback(onTick);
  });

  afterEach(() => {
    engine.destroy();
    fake.restore();
    delete document.visibilityState;
  });

  describe('start / stop', () => {
    it('is not running before start', () => {
      expect(engine.isRunning()).toBe(false);
      expect(fake.raf).not.toHaveBeenCalled();
    });

    it('start() schedules an animation frame and reports running', () => {
      engine.start();
      expect(engine.isRunning()).toBe(true);
      expect(fake.raf).toHaveBeenCalledTimes(1);
    });

    it('start() is idempotent (no second rAF loop)', () => {
      engine.start();
      engine.start();
      engine.start();
      expect(fake.raf).toHaveBeenCalledTimes(1);
      expect(fake.pendingCount()).toBe(1);
    });

    it('start() is idempotent for the visibility listener', () => {
      const spy = jest.spyOn(document, 'addEventListener');
      engine.start();
      engine.start();
      const calls = spy.mock.calls.filter(([ev]) => ev === 'visibilitychange');
      expect(calls.length).toBe(1);
      spy.mockRestore();
    });

    it('stop() cancels the pending animation frame', () => {
      engine.start();
      const id = fake.raf.mock.results[0].value;
      engine.stop();
      expect(engine.isRunning()).toBe(false);
      expect(fake.caf).toHaveBeenCalledWith(id);
      expect(fake.pendingCount()).toBe(0);
    });

    it('stop() is a no-op when not running', () => {
      engine.stop();
      expect(fake.caf).not.toHaveBeenCalled();
      expect(engine.isRunning()).toBe(false);
    });

    it('stop() twice only cancels once', () => {
      engine.start();
      engine.stop();
      engine.stop();
      expect(fake.caf).toHaveBeenCalledTimes(1);
    });

    it('can be restarted after stop and measures delta from the restart time', () => {
      fake.clock.perf = 100;
      engine.start();
      engine.stop();
      fake.clock.perf = 5000;
      engine.start();
      fake.runFrame(5016);
      expect(onTick).toHaveBeenCalledTimes(1);
      expect(onTick).toHaveBeenCalledWith(16);
    });

    it('destroy() stops the loop and drops the callback', () => {
      engine.start();
      engine.destroy();
      expect(engine.isRunning()).toBe(false);
      expect(fake.pendingCount()).toBe(0);
      // Restart without callback: frames must not throw nor call the old callback
      engine.start();
      fake.runFrame(50);
      expect(onTick).not.toHaveBeenCalled();
    });
  });

  describe('_tick', () => {
    it('delivers the elapsed delta since the last timestamp', () => {
      fake.clock.perf = 1000;
      engine.start();
      fake.runFrame(1016);
      expect(onTick).toHaveBeenLastCalledWith(16);
      fake.runFrame(1050);
      expect(onTick).toHaveBeenLastCalledWith(34);
      expect(onTick).toHaveBeenCalledTimes(2);
    });

    it('re-schedules the next frame after each tick', () => {
      engine.start();
      fake.runFrame(16);
      fake.runFrame(32);
      expect(fake.raf).toHaveBeenCalledTimes(3);
      expect(fake.pendingCount()).toBe(1);
    });

    it('clamps deltas larger than 1 second to 1000ms', () => {
      fake.clock.perf = 0;
      engine.start();
      fake.runFrame(5000);
      expect(onTick).toHaveBeenCalledWith(1000);
    });

    it('passes exactly 1000ms through unchanged (boundary)', () => {
      fake.clock.perf = 0;
      engine.start();
      fake.runFrame(1000);
      expect(onTick).toHaveBeenCalledWith(1000);
    });

    it('passes 1001ms clamped to 1000ms (boundary)', () => {
      fake.clock.perf = 0;
      engine.start();
      fake.runFrame(1001);
      expect(onTick).toHaveBeenCalledWith(1000);
    });

    it('does not fire the callback for a zero delta but keeps looping', () => {
      fake.clock.perf = 500;
      engine.start();
      fake.runFrame(500);
      expect(onTick).not.toHaveBeenCalled();
      expect(fake.pendingCount()).toBe(1);
    });

    it('does not fire the callback for a negative delta', () => {
      fake.clock.perf = 500;
      engine.start();
      fake.runFrame(400);
      expect(onTick).not.toHaveBeenCalled();
      expect(fake.pendingCount()).toBe(1);
      // Next frame measures from the (earlier) timestamp
      fake.runFrame(420);
      expect(onTick).toHaveBeenCalledWith(20);
    });

    it('works without a tick callback', () => {
      engine.setTickCallback(null);
      engine.start();
      expect(() => fake.runFrame(16)).not.toThrow();
      expect(fake.pendingCount()).toBe(1);
    });

    it('ignores a frame that fires after stop()', () => {
      engine.start();
      const [cb] = fake.raf.mock.calls[0];
      engine.stop();
      cb(100);
      expect(onTick).not.toHaveBeenCalled();
      expect(fake.raf).toHaveBeenCalledTimes(1);
    });
  });

  describe('_handleVisibilityChange', () => {
    it('cancels the rAF when the tab becomes hidden and does not tick', () => {
      engine.start();
      const id = fake.raf.mock.results[0].value;
      setVisibility('hidden');
      expect(fake.caf).toHaveBeenCalledWith(id);
      expect(fake.pendingCount()).toBe(0);
      expect(onTick).not.toHaveBeenCalled();
      expect(engine.isRunning()).toBe(true);
    });

    it('delivers the full wall-clock time spent hidden on return (no 1s clamp)', () => {
      engine.start();
      fake.clock.wall = 10_000;
      setVisibility('hidden');
      fake.clock.wall = 25_000;
      setVisibility('visible');
      expect(onTick).toHaveBeenCalledTimes(1);
      expect(onTick).toHaveBeenCalledWith(15_000);
    });

    it('re-schedules exactly one rAF loop after becoming visible', () => {
      engine.start();
      setVisibility('hidden');
      fake.clock.wall += 2000;
      setVisibility('visible');
      expect(fake.pendingCount()).toBe(1);
    });

    it('does not double-deliver time: next frame measures from the resume point', () => {
      fake.clock.perf = 100;
      engine.start();
      fake.clock.wall = 50_000;
      setVisibility('hidden');
      // performance.now() may freeze on mobile while the wall clock advances
      fake.clock.perf = 120;
      fake.clock.wall = 53_000;
      setVisibility('visible');
      expect(onTick).toHaveBeenCalledWith(3000);
      onTick.mockClear();

      fake.runFrame(136);
      expect(onTick).toHaveBeenCalledTimes(1);
      expect(onTick).toHaveBeenCalledWith(16);
    });

    it('cancels a stale pending rAF on visible to avoid double delivery', () => {
      engine.start();
      // visible event without a preceding hidden: the pending frame must be cancelled
      const id = fake.raf.mock.results[0].value;
      fake.clock.wall = 1_000_000;
      engine._hiddenAtWallClock = 1_000_000;
      setVisibility('visible');
      expect(fake.caf).toHaveBeenCalledWith(id);
      expect(fake.pendingCount()).toBe(1);
    });

    it('does not fire the callback for a zero hidden duration', () => {
      engine.start();
      fake.clock.wall = 7_000;
      setVisibility('hidden');
      setVisibility('visible');
      expect(onTick).not.toHaveBeenCalled();
      expect(fake.pendingCount()).toBe(1);
    });

    it('does not fire the callback for a negative hidden duration (clock moved back)', () => {
      engine.start();
      fake.clock.wall = 7_000;
      setVisibility('hidden');
      fake.clock.wall = 6_000;
      setVisibility('visible');
      expect(onTick).not.toHaveBeenCalled();
      expect(fake.pendingCount()).toBe(1);
    });

    it('is ignored when the engine is not running', () => {
      engine._handleVisibilityChange();
      visibility = 'hidden';
      engine._handleVisibilityChange();
      fake.clock.wall += 10_000;
      visibility = 'visible';
      engine._handleVisibilityChange();
      expect(onTick).not.toHaveBeenCalled();
      expect(fake.raf).not.toHaveBeenCalled();
    });

    it('stops listening to visibilitychange after stop()', () => {
      engine.start();
      engine.stop();
      fake.clock.wall = 1_000;
      setVisibility('hidden');
      fake.clock.wall = 9_000;
      setVisibility('visible');
      expect(onTick).not.toHaveBeenCalled();
      expect(fake.pendingCount()).toBe(0);
    });
  });
});
