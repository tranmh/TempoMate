import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { InputHandler } from '../../src/js/input/InputHandler.js';
import { UIConfig } from '../../src/js/utils/constants.js';

function fire(el, type) {
  const ev = new Event(type, { bubbles: true, cancelable: true });
  el.dispatchEvent(ev);
  return ev;
}

function key(target, type, k) {
  const ev = new KeyboardEvent(type, { key: k, bubbles: true, cancelable: true });
  target.dispatchEvent(ev);
  return ev;
}

describe('InputHandler', () => {
  let handler;
  let leftEl;
  let rightEl;

  beforeEach(() => {
    jest.useFakeTimers({ now: 1_000_000 });
    document.body.innerHTML = '';
    leftEl = document.createElement('div');
    rightEl = document.createElement('div');
    document.body.appendChild(leftEl);
    document.body.appendChild(rightEl);
    handler = new InputHandler();
  });

  afterEach(() => {
    handler.destroy();
    jest.useRealTimers();
  });

  describe('on() / emit()', () => {
    it('calls the registered handler with data', () => {
      const fn = jest.fn();
      handler.on('x', fn);
      handler.emit('x', 42);
      expect(fn).toHaveBeenCalledWith(42);
    });

    it('ignores events without a handler', () => {
      expect(() => handler.emit('nothing')).not.toThrow();
    });

    it('replaces an earlier handler for the same event', () => {
      const a = jest.fn();
      const b = jest.fn();
      handler.on('x', a);
      handler.on('x', b);
      handler.emit('x');
      expect(a).not.toHaveBeenCalled();
      expect(b).toHaveBeenCalledTimes(1);
    });
  });

  describe('clock faces', () => {
    let tap;
    beforeEach(() => {
      tap = jest.fn();
      handler.on('clockTap', tap);
      handler.bindClockFaces(leftEl, rightEl);
    });

    it('click emits clockTap with the side', () => {
      fire(leftEl, 'click');
      fire(rightEl, 'click');
      expect(tap.mock.calls).toEqual([['left'], ['right']]);
    });

    it('touchstart emits clockTap and prevents default', () => {
      const ev = fire(rightEl, 'touchstart');
      expect(tap).toHaveBeenCalledWith('right');
      expect(ev.defaultPrevented).toBe(true);
    });

    it('suppresses the ghost click right after a touch', () => {
      fire(leftEl, 'touchstart');
      fire(leftEl, 'click');
      expect(tap).toHaveBeenCalledTimes(1);
    });

    it('suppresses a click 499ms after a touch (boundary)', () => {
      fire(leftEl, 'touchstart');
      jest.advanceTimersByTime(499);
      fire(leftEl, 'click');
      expect(tap).toHaveBeenCalledTimes(1);
    });

    it('accepts a click 500ms after a touch (boundary)', () => {
      fire(leftEl, 'touchstart');
      jest.advanceTimersByTime(500);
      fire(leftEl, 'click');
      expect(tap).toHaveBeenCalledTimes(2);
    });

    it('ghost click suppression is shared across both faces', () => {
      fire(leftEl, 'touchstart');
      fire(rightEl, 'click');
      expect(tap.mock.calls).toEqual([['left']]);
    });

    it.each(['Enter', ' '])('keydown %j on a face emits clockTap and prevents default', (k) => {
      const ev = key(leftEl, 'keydown', k);
      expect(tap).toHaveBeenCalledWith('left');
      expect(ev.defaultPrevented).toBe(true);
    });

    it('other keys on a face do not emit clockTap', () => {
      const ev = new KeyboardEvent('keydown', { key: 'a', cancelable: true });
      leftEl.dispatchEvent(ev);
      expect(tap).not.toHaveBeenCalled();
      expect(ev.defaultPrevented).toBe(false);
    });

    it('destroy() removes the face listeners', () => {
      handler.destroy();
      const after = jest.fn();
      handler.on('clockTap', after);
      fire(leftEl, 'click');
      fire(leftEl, 'touchstart');
      key(leftEl, 'keydown', 'Enter');
      expect(after).not.toHaveBeenCalled();
    });
  });

  describe('keyboard', () => {
    let events;
    beforeEach(() => {
      events = [];
      for (const name of ['switchTurn', 'togglePause', 'toggleSound', 'toggleFreeze', 'showMoves',
        'reset', 'escape', 'navLeft', 'navRight', 'navUp', 'navDown', 'quickPreset']) {
        handler.on(name, (data) => events.push(data === undefined ? name : [name, data]));
      }
      handler.bindKeyboard();
    });

    const press = (k) => {
      const down = key(document, 'keydown', k);
      key(document, 'keyup', k);
      return down;
    };

    it.each([
      [' ', 'switchTurn'],
      ['Enter', 'switchTurn'],
      ['p', 'togglePause'],
      ['P', 'togglePause'],
      ['s', 'toggleSound'],
      ['S', 'toggleSound'],
      ['f', 'toggleFreeze'],
      ['F', 'toggleFreeze'],
      ['r', 'reset'],
      ['R', 'reset'],
      ['Escape', 'escape'],
      ['ArrowLeft', 'navLeft'],
      ['ArrowRight', 'navRight'],
      ['ArrowUp', 'navUp'],
      ['ArrowDown', 'navDown'],
    ])('key %j emits %s and prevents default', (k, name) => {
      const ev = press(k);
      expect(events).toEqual([name]);
      expect(ev.defaultPrevented).toBe(true);
    });

    it('M emits showMoves(true) on keydown and showMoves(false) on keyup', () => {
      const down = key(document, 'keydown', 'm');
      expect(down.defaultPrevented).toBe(true);
      expect(events).toEqual([['showMoves', true]]);
      key(document, 'keyup', 'm');
      expect(events).toEqual([['showMoves', true], ['showMoves', false]]);
    });

    it.each([
      ['1', 1], ['5', 5], ['9', 9], ['0', 10],
    ])('number key %j selects quick preset %i', (k, n) => {
      press(k);
      expect(events).toEqual([['quickPreset', n]]);
    });

    it('number keys are not preventDefault-ed', () => {
      const ev = press('3');
      expect(ev.defaultPrevented).toBe(false);
    });

    it('unrelated keys emit nothing and are not prevented', () => {
      const ev = press('x');
      press('Tab');
      press('a');
      expect(events).toEqual([]);
      expect(ev.defaultPrevented).toBe(false);
    });

    it('blocks key repeat until the key is released', () => {
      key(document, 'keydown', ' ');
      const repeat = key(document, 'keydown', ' ');
      key(document, 'keydown', ' ');
      expect(events).toEqual(['switchTurn']);
      // the repeated event is still prevented (no page scroll)
      expect(repeat.defaultPrevented).toBe(true);
      key(document, 'keyup', ' ');
      key(document, 'keydown', ' ');
      expect(events).toEqual(['switchTurn', 'switchTurn']);
    });

    it('key repeat blocking is per key', () => {
      key(document, 'keydown', ' ');
      key(document, 'keydown', 'p');
      expect(events).toEqual(['switchTurn', 'togglePause']);
    });

    it('destroy() removes the keyboard listeners and held-key state', () => {
      key(document, 'keydown', ' ');
      handler.destroy();
      const after = jest.fn();
      handler.on('switchTurn', after);
      key(document, 'keydown', 'Enter');
      expect(after).not.toHaveBeenCalled();
      // held keys were cleared: a re-bind accepts the formerly held key
      handler.bindKeyboard();
      key(document, 'keydown', ' ');
      expect(after).toHaveBeenCalledTimes(1);
    });
  });

  describe('bindButton', () => {
    let btn;
    let tapFn;
    let longFn;

    beforeEach(() => {
      btn = document.createElement('button');
      document.body.appendChild(btn);
      tapFn = jest.fn();
      longFn = jest.fn();
      handler.on('tap', tapFn);
      handler.on('long', longFn);
      handler.bindButton(btn, 'tap', 'long');
    });

    it('mouse down/up emits the tap event', () => {
      fire(btn, 'mousedown');
      fire(btn, 'mouseup');
      expect(tapFn).toHaveBeenCalledTimes(1);
      expect(longFn).not.toHaveBeenCalled();
    });

    it('holding for LONG_PRESS_MS emits the long press and no tap', () => {
      fire(btn, 'mousedown');
      jest.advanceTimersByTime(UIConfig.LONG_PRESS_MS);
      expect(longFn).toHaveBeenCalledTimes(1);
      fire(btn, 'mouseup');
      expect(tapFn).not.toHaveBeenCalled();
    });

    it('releasing just before LONG_PRESS_MS is a tap', () => {
      fire(btn, 'mousedown');
      jest.advanceTimersByTime(UIConfig.LONG_PRESS_MS - 1);
      fire(btn, 'mouseup');
      jest.advanceTimersByTime(10);
      expect(tapFn).toHaveBeenCalledTimes(1);
      expect(longFn).not.toHaveBeenCalled();
    });

    it('mouseleave cancels a pending long press', () => {
      fire(btn, 'mousedown');
      fire(btn, 'mouseleave');
      jest.advanceTimersByTime(UIConfig.LONG_PRESS_MS + 100);
      expect(longFn).not.toHaveBeenCalled();
    });

    it('touch start/end emits the tap and ignores the following ghost mouse events', () => {
      fire(btn, 'touchstart');
      fire(btn, 'touchend');
      fire(btn, 'mousedown');
      fire(btn, 'mouseup');
      expect(tapFn).toHaveBeenCalledTimes(1);
    });

    it('touch long press emits the long press event', () => {
      fire(btn, 'touchstart');
      jest.advanceTimersByTime(UIConfig.LONG_PRESS_MS);
      fire(btn, 'touchend');
      expect(longFn).toHaveBeenCalledTimes(1);
      expect(tapFn).not.toHaveBeenCalled();
    });

    it('touchcancel cancels a pending long press', () => {
      fire(btn, 'touchstart');
      fire(btn, 'touchcancel');
      jest.advanceTimersByTime(UIConfig.LONG_PRESS_MS + 100);
      expect(longFn).not.toHaveBeenCalled();
    });

    it('works without a long press event', () => {
      const btn2 = document.createElement('button');
      const t2 = jest.fn();
      handler.on('tap2', t2);
      handler.bindButton(btn2, 'tap2');
      fire(btn2, 'mousedown');
      jest.advanceTimersByTime(UIConfig.LONG_PRESS_MS * 2);
      fire(btn2, 'mouseup');
      expect(t2).toHaveBeenCalledTimes(1);
    });

    // aqaa: suspected bug: destroy() does not remove the bindButton listeners. The cleanup
    // calls removeEventListener with the factory functions start/end instead of the
    // listeners created by start(true)/start(false)/end(true)/end(false), so the
    // touchstart/touchend/mousedown/mouseup listeners stay attached (B18).
    it.skip('aqaa: open bug, see report - destroy() removes bindButton listeners [B18]', () => {
      handler.destroy();
      const after = jest.fn();
      handler.on('tap', after);
      fire(btn, 'mousedown');
      fire(btn, 'mouseup');
      expect(after).not.toHaveBeenCalled();
    });
  });
});
