/**
 * SettingsPanel - Option selection + manual configuration UI
 *
 * Provides:
 * - Preset option browser (options 1-24)
 * - Custom option editor (options 26-30)
 * - Per-period configuration with method selection
 * - Asymmetric time support
 */

import { presets, getPreset } from '../presets/presets.js';
import { StorageManager } from '../storage/StorageManager.js';
import { TimingMethodType, Limits, CLOCK_FONTS } from '../utils/constants.js';
import { formatTimeShort } from '../utils/TimeFormatter.js';

const METHOD_NAMES = {
  [TimingMethodType.TIME]: 'Time (Sudden Death)',
  [TimingMethodType.FISCHER]: 'Fischer Bonus',
  [TimingMethodType.US_DELAY]: 'US Delay',
  [TimingMethodType.DELAY]: 'Bronstein Delay',
  [TimingMethodType.BYO_YOMI]: 'Byo-yomi (Japanese)',
  [TimingMethodType.CANADIAN_BYO]: 'Canadian Byo-yomi',
  [TimingMethodType.UPCOUNT]: 'Upcount (Scrabble)',
  [TimingMethodType.END]: '-- End --',
};

/** Methods that can only be the last period */
const LAST_PERIOD_ONLY = [TimingMethodType.BYO_YOMI, TimingMethodType.CANADIAN_BYO, TimingMethodType.UPCOUNT];

export class SettingsPanel {
  /**
   * @param {HTMLElement} containerEl - Settings panel container
   */
  constructor(containerEl) {
    this._container = containerEl;
    this._onSelect = null;
    this._onClose = null;
    this._currentView = 'presets'; // 'presets' | 'custom-list' | 'custom-edit'
    this._editingSlot = -1;
    this._editingConfig = null;
  }

  /**
   * Set callbacks.
   * @param {Function} onSelect - (optionConfig, optionNumber) => void
   * @param {Function} onClose - () => void
   */
  setCallbacks(onSelect, onClose) {
    this._onSelect = onSelect;
    this._onClose = onClose;
  }

  /**
   * Show the settings panel.
   */
  show() {
    this._currentView = 'presets';
    this._render();
    this._container.classList.remove('hidden');
  }

  /**
   * Hide the settings panel.
   */
  hide() {
    this._container.classList.add('hidden');
    if (this._onClose) this._onClose();
  }

  /**
   * Check if visible.
   * @returns {boolean}
   */
  isVisible() {
    return !this._container.classList.contains('hidden');
  }

  /**
   * Render the current view.
   */
  _render() {
    switch (this._currentView) {
      case 'presets':
        this._renderPresets();
        break;
      case 'custom-list':
        this._renderCustomList();
        break;
      case 'custom-edit':
        this._renderCustomEdit();
        break;
    }
  }

