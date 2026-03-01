import { describe, it, expect, beforeEach } from '@jest/globals';
import { MoveCounter } from '../../src/js/engine/MoveCounter.js';

describe('MoveCounter', () => {
  let mc;

  beforeEach(() => {
    mc = new MoveCounter();
  });

  it('starts at zero', () => {
    expect(mc.getMoves('left')).toBe(0);
    expect(mc.getMoves('right')).toBe(0);
  });

  it('records moves', () => {
    mc.recordMove('left');
    mc.recordMove('left');
    mc.recordMove('right');
    expect(mc.getMoves('left')).toBe(2);
    expect(mc.getMoves('right')).toBe(1);
  });

  it('sets moves', () => {
    mc.setMoves('left', 15);
    mc.setMoves('right', 14);
    expect(mc.getMoves('left')).toBe(15);
    expect(mc.getMoves('right')).toBe(14);
  });

  it('does not go below zero', () => {
    mc.setMoves('left', -5);
    expect(mc.getMoves('left')).toBe(0);
  });

  it('resets', () => {
    mc.recordMove('left');
    mc.recordMove('right');
    mc.reset();
    expect(mc.getMoves('left')).toBe(0);
    expect(mc.getMoves('right')).toBe(0);
  });

  it('calculates chess move number', () => {
    mc.setMoves('left', 10);
    mc.setMoves('right', 9);
    expect(mc.getChessMoveNumber('left')).toBe(10);
    expect(mc.getChessMoveNumber('right')).toBe(9);
  });
});
