import { describe, it, expect } from '@jest/globals';
import { formatTime, formatTimeFull, parseTime, formatTimeShort } from '../../src/js/utils/TimeFormatter.js';

describe('formatTime', () => {
  it('formats hours correctly', () => {
    expect(formatTime(3600000)).toBe('1:00:00');
    expect(formatTime(7200000)).toBe('2:00:00');
    expect(formatTime(5400000)).toBe('1:30:00');
    expect(formatTime(3661000)).toBe('1:01:01');
  });

  it('formats minutes correctly', () => {
    expect(formatTime(300000)).toBe('5:00');
    expect(formatTime(1500000)).toBe('25:00');
    expect(formatTime(1234000)).toBe('20:34');
  });

  it('formats under 1 minute with tenths', () => {
    expect(formatTime(59900)).toBe('0:59.9');
    expect(formatTime(30000)).toBe('0:30.0');
    expect(formatTime(5500)).toBe('0:05.5');
    expect(formatTime(1100)).toBe('0:01.1');
    expect(formatTime(100)).toBe('0:00.1');
  });

  it('formats under 1 minute without tenths', () => {
    expect(formatTime(59900, false)).toBe('0:59');
    expect(formatTime(30000, false)).toBe('0:30');
  });

  it('handles zero', () => {
    expect(formatTime(0)).toBe('0:00.0');
  });

  it('handles negative values', () => {
    expect(formatTime(-1000)).toBe('0:00.0');
    expect(formatTime(-5000)).toBe('0:00.0');
  });
});

describe('formatTimeFull', () => {
  it('always shows H:MM:SS format', () => {
    expect(formatTimeFull(0)).toBe('0:00:00');
    expect(formatTimeFull(5000)).toBe('0:00:05');
    expect(formatTimeFull(300000)).toBe('0:05:00');
    expect(formatTimeFull(3600000)).toBe('1:00:00');
    expect(formatTimeFull(7261000)).toBe('2:01:01');
  });
});

describe('parseTime', () => {
  it('parses H:MM:SS', () => {
    expect(parseTime('1:30:00')).toBe(5400000);
    expect(parseTime('2:00:00')).toBe(7200000);
    expect(parseTime('0:05:30')).toBe(330000);
  });

  it('parses M:SS', () => {
    expect(parseTime('5:00')).toBe(300000);
    expect(parseTime('25:00')).toBe(1500000);
    expect(parseTime('0:30')).toBe(30000);
  });
});

describe('formatTimeShort', () => {
  it('formats human-readable short times', () => {
    expect(formatTimeShort(300000)).toBe('5m');
    expect(formatTimeShort(3600000)).toBe('1h');
    expect(formatTimeShort(5400000)).toBe('1h 30m');
    expect(formatTimeShort(7200000)).toBe('2h');
    expect(formatTimeShort(30000)).toBe('30s');
    expect(formatTimeShort(0)).toBe('0s');
    expect(formatTimeShort(3661000)).toBe('1h 1m');
  });
});