  /**
   * Render the preset options grid.
   */
  _renderPresets() {
    this._container.innerHTML = '';
    const panel = document.createElement('div');
    panel.className = 'settings-panel';

    // Header
    const header = document.createElement('div');
    header.className = 'settings-header';
    const title = document.createElement('h2');
    title.textContent = 'Select Time Control';
    const closeBtn = document.createElement('button');
    closeBtn.className = 'btn btn-icon settings-close';
    closeBtn.textContent = '\u2715'; // X
    closeBtn.setAttribute('aria-label', 'Close settings');
    closeBtn.addEventListener('click', () => this.hide());
    header.appendChild(title);
    header.appendChild(closeBtn);
    panel.appendChild(header);

    // Font selector
    const fontGroup = document.createElement('div');
    fontGroup.className = 'settings-font-group';
    const fontLabel = document.createElement('label');
    fontLabel.className = 'form-label';
    fontLabel.textContent = 'Clock Font';
    const fontSelect = document.createElement('select');
    fontSelect.className = 'form-input';
    const currentFont = StorageManager.loadFont();
    for (const font of CLOCK_FONTS) {
      const option = document.createElement('option');
      option.value = font.id;
      option.textContent = font.name;
      option.selected = font.id === currentFont;
      fontSelect.appendChild(option);
    }
    fontSelect.addEventListener('change', (e) => {
      const fontDef = CLOCK_FONTS.find((f) => f.id === e.target.value);
      if (fontDef) {
        StorageManager.saveFont(fontDef.id);
        document.documentElement.style.setProperty('--clock-font', fontDef.family);
      }
    });
    fontGroup.appendChild(fontLabel);
    fontGroup.appendChild(fontSelect);
    panel.appendChild(fontGroup);

    // Tabs
    const tabs = document.createElement('div');
    tabs.className = 'settings-tabs';
    const presetTab = document.createElement('button');
    presetTab.className = 'settings-tab active';
    presetTab.textContent = 'Presets';
    const customTab = document.createElement('button');
    customTab.className = 'settings-tab';
    customTab.textContent = 'Custom';
    customTab.addEventListener('click', () => {
      this._currentView = 'custom-list';
      this._render();
    });
    tabs.appendChild(presetTab);
    tabs.appendChild(customTab);
    panel.appendChild(tabs);

    // Preset grid
    const grid = document.createElement('div');
    grid.className = 'settings-grid';

    for (const preset of presets) {
      const card = document.createElement('button');
      card.className = 'preset-card';
      card.setAttribute('data-option', preset.id);

      const num = document.createElement('span');
      num.className = 'preset-number';
      num.textContent = `#${String(preset.id).padStart(2, '0')}`;

      const name = document.createElement('span');
      name.className = 'preset-name';
      name.textContent = preset.name;

      const desc = document.createElement('span');
      desc.className = 'preset-desc';
      desc.textContent = preset.description;

      const method = document.createElement('span');
      method.className = 'preset-method';
      method.textContent = preset.periods.map((p) => p.method).join(' + ');

      card.appendChild(num);
      card.appendChild(name);
      card.appendChild(desc);
      card.appendChild(method);

      card.addEventListener('click', () => {
        if (this._onSelect) {
          this._onSelect(preset, preset.id);
        }
        this.hide();
      });

      grid.appendChild(card);
    }

    panel.appendChild(grid);
    this._container.appendChild(panel);
  }

  /**
   * Render the custom options list.
   */
  _renderCustomList() {
    this._container.innerHTML = '';
    const panel = document.createElement('div');
    panel.className = 'settings-panel';

    // Header
    const header = document.createElement('div');
    header.className = 'settings-header';
    const title = document.createElement('h2');
    title.textContent = 'Custom Options';
    const closeBtn = document.createElement('button');
    closeBtn.className = 'btn btn-icon settings-close';
    closeBtn.textContent = '\u2715';
    closeBtn.addEventListener('click', () => this.hide());
    header.appendChild(title);
    header.appendChild(closeBtn);
    panel.appendChild(header);

    // Tabs
    const tabs = document.createElement('div');
    tabs.className = 'settings-tabs';
    const presetTab = document.createElement('button');
    presetTab.className = 'settings-tab';
    presetTab.textContent = 'Presets';
    presetTab.addEventListener('click', () => {
      this._currentView = 'presets';
      this._render();
    });
    const customTab = document.createElement('button');
    customTab.className = 'settings-tab active';
    customTab.textContent = 'Custom';
    tabs.appendChild(presetTab);
    tabs.appendChild(customTab);
    panel.appendChild(tabs);

    // Custom slots
    const customOptions = StorageManager.loadCustomOptions();
    const list = document.createElement('div');
    list.className = 'custom-list';

    for (let i = 0; i < Limits.MAX_MANUAL_OPTIONS; i++) {
      const optionNum = Limits.MANUAL_OPTION_START + i;
      const config = customOptions[i];

      const item = document.createElement('div');
      item.className = 'custom-item';

      const info = document.createElement('div');
      info.className = 'custom-info';
      const label = document.createElement('span');
      label.className = 'custom-label';
      label.textContent = `#${optionNum} - Manual Set ${i + 1}`;
      const desc = document.createElement('span');
      desc.className = 'custom-desc';
      desc.textContent = config ? config.name || 'Custom' : 'Empty';
      info.appendChild(label);
      info.appendChild(desc);

      const actions = document.createElement('div');
      actions.className = 'custom-actions';

      if (config) {
        const useBtn = document.createElement('button');
        useBtn.className = 'btn btn-primary btn-sm';
        useBtn.textContent = 'Use';
        useBtn.addEventListener('click', () => {
          if (this._onSelect) {
            this._onSelect(config, optionNum);
          }
          this.hide();
        });
        actions.appendChild(useBtn);
      }

      const editBtn = document.createElement('button');
      editBtn.className = 'btn btn-secondary btn-sm';
      editBtn.textContent = config ? 'Edit' : 'Create';
      editBtn.addEventListener('click', () => {
        this._editingSlot = i;
        this._editingConfig = config ? JSON.parse(JSON.stringify(config)) : StorageManager.createDefaultCustomOption();
        this._currentView = 'custom-edit';
        this._render();
      });
      actions.appendChild(editBtn);

      item.appendChild(info);
      item.appendChild(actions);
      list.appendChild(item);
    }

    panel.appendChild(list);
    this._container.appendChild(panel);
  }

