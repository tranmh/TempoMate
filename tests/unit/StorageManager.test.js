import { describe, it, expect, beforeEach } from '@jest/globals';
import { StorageManager } from '../../src/js/storage/StorageManager.js';
import { TimingMethodType } from '../../src/js/utils/constants.js';

describe('StorageManager', () => {
  beforeEach(() => {
    // Clear localStorage before each test (jsdom provides it)
    localStorage.clear();
  });

  describe('custom options', () => {
    it('loads empty options by default', () => {
      const options = StorageManager.loadCustomOptions();
      expect(options).toEqual([null, null, null, null, null]);
    });

    it('saves and loads custom options', () => {
      const config = {
        name: 'Test',
        periods: [{ method: TimingMethodType.TIME, timeMs: 300000 }],
        freezeDefault: false,
        soundDefault: false,
      };

      StorageManager.saveCustomOption(0, config);
      const loaded = StorageManager.loadCustomOption(0);
      expect(loaded).toEqual(config);
    });

    it('saves to correct slot', () => {
      const config1 = { name: 'Slot 1', periods: [{ method: TimingMethodType.TIME, timeMs: 300000 }] };
      const config2 = { name: 'Slot 3', periods: [{ method: TimingMethodType.TIME, timeMs: 600000 }] };

      StorageManager.saveCustomOption(0, config1);
      StorageManager.saveCustomOption(2, config2);

      const options = StorageManager.loadCustomOptions();
      expect(options[0]).toEqual(config1);
      expect(options[1]).toBeNull();
      expect(options[2]).toEqual(config2);
    });

    it('rejects out-of-range slots', () => {
      StorageManager.saveCustomOption(-1, { name: 'bad' });
      StorageManager.saveCustomOption(5, { name: 'bad' });

      const loaded1 = StorageManager.loadCustomOption(-1);
      const loaded2 = StorageManager.loadCustomOption(5);
      expect(loaded1).toBeNull();
      expect(loaded2).toBeNull();
    });
  });

  describe('last option', () => {
    it('defaults to 1', () => {
      expect(StorageManager.loadLastOption()).toBe(1);
    });

    it('saves and loads', () => {
      StorageManager.saveLastOption(15);
      expect(StorageManager.loadLastOption()).toBe(15);
    });

    it('rejects out-of-range values', () => {
      StorageManager.saveLastOption(0);
      expect(StorageManager.loadLastOption()).toBe(1); // Fallback
    });
  });

  describe('theme', () => {
    it('defaults to auto', () => {
      expect(StorageManager.loadTheme()).toBe('auto');
    });

    it('saves and loads', () => {
      StorageManager.saveTheme('dark');
      expect(StorageManager.loadTheme()).toBe('dark');
    });
  });

  describe('sound', () => {
    it('defaults to null', () => {
      expect(StorageManager.loadSoundEnabled()).toBeNull();
    });

    it('saves and loads', () => {
      StorageManager.saveSoundEnabled(true);
      expect(StorageManager.loadSoundEnabled()).toBe(true);

      StorageManager.saveSoundEnabled(false);
      expect(StorageManager.loadSoundEnabled()).toBe(false);
    });
  });

  describe('clearAll', () => {
    it('clears all stored data', () => {
      StorageManager.saveLastOption(10);
      StorageManager.saveTheme('dark');
      StorageManager.saveSoundEnabled(true);

      StorageManager.clearAll();

      expect(StorageManager.loadLastOption()).toBe(1);
      expect(StorageManager.loadTheme()).toBe('auto');
      expect(StorageManager.loadSoundEnabled()).toBeNull();
    });
  });

  describe('createDefaultCustomOption', () => {
    it('returns a valid default config', () => {
      const config = StorageManager.createDefaultCustomOption();
      expect(config.name).toBe('Custom');
      expect(config.periods).toHaveLength(1);
      expect(config.periods[0].method).toBe(TimingMethodType.TIME);
      expect(config.periods[0].timeMs).toBe(300000);
    });
  });
});
