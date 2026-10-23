import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { SettingsPanel } from '../../src/js/ui/SettingsPanel.js';
import { StorageManager } from '../../src/js/storage/StorageManager.js';
import { GameState } from '../../src/js/state/GameState.js';
import { presets } from '../../src/js/presets/presets.js';
import { StorageKeys, TimingMethodType, Limits, ClockFaceStyle } from '../../src/js/utils/constants.js';

describe('SettingsPanel', () => {
  let el;
  let panel;
  let onSelect;
  let onClose;
  let onFace;

  const $ = (sel) => el.querySelector(sel);
  const $$ = (sel) => [...el.querySelectorAll(sel)];
  const button = (text) => $$('button').find((b) => b.textContent === text);
  const typeInto = (input, value) => {
    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
  };
  const choose = (select, value) => {
    select.value = value;
    select.dispatchEvent(new Event('change', { bubbles: true }));
  };
  const timeGroup = (label, index = 0) => {
    const groups = $$('.time-input-group').filter((g) => g.querySelector('.time-input-label')?.textContent === label);
    const g = groups[index];
    if (!g) return null;
    const [h, m, s] = g.querySelectorAll('input');
    return { h, m, s, group: g };
  };
  const nameInput = () => $('.custom-edit-form input[type="text"]');
  const periodForms = () => $$('.period-form');
  const methodSelect = (periodIdx) => periodForms()[periodIdx].querySelector('select');
  const methodOptions = (periodIdx) => [...methodSelect(periodIdx).options].map((o) => o.value);

  /** Open the editor for the given custom slot (0-based). */
  const openEditor = (slot = 0) => {
    panel.show();
    button('Custom').click();
    $$('.custom-item')[slot].querySelectorAll('button')[$$('.custom-item')[slot].querySelectorAll('button').length - 1].click();
  };

  beforeEach(() => {
    localStorage.clear();
    document.documentElement.style.removeProperty('--clock-font');
    document.body.innerHTML = '<div id="settings-panel" class="hidden"></div>';
    el = document.getElementById('settings-panel');
    panel = new SettingsPanel(el);
    onSelect = jest.fn();
    onClose = jest.fn();
    onFace = jest.fn();
    panel.setCallbacks(onSelect, onClose, onFace);
  });

  describe('preset view', () => {
    it('show() makes the panel visible with the preset grid', () => {
      expect(panel.isVisible()).toBe(false);
      panel.show();
      expect(panel.isVisible()).toBe(true);
      expect($('h2').textContent).toBe('Select Time Control');
    });

    it('lists the 26 built-in presets numbered #01..#26 (B9)', () => {
      panel.show();
      const cards = $$('.preset-card');
      expect(cards.length).toBe(26);
      expect(cards[0].querySelector('.preset-number').textContent).toBe('#01');
      expect(cards[25].querySelector('.preset-number').textContent).toBe('#26');
    });

    it('shows multi-period methods joined with +', () => {
      panel.show();
      const multi = presets.find((p) => p.periods.length > 1);
      const card = $(`.preset-card[data-option="${multi.id}"]`);
      expect(card.querySelector('.preset-method').textContent).toBe(multi.periods.map((p) => p.method).join(' + '));
    });

    it('clicking a preset selects it and closes the panel', () => {
      panel.show();
      $('.preset-card[data-option="10"]').click();
      expect(onSelect).toHaveBeenCalledWith(presets.find((p) => p.id === 10), 10);
      expect(panel.isVisible()).toBe(false);
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('the close button hides the panel', () => {
      panel.show();
      $('.settings-close').click();
      expect(panel.isVisible()).toBe(false);
      expect(onClose).toHaveBeenCalled();
      expect(onSelect).not.toHaveBeenCalled();
    });

    it('changing the font persists it and sets the CSS variable', () => {
      panel.show();
      const fontSelect = $$('select')[1];
      choose(fontSelect, 'orbitron');
      expect(localStorage.getItem(StorageKeys.FONT)).toBe('orbitron');
      expect(document.documentElement.style.getPropertyValue('--clock-font')).toBe("'Orbitron'");
    });

    it('changing the clock face persists it, notifies and hides the font selector for analog', () => {
      panel.show();
      const faceSelect = $$('select')[0];
      const fontGroup = $$('.settings-font-group')[1];
      choose(faceSelect, ClockFaceStyle.GARDE);
      expect(localStorage.getItem(StorageKeys.CLOCK_FACE)).toBe('garde');
      expect(onFace).toHaveBeenCalledWith('garde');
      expect(fontGroup.style.display).toBe('none');
      choose(faceSelect, ClockFaceStyle.DIGITAL);
      expect(fontGroup.style.display).toBe('');
    });

    it('works without callbacks', () => {
      const p = new SettingsPanel(el);
      p.show();
      expect(() => $('.preset-card').click()).not.toThrow();
      expect(p.isVisible()).toBe(false);
    });
  });

  describe('custom list', () => {
    it('shows 5 empty custom slots numbered #27..#31 (B9)', () => {
      panel.show();
      button('Custom').click();
      const items = $$('.custom-item');
      expect(items.length).toBe(Limits.MAX_MANUAL_OPTIONS);
      expect(items.map((i) => i.querySelector('.custom-label').textContent)).toEqual([
        '#27 - Manual Set 1', '#28 - Manual Set 2', '#29 - Manual Set 3', '#30 - Manual Set 4', '#31 - Manual Set 5',
      ]);
      items.forEach((i) => {
        expect(i.querySelector('.custom-desc').textContent).toBe('Empty');
        expect([...i.querySelectorAll('button')].map((b) => b.textContent)).toEqual(['Create']);
      });
    });

    it('the Presets tab returns to the preset grid', () => {
      panel.show();
      button('Custom').click();
      button('Presets').click();
      expect($$('.preset-card').length).toBe(26);
    });

    it('a stored option offers Use and Edit, and Use selects it', () => {
      const cfg = { name: 'Mine', periods: [{ method: TimingMethodType.TIME, timeMs: 120000 }] };
      StorageManager.saveCustomOption(2, cfg);
      panel.show();
      button('Custom').click();
      const item = $$('.custom-item')[2];
      expect(item.querySelector('.custom-desc').textContent).toBe('Mine');
      const btns = [...item.querySelectorAll('button')];
      expect(btns.map((b) => b.textContent)).toEqual(['Use', 'Edit']);
      btns[0].click();
      expect(onSelect).toHaveBeenCalledWith(cfg, 29);
      expect(panel.isVisible()).toBe(false);
    });
  });

  describe('custom editor', () => {
    it('opens with a default single 5-minute TIME period', () => {
      openEditor(0);
      expect($('h2').textContent).toBe('Edit Custom #27');
      expect(nameInput().value).toBe('Custom');
      expect(periodForms().length).toBe(1);
      expect(methodSelect(0).value).toBe(TimingMethodType.TIME);
      const t = timeGroup('Main time');
      expect([t.h.value, t.m.value, t.s.value]).toEqual(['0', '5', '0']);
    });

    it('prompts for a name on first save while the name is still the default (B10)', () => {
      openEditor(0);
      button('Save & Use').click();
      expect(onSelect).not.toHaveBeenCalled();
      expect(StorageManager.loadCustomOption(0)).toBeNull();
      expect($('.name-hint')).not.toBeNull();
      expect(nameInput().classList.contains('form-input-highlight')).toBe(true);
      expect(document.activeElement).toBe(nameInput());
    });

    it('prompts for a whitespace-only name', () => {
      openEditor(0);
      typeInto(nameInput(), '   ');
      button('Save').click();
      expect(StorageManager.loadCustomOption(0)).toBeNull();
      expect($('.name-hint')).not.toBeNull();
    });

    it('only shows one hint when saving repeatedly without a name', () => {
      openEditor(0);
      button('Save & Use').click();
      button('Save & Use').click();
      expect($$('.name-hint').length).toBe(1);
    });

    it('typing a name removes the hint and highlight', () => {
      openEditor(0);
      button('Save & Use').click();
      typeInto(nameInput(), 'Blitz');
      expect($('.name-hint')).toBeNull();
      expect(nameInput().classList.contains('form-input-highlight')).toBe(false);
    });

    it('builds the period config from h/m/s input and saves & uses it (B10)', () => {
      openEditor(0);
      typeInto(nameInput(), 'My 1h30');
      const t = timeGroup('Main time');
      typeInto(t.h, '1');
      typeInto(t.m, '30');
      typeInto(t.s, '15');
      button('Save & Use').click();

      const expected = expect.objectContaining({
        name: 'My 1h30',
        periods: [{ method: TimingMethodType.TIME, timeMs: (3600 + 1800 + 15) * 1000 }],
      });
      expect(onSelect).toHaveBeenCalledWith(expected, 27);
      expect(StorageManager.loadCustomOption(0)).toEqual(expected);
      expect(panel.isVisible()).toBe(false);
    });

    it('treats empty / non-numeric time input as 0', () => {
      openEditor(1);
      typeInto(nameInput(), 'Zero');
      const t = timeGroup('Main time');
      typeInto(t.m, '');
      typeInto(t.s, 'abc');
      button('Save & Use').click();
      expect(onSelect.mock.calls[0][0].periods[0].timeMs).toBe(0);
      expect(onSelect.mock.calls[0][1]).toBe(28);
    });

    it('Save (without use) stores the option and returns to the list; it persists across reload (B10)', () => {
      openEditor(4);
      typeInto(nameInput(), 'Slot five');
      button('Save').click();
      expect(onSelect).not.toHaveBeenCalled();
      expect($('h2').textContent).toBe('Custom Options');
      expect($$('.custom-item')[4].querySelector('.custom-desc').textContent).toBe('Slot five');

      // "reload": new panel instance reading from storage
      const fresh = new SettingsPanel(el);
      fresh.setCallbacks(onSelect, onClose);
      fresh.show();
      button('Custom').click();
      expect($$('.custom-item')[4].querySelector('.custom-desc').textContent).toBe('Slot five');
      $$('.custom-item')[4].querySelector('button').click(); // Use
      expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ name: 'Slot five' }), 31);
    });

    it('Cancel discards edits', () => {
      openEditor(0);
      typeInto(nameInput(), 'Never saved');
      button('Cancel').click();
      expect($('h2').textContent).toBe('Custom Options');
      expect(StorageManager.loadCustomOption(0)).toBeNull();
    });

    it('editing an existing option works on a copy until saved', () => {
      const cfg = { name: 'Orig', periods: [{ method: TimingMethodType.TIME, timeMs: 60000 }] };
      StorageManager.saveCustomOption(0, cfg);
      openEditor(0);
      typeInto(nameInput(), 'Changed');
      button('Cancel').click();
      expect(StorageManager.loadCustomOption(0).name).toBe('Orig');
    });

    it('freeze and sound defaults are stored', () => {
      openEditor(0);
      typeInto(nameInput(), 'FS');
      const checks = $$('.defaults-section input[type="checkbox"]');
      checks[0].checked = true;
      checks[0].dispatchEvent(new Event('change'));
      checks[1].checked = true;
      checks[1].dispatchEvent(new Event('change'));
      button('Save').click();
      const saved = StorageManager.loadCustomOption(0);
      expect(saved.freezeDefault).toBe(true);
      expect(saved.soundDefault).toBe(true);
    });

    describe('periods', () => {
      it('adds periods up to the maximum of 4 (B9)', () => {
        openEditor(0);
        for (let i = 0; i < 3; i++) button('+ Add Period').click();
        expect(periodForms().length).toBe(Limits.MAX_PERIODS);
        expect(button('+ Add Period')).toBeUndefined();
      });

      it('removing a period re-renders without it', () => {
        openEditor(0);
        button('+ Add Period').click();
        expect(periodForms().length).toBe(2);
        periodForms()[1].querySelector('button[title="Remove period"]').click();
        expect(periodForms().length).toBe(1);
        expect(periodForms()[0].querySelector('button[title="Remove period"]')).toBeNull();
      });

      it('byo-yomi, canadian byo-yomi and upcount are offered only for the last period', () => {
        openEditor(0);
        expect(methodOptions(0)).toEqual(expect.arrayContaining([
          TimingMethodType.BYO_YOMI, TimingMethodType.CANADIAN_BYO, TimingMethodType.UPCOUNT,
        ]));
        button('+ Add Period').click();
        expect(methodOptions(0)).not.toContain(TimingMethodType.BYO_YOMI);
        expect(methodOptions(0)).not.toContain(TimingMethodType.CANADIAN_BYO);
        expect(methodOptions(0)).not.toContain(TimingMethodType.UPCOUNT);
        expect(methodOptions(1)).toContain(TimingMethodType.UPCOUNT);
        // END is never user selectable
        expect(methodOptions(1)).not.toContain(TimingMethodType.END);
      });

      it('Fischer exposes bonus and moves fields that build delayMs/movesRequired', () => {
        openEditor(0);
        typeInto(nameInput(), 'Fischer 40');
        choose(methodSelect(0), TimingMethodType.FISCHER);
        const form = periodForms()[0];
        const bonus = form.querySelector('input[aria-label="seconds"]');
        const moves = form.querySelector('input[aria-label="moves"]');
        expect(bonus).not.toBeNull();
        expect(moves).not.toBeNull();
        typeInto(bonus, '30');
        typeInto(moves, '40');
        button('Save').click();
        expect(StorageManager.loadCustomOption(0).periods[0]).toEqual({
          method: TimingMethodType.FISCHER, timeMs: 300000, delayMs: 30000, movesRequired: 40,
        });
      });

      it('Bronstein / US delay expose a delay field', () => {
        openEditor(0);
        choose(methodSelect(0), TimingMethodType.DELAY);
        expect(periodForms()[0].textContent).toContain('Delay/move');
        expect(periodForms()[0].querySelector('input[aria-label="moves"]')).toBeNull();
        choose(methodSelect(0), TimingMethodType.US_DELAY);
        expect(periodForms()[0].textContent).toContain('Delay/move');
      });

      it('byo-yomi has time per moment and moments instead of main time', () => {
        openEditor(0);
        typeInto(nameInput(), 'Byo');
        choose(methodSelect(0), TimingMethodType.BYO_YOMI);
        expect(timeGroup('Main time')).toBeNull();
        const t = timeGroup('Time per moment');
        typeInto(t.s, '30');
        typeInto(periodForms()[0].querySelector('input[aria-label="moments"]'), '5');
        button('Save').click();
        const p = StorageManager.loadCustomOption(0).periods[0];
        expect(p.byoTimeMs).toBe(30000);
        expect(p.byoMoments).toBe(5);
      });

      it('canadian byo-yomi time is capped at 9:59', () => {
        openEditor(0);
        typeInto(nameInput(), 'Canada');
        choose(methodSelect(0), TimingMethodType.CANADIAN_BYO);
        const t = timeGroup('Time for move group (max 9:59)');
        typeInto(t.m, '15');
        button('Save').click();
        expect(StorageManager.loadCustomOption(0).periods[0].byoTimeMs).toBe(Limits.MAX_CANADIAN_TIME_MS);
      });

      it('upcount has no main time input', () => {
        openEditor(0);
        choose(methodSelect(0), TimingMethodType.UPCOUNT);
        expect(timeGroup('Main time')).toBeNull();
      });

      it('edits the time of the correct period', () => {
        openEditor(0);
        typeInto(nameInput(), 'Two');
        button('+ Add Period').click();
        typeInto(timeGroup('Main time', 1).m, '30');
        button('Save').click();
        const ps = StorageManager.loadCustomOption(0).periods;
        expect(ps[0].timeMs).toBe(300000);
        expect(ps[1].timeMs).toBe(1800000);
      });
    });

    describe('asymmetric time (B21)', () => {
      it('shows a right player time input for the first period only', () => {
        openEditor(0);
        button('+ Add Period').click();
        const asym = $('.custom-edit-form > .form-group input[type="checkbox"]');
        asym.checked = true;
        asym.dispatchEvent(new Event('change'));
        expect(timeGroup('Right player time')).not.toBeNull();
        expect(periodForms()[1].querySelector('.time-input-label').textContent).toBe('Main time');
        expect($$('.time-input-label').filter((l) => l.textContent === 'Right player time').length).toBe(1);
      });

      it('builds a config that gives the players different starting times', () => {
        openEditor(0);
        typeInto(nameInput(), 'Odds');
        const asym = $('.custom-edit-form > .form-group input[type="checkbox"]');
        asym.checked = true;
        asym.dispatchEvent(new Event('change'));
        typeInto(timeGroup('Right player time').m, '3');
        button('Save & Use').click();
        const cfg = onSelect.mock.calls[0][0];
        expect(cfg.asymmetric).toBe(true);
        expect(cfg.rightTimeMs).toBe(180000);

        const gs = new GameState();
        gs.initGame(cfg);
        expect(gs.left.timeMs).toBe(300000);
        expect(gs.right.timeMs).toBe(180000);
      });

      // aqaa: suspected bug: unchecking "Different times per player" only sets
      // asymmetric=false; the previously entered rightTimeMs stays in the saved config and
      // GameState.initGame() still applies it, so the players get different times although
      // the user turned asymmetric time off.
      it.skip('aqaa: open bug, see report - unchecking asymmetric time gives both players the same time [B21]', () => {
        openEditor(0);
        typeInto(nameInput(), 'Even');
        let asym = $('.custom-edit-form > .form-group input[type="checkbox"]');
        asym.checked = true;
        asym.dispatchEvent(new Event('change'));
        typeInto(timeGroup('Right player time').m, '3');
        asym = $('.custom-edit-form > .form-group input[type="checkbox"]');
        asym.checked = false;
        asym.dispatchEvent(new Event('change'));
        button('Save & Use').click();
        const gs = new GameState();
        gs.initGame(onSelect.mock.calls[0][0]);
        expect(gs.right.timeMs).toBe(gs.left.timeMs);
      });
    });

    // aqaa: suspected bug: the h/m/s inputs declare min=0 but update() accepts any integer,
    // so typing "-5" minutes stores a negative main time (the clock then starts expired).
    it.skip('aqaa: open bug, see report - negative h/m/s input does not produce a negative period time', () => {
      openEditor(0);
      typeInto(nameInput(), 'Neg');
      typeInto(timeGroup('Main time').m, '-5');
      button('Save').click();
      expect(StorageManager.loadCustomOption(0).periods[0].timeMs).toBeGreaterThanOrEqual(0);
    });

    // aqaa: suspected bug: a stored custom option without a name (accepted by
    // StorageManager, shown as "Custom" in the list and in the name field) makes
    // _promptNameIfDefault call undefined.trim() and throw, so Save does nothing and no
    // name prompt is shown (B10).
    it.skip('aqaa: open bug, see report - saving an unnamed stored option prompts for a name [B10]', () => {
      StorageManager.saveCustomOption(0, { periods: [{ method: TimingMethodType.TIME, timeMs: 60000 }] });
      openEditor(0);
      expect(nameInput().value).toBe('Custom');
      button('Save').click();
      expect($('.name-hint')).not.toBeNull();
    });
  });
});