  /**
   * Render the custom option editor.
   */
  _renderCustomEdit() {
    this._container.innerHTML = '';
    const panel = document.createElement('div');
    panel.className = 'settings-panel';

    // Header
    const header = document.createElement('div');
    header.className = 'settings-header';
    const title = document.createElement('h2');
    title.textContent = `Edit Custom #${Limits.MANUAL_OPTION_START + this._editingSlot}`;
    const backBtn = document.createElement('button');
    backBtn.className = 'btn btn-icon';
    backBtn.textContent = '\u2190'; // Left arrow
    backBtn.addEventListener('click', () => {
      this._currentView = 'custom-list';
      this._render();
    });
    header.appendChild(backBtn);
    header.appendChild(title);
    panel.appendChild(header);

    const form = document.createElement('div');
    form.className = 'custom-edit-form';

    // Option name
    const nameGroup = this._createFormGroup('Name', 'text', this._editingConfig.name || 'Custom');
    nameGroup.input.addEventListener('input', (e) => {
      this._editingConfig.name = e.target.value;
    });
    form.appendChild(nameGroup.group);

    // Asymmetric toggle
    const asymmetricGroup = document.createElement('div');
    asymmetricGroup.className = 'form-group';
    const asymLabel = document.createElement('label');
    asymLabel.className = 'form-label';
    const asymCheck = document.createElement('input');
    asymCheck.type = 'checkbox';
    asymCheck.checked = !!this._editingConfig.asymmetric;
    asymLabel.appendChild(asymCheck);
    asymLabel.appendChild(document.createTextNode(' Different times per player'));
    asymmetricGroup.appendChild(asymLabel);
    form.appendChild(asymmetricGroup);

    // Periods
    const periodsSection = document.createElement('div');
    periodsSection.className = 'periods-section';
    const periodsTitle = document.createElement('h3');
    periodsTitle.textContent = 'Periods';
    periodsSection.appendChild(periodsTitle);

    const renderPeriods = () => {
      // Clear existing period forms
      const existingForms = periodsSection.querySelectorAll('.period-form');
      existingForms.forEach((f) => f.remove());

      for (let p = 0; p < this._editingConfig.periods.length; p++) {
        const periodForm = this._createPeriodForm(p, this._editingConfig.periods[p], asymCheck.checked);
        periodsSection.appendChild(periodForm);
      }

      // Add period button (if under max)
      let addBtn = periodsSection.querySelector('.add-period-btn');
      if (addBtn) addBtn.remove();
      if (this._editingConfig.periods.length < Limits.MAX_PERIODS) {
        addBtn = document.createElement('button');
        addBtn.className = 'btn btn-secondary add-period-btn';
        addBtn.textContent = '+ Add Period';
        addBtn.addEventListener('click', () => {
          this._editingConfig.periods.push({ method: TimingMethodType.TIME, timeMs: 300000 });
          renderPeriods();
        });
        periodsSection.appendChild(addBtn);
      }
    };

    renderPeriods();

    asymCheck.addEventListener('change', () => {
      this._editingConfig.asymmetric = asymCheck.checked;
      renderPeriods();
    });

    form.appendChild(periodsSection);

    // Defaults
    const defaultsSection = document.createElement('div');
    defaultsSection.className = 'defaults-section';

    const freezeGroup = document.createElement('div');
    freezeGroup.className = 'form-group';
    const freezeLabel = document.createElement('label');
    freezeLabel.className = 'form-label';
    const freezeCheck = document.createElement('input');
    freezeCheck.type = 'checkbox';
    freezeCheck.checked = !!this._editingConfig.freezeDefault;
    freezeCheck.addEventListener('change', (e) => {
      this._editingConfig.freezeDefault = e.target.checked;
    });
    freezeLabel.appendChild(freezeCheck);
    freezeLabel.appendChild(document.createTextNode(' Freeze on time-out'));
    freezeGroup.appendChild(freezeLabel);
    defaultsSection.appendChild(freezeGroup);

    const soundGroup = document.createElement('div');
    soundGroup.className = 'form-group';
    const soundLabel = document.createElement('label');
    soundLabel.className = 'form-label';
    const soundCheck = document.createElement('input');
    soundCheck.type = 'checkbox';
    soundCheck.checked = !!this._editingConfig.soundDefault;
    soundCheck.addEventListener('change', (e) => {
      this._editingConfig.soundDefault = e.target.checked;
    });
    soundLabel.appendChild(soundCheck);
    soundLabel.appendChild(document.createTextNode(' Sound enabled'));
    soundGroup.appendChild(soundLabel);
    defaultsSection.appendChild(soundGroup);

    form.appendChild(defaultsSection);

    // Save/Cancel buttons
    const buttons = document.createElement('div');
    buttons.className = 'form-buttons';

    const saveBtn = document.createElement('button');
    saveBtn.className = 'btn btn-primary';
    saveBtn.textContent = 'Save & Use';
    saveBtn.addEventListener('click', () => {
      this._promptNameIfDefault(nameGroup.input, () => {
        StorageManager.saveCustomOption(this._editingSlot, this._editingConfig);
        if (this._onSelect) {
          this._onSelect(this._editingConfig, Limits.MANUAL_OPTION_START + this._editingSlot);
        }
        this.hide();
      });
    });

    const saveOnlyBtn = document.createElement('button');
    saveOnlyBtn.className = 'btn btn-secondary';
    saveOnlyBtn.textContent = 'Save';
    saveOnlyBtn.addEventListener('click', () => {
      this._promptNameIfDefault(nameGroup.input, () => {
        StorageManager.saveCustomOption(this._editingSlot, this._editingConfig);
        this._currentView = 'custom-list';
        this._render();
      });
    });

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'btn btn-secondary';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.addEventListener('click', () => {
      this._currentView = 'custom-list';
      this._render();
    });

    buttons.appendChild(cancelBtn);
    buttons.appendChild(saveOnlyBtn);
    buttons.appendChild(saveBtn);
    form.appendChild(buttons);

    panel.appendChild(form);
    this._container.appendChild(panel);
  }

