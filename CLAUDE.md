# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Test Commands

```bash
npm run dev          # Dev server at localhost:3000 (npx serve src)
npm run build        # Inline all CSS/JS/fonts into single dist/index.html
npm test             # Jest unit tests (uses --experimental-vm-modules for ES modules)
npm run test:watch   # Jest watch mode
npm run test:e2e     # Playwright E2E tests (auto-starts dev server on :3000)
npm run test:all     # Run unit + E2E tests
```

Run a single unit test file:
```bash
node --experimental-vm-modules node_modules/.bin/jest tests/unit/SomeFile.test.js
```

Unit tests are in `tests/unit/`, E2E tests in `tests/e2e/`.

## Architecture

Browser-based chess clock. Vanilla JavaScript (ES modules), zero runtime dependencies, no transpilation. Builds to a single self-contained HTML file that works via `file://`.

### Layers (strict separation — don't cross boundaries)

- **Engine** (`src/js/engine/`) — TimerEngine (rAF + performance.now()), PeriodManager, MoveCounter
- **State** (`src/js/state/`) — GameState (central state + pub/sub via `onChange()`), PlayerState (per-player)
- **UI** (`src/js/ui/`) — ClockDisplay, StatusBar, SettingsPanel, CorrectionMode, SoundManager, ThemeManager, etc.
- **Input** (`src/js/input/`) — InputHandler (touch, click, keyboard events)
- **App** (`src/js/app.js`) — Wires all layers together. Exposes `window.__tempoMateApp` for testing.

### Key Patterns

- **Strategy pattern** for timing methods: Base class `TimingMethod` with interface methods (`onTurnStart`, `onTick`, `onTurnEnd`, `isExpired`). Seven implementations in `src/js/engine/methods/` (Fischer, Bronstein, US Delay, Byo-Yomi, Canadian Byo-Yomi, Upcount, Time/sudden-death).
- **Pub/sub** for state changes: `GameState.onChange(listener)` / `GameState.notify()`. UI components subscribe and unsubscribe to prevent leaks.
- **Factory method**: `PeriodManager.createMethod(periodConfig)` instantiates the correct TimingMethod.
- **Dirty-checking** in UI components (ClockDisplay, StatusBar) to avoid unnecessary DOM updates.
- All constants are frozen enums in `src/js/utils/constants.js` (GameStatus, Player, TimingMethodType, FlagState, Limits, Keys, etc.).

### Presets

26 built-in presets in `src/js/presets/presets.js` + 5 custom slots (options 27–31). Each preset defines periods (up to 4), each with a timing method and parameters. Helper functions `min()`, `hr()`, `sec()` convert to milliseconds.

### Game State Flow

IDLE → (tap/Space) → RUNNING → (tap/Space) → switch turns → (P) → PAUSED → (P) → RUNNING
Time expires → FROZEN. Long-press pause → CORRECTING. Reset → IDLE.

## Conventions

- Vanilla JS with native ES modules — no runtime dependencies, no TypeScript, no bundler
- Follow existing patterns: strategy for timing methods, pub/sub for state, layered architecture
- Every class has a `destroy()` method that removes event listeners
- JSDoc comments on all classes and public methods
- Build system (`build.js`) resolves ES imports via depth-first traversal and strips import/export statements

## CAD (Physical Enclosure)

`cad/` contains 3D-printable enclosure parts for a chess clock stand (basis, wippe/rocker, lehne/backrest).

### Structure

- `cad/scad_files/` — Original OpenSCAD source files
- `cad/cadquery/` — CadQuery (Python) port of the same geometry
- `cad/step/` — Exported STEP files (generated, not hand-edited)
- `cad/cadquery2step.sh` — Converts CadQuery `.py` → `.step` (requires conda env at `~/work/cadquery/env`)

### CAD Commands

```bash
# Run CadQuery tests
cd cad/cadquery && python -m pytest

# Convert all parts to STEP
./cad/cadquery2step.sh
```

### CAD Conventions

- Shared dimensions in `cad/cadquery/config.py` (all measurements in mm, German variable names)
- Parts: `basis.py` (base), `wippe.py` (rocker), `lehne.py` (backrest), `assembly.py` (combined)
- Each CadQuery part file exports STEP when run directly (`python basis.py`)
- Tests in `cad/cadquery/tests/` — unit tests per part plus fit/assembly tests