  /**
   * Prompt the user to name their custom mode if the name is still the default.
   * Focuses and highlights the name input. Proceeds with callback on confirmation.
   * @param {HTMLInputElement} nameInput - The name input element
   * @param {Function} onConfirm - Callback to run after naming
   */
  _promptNameIfDefault(nameInput, onConfirm) {
    if (this._editingConfig.name === 'Custom' || !this._editingConfig.name.trim()) {
      nameInput.focus();
      nameInput.select();
      nameInput.classList.add('form-input-highlight');
      // Show inline hint
      let hint = nameInput.parentElement.querySelector('.name-hint');
      if (!hint) {
        hint = document.createElement('span');
        hint.className = 'name-hint';
        hint.textContent = 'Give your mode a name, then save again';
        nameInput.parentElement.appendChild(hint);
      }
      // Remove highlight on next input
      const cleanup = () => {
        nameInput.classList.remove('form-input-highlight');
        if (hint) hint.remove();
        nameInput.removeEventListener('input', cleanup);
      };
      nameInput.addEventListener('input', cleanup);
      return;
    }
    onConfirm();
  }

  /**
   * Create a form group with label and input.
   * @param {string} label
   * @param {string} type
   * @param {string|number} value
   * @returns {{ group: HTMLElement, input: HTMLInputElement }}
   */
  _createFormGroup(label, type, value) {
    const group = document.createElement('div');
    group.className = 'form-group';

    const labelEl = document.createElement('label');
    labelEl.className = 'form-label';
    labelEl.textContent = label;

    const input = document.createElement('input');
    input.type = type;
    input.className = 'form-input';
    input.value = value;

    group.appendChild(labelEl);
    group.appendChild(input);

    return { group, input };
  }

  /**
   * Create a time input (hours:minutes:seconds).
   * @param {number} ms - Time in ms
   * @param {Function} onChange - (newMs) => void
   * @param {string} [labelPrefix='']
   * @returns {HTMLElement}
   */
  _createTimeInput(ms, onChange, labelPrefix = '') {
    const container = document.createElement('div');
    container.className = 'time-input-group';

    if (labelPrefix) {
      const label = document.createElement('span');
      label.className = 'time-input-label';
      label.textContent = labelPrefix;
      container.appendChild(label);
    }

    const totalSec = Math.floor(ms / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;

    const hInput = this._createNumberInput(h, 0, 9, 'h');
    const mInput = this._createNumberInput(m, 0, 59, 'm');
    const sInput = this._createNumberInput(s, 0, 59, 's');

    const update = () => {
      const h = parseInt(hInput.value, 10) || 0;
      const m = parseInt(mInput.value, 10) || 0;
      const s = parseInt(sInput.value, 10) || 0;
      const newMs = (h * 3600 + m * 60 + s) * 1000;
      onChange(newMs);
    };

    hInput.addEventListener('input', update);
    mInput.addEventListener('input', update);
    sInput.addEventListener('input', update);

    container.appendChild(hInput);
    const hSuffix = document.createElement('span');
    hSuffix.className = 'time-input-suffix';
    hSuffix.textContent = 'h';
    container.appendChild(hSuffix);

    container.appendChild(mInput);
    const mSuffix = document.createElement('span');
    mSuffix.className = 'time-input-suffix';
    mSuffix.textContent = 'm';
    container.appendChild(mSuffix);

    container.appendChild(sInput);
    const sSuffix = document.createElement('span');
    sSuffix.className = 'time-input-suffix';
    sSuffix.textContent = 's';
    container.appendChild(sSuffix);

    return container;
  }

  /**
   * Create a number input.
   * @param {number} value
   * @param {number} min
   * @param {number} max
   * @param {string} suffix
   * @returns {HTMLInputElement}
   */
  _createNumberInput(value, min, max, suffix) {
    const input = document.createElement('input');
    input.type = 'number';
    input.className = 'form-input form-input-time';
    input.value = value;
    input.min = min;
    input.max = max;
    input.setAttribute('aria-label', suffix);
    return input;
  }

  /**
   * Create a period configuration form.
   * @param {number} periodIndex
   * @param {object} periodConfig
   * @param {boolean} asymmetric
   * @returns {HTMLElement}
   */
  _createPeriodForm(periodIndex, periodConfig, asymmetric) {
    const container = document.createElement('div');
    container.className = 'period-form';

    const periodHeader = document.createElement('div');
    periodHeader.className = 'period-header';
    const periodTitle = document.createElement('span');
    periodTitle.textContent = `Period ${periodIndex + 1}`;
    periodHeader.appendChild(periodTitle);

    // Remove button
    if (periodIndex > 0) {
      const removeBtn = document.createElement('button');
      removeBtn.className = 'btn btn-icon btn-sm';
      removeBtn.textContent = '\u2715';
      removeBtn.title = 'Remove period';
      removeBtn.addEventListener('click', () => {
        this._editingConfig.periods.splice(periodIndex, 1);
        this._currentView = 'custom-edit';
        this._render();
      });
      periodHeader.appendChild(removeBtn);
    }
    container.appendChild(periodHeader);

    // Method selector
    const methodGroup = document.createElement('div');
    methodGroup.className = 'form-group';
    const methodLabel = document.createElement('label');
    methodLabel.className = 'form-label';
    methodLabel.textContent = 'Method';
    const methodSelect = document.createElement('select');
    methodSelect.className = 'form-input';

    const isLastPeriod = periodIndex === this._editingConfig.periods.length - 1;

    for (const [key, name] of Object.entries(METHOD_NAMES)) {
      if (key === TimingMethodType.END) continue; // END is not user-selectable
      // Last-period-only methods can only appear as last period
      if (LAST_PERIOD_ONLY.includes(key) && !isLastPeriod) continue;

      const option = document.createElement('option');
      option.value = key;
      option.textContent = name;
      option.selected = key === periodConfig.method;
      methodSelect.appendChild(option);
    }

    methodSelect.addEventListener('change', (e) => {
      this._editingConfig.periods[periodIndex].method = e.target.value;
      // Reset method-specific fields
      this._currentView = 'custom-edit';
      this._render();
    });

    methodGroup.appendChild(methodLabel);
    methodGroup.appendChild(methodSelect);
    container.appendChild(methodGroup);

    // Method-specific fields
    const method = periodConfig.method;

    // Main time (for all except Upcount)
    if (method !== TimingMethodType.UPCOUNT && method !== TimingMethodType.BYO_YOMI && method !== TimingMethodType.CANADIAN_BYO) {
      const timeInput = this._createTimeInput(
        periodConfig.timeMs || 0,
        (newMs) => { this._editingConfig.periods[periodIndex].timeMs = newMs; },
        'Main time',
      );
      container.appendChild(timeInput);

      // Asymmetric: right player time
      if (asymmetric && periodIndex === 0) {
        const rightTimeInput = this._createTimeInput(
          this._editingConfig.rightTimeMs || periodConfig.timeMs || 0,
          (newMs) => { this._editingConfig.rightTimeMs = newMs; },
          'Right player time',
        );
        container.appendChild(rightTimeInput);
      }
    }

    // Bonus/Delay time (for Fischer, Delay, US-Delay)
    if (method === TimingMethodType.FISCHER || method === TimingMethodType.DELAY || method === TimingMethodType.US_DELAY) {
      const delayLabel = method === TimingMethodType.FISCHER ? 'Bonus/move' : 'Delay/move';
      const delayContainer = document.createElement('div');
      delayContainer.className = 'form-group';
      const dlabel = document.createElement('label');
      dlabel.className = 'form-label';
      dlabel.textContent = delayLabel;

      const delayInput = this._createNumberInput(
        Math.floor((periodConfig.delayMs || 0) / 1000), 0, 300, 'seconds',
      );
      delayInput.addEventListener('input', (e) => {
        this._editingConfig.periods[periodIndex].delayMs = (parseInt(e.target.value, 10) || 0) * 1000;
      });

      const secLabel = document.createElement('span');
      secLabel.textContent = ' sec';

      delayContainer.appendChild(dlabel);
      delayContainer.appendChild(delayInput);
      delayContainer.appendChild(secLabel);
      container.appendChild(delayContainer);
    }

    // Moves required (for Fischer)
    if (method === TimingMethodType.FISCHER) {
      const movesContainer = document.createElement('div');
      movesContainer.className = 'form-group';
      const mlabel = document.createElement('label');
      mlabel.className = 'form-label';
      mlabel.textContent = 'Moves (0 = until time expires)';

      const movesInput = this._createNumberInput(
        periodConfig.movesRequired || 0, 0, 999, 'moves',
      );
      movesInput.addEventListener('input', (e) => {
        this._editingConfig.periods[periodIndex].movesRequired = parseInt(e.target.value, 10) || 0;
      });

      movesContainer.appendChild(mlabel);
      movesContainer.appendChild(movesInput);
      container.appendChild(movesContainer);
    }

    // Byo-yomi time and moments
    if (method === TimingMethodType.BYO_YOMI) {
      const byoTimeInput = this._createTimeInput(
        periodConfig.byoTimeMs || 0,
        (newMs) => { this._editingConfig.periods[periodIndex].byoTimeMs = newMs; },
        'Time per moment',
      );
      container.appendChild(byoTimeInput);

      const momentsContainer = document.createElement('div');
      momentsContainer.className = 'form-group';
      const momLabel = document.createElement('label');
      momLabel.className = 'form-label';
      momLabel.textContent = 'Moments (0 = infinite)';

      const momInput = this._createNumberInput(
        periodConfig.byoMoments || 0, 0, Limits.MAX_BYO_MOMENTS, 'moments',
      );
      momInput.addEventListener('input', (e) => {
        this._editingConfig.periods[periodIndex].byoMoments = parseInt(e.target.value, 10) || 0;
      });

      momentsContainer.appendChild(momLabel);
      momentsContainer.appendChild(momInput);
      container.appendChild(momentsContainer);
    }

    // Canadian Byo-yomi time
    if (method === TimingMethodType.CANADIAN_BYO) {
      const cbyoTimeInput = this._createTimeInput(
        periodConfig.byoTimeMs || 0,
        (newMs) => {
          this._editingConfig.periods[periodIndex].byoTimeMs = Math.min(newMs, Limits.MAX_CANADIAN_TIME_MS);
        },
        'Time for move group (max 9:59)',
      );
      container.appendChild(cbyoTimeInput);
    }

    return container;
  }
}
