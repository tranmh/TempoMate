# TempoMate

A modern, browser-based, feature-rich chess clock. Built with vanilla JavaScript (ES modules), HTML, and CSS -- zero runtime dependencies.

**Live demo**: https://cuong.net/tempomate/
**Latest build** (auto-deployed from master): https://tranmh.github.io/TempoMate/dist/
**Source code**: https://github.com/tranmh/TempoMate

## Features

- **7 Timing Methods**: Time (Sudden Death), Fischer Bonus, Bronstein Delay, US Delay, Japanese Byo-yomi, Canadian Byo-yomi, and Upcount (Scrabble)
- **26 Built-in Presets**: Including FIDE, rapid, blitz, bullet, and specialized time controls
- **5 Custom Slots**: Create and save your own time controls (options 27-31) with full period configuration, custom naming (prompted on first save), and h/m/s time input labels
- **Multi-Period Support**: Up to 4 periods per game with automatic transitions (time-based and move-based)
- **Asymmetric Time**: Different starting times per player
- **Arbiter Correction Mode**: Edit time, moves, and period for both players mid-game (long press pause button)
- **Freeze Mode**: Clock stops when time expires (FIDE standard) -- configurable per preset
- **Sound Alerts**: Warning beep at 10s, countdown beeps in last 5s, expiry beep, and byo-yomi moment alerts
- **Dark/Light/Auto Theme**: Persistent theme switching with system preference detection
- **Mobile-First Design**: Portrait mode rotates one clock 180 degrees for face-to-face tabletop play, wake lock prevents screen dimming
- **Offline-Ready**: Builds to a single HTML file that works via `file://` protocol -- no server needed
- **Keyboard Shortcuts**: Full keyboard control for desktop use

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Install

```bash
git clone https://github.com/tranmh/TempoMate
cd TempoMate
npm install
```

### Development

```bash
npm run dev
```

Opens a local server serving the `src/` directory with native ES module support. Navigate to the URL shown in the terminal (typically `http://localhost:3000`).

### Build

```bash
npm run build
```

Produces `dist/index.html` -- a single self-contained file with all CSS and JavaScript inlined. Can be opened directly from the filesystem or deployed to any static host.

### Test

```bash
# Unit tests (Jest)
npm test

# Unit tests in watch mode
npm run test:watch

# End-to-end tests (Playwright, requires Chromium)
npm run test:e2e

# All tests
npm run test:all
```

## Usage

### Starting a Game

1. Select a time control via the settings gear icon or press a number key (1-9, 0=10) for quick preset selection
2. Tap a clock face or press Space/Enter to start -- the tapped side's opponent begins
3. Tap the active clock face (or press Space/Enter) to switch turns

### Controls

| Action | Touch/Click | Keyboard |
|--------|-------------|----------|
| Switch turn | Tap active clock | Space / Enter |
| Pause/Resume | Pause button | P |
| Toggle sound | Sound button | S |
| Toggle freeze | -- | F |
| Show moves | -- | M (hold) |
| Reset | Reset button | R |
| Quick preset | -- | 1-9, 0 |
| Correction mode | Long press pause (3s) | -- |
| Exit overlay | -- | Escape |
| Navigate (correction) | -- | Arrow keys |

### Correction Mode

Enter correction mode by long-pressing the pause button (3 seconds) while paused or frozen. Use arrow keys to navigate between fields and up/down to adjust values. Press Enter to save or Escape to cancel.

Editable fields: hours, minutes, seconds (per player), move count, and period number.

### Presets

| Options | Method | Description |
|---------|--------|-------------|
| 01-05 | Time | Simple countdown (5m, 10m, 25m, 1h, 2h) |
| 06-09 | Time | Multi-period (e.g., 2h + 30m, 2h + 1h) |
| 10-14 | Fischer | Bonus per move (e.g., 3+2, 25+10, 1h30+30s) |
| 15-18 | Bronstein | Delay per move (e.g., 25+10s, 1h55+5s) |
| 19 | Canadian Byo | Canadian byo-yomi (time per move group) |
| 20 | Byo-yomi | Japanese byo-yomi (time per moment) |
| 21 | Upcount | Scrabble (25m + overtime count-up) |
| 22-24 | US Delay | US delay (e.g., 5+2s, 25+5s) |
| 25 | Time | Bullet (1 minute sudden death) |
| 26 | Time | Ultra Bullet (30 seconds sudden death) |

## Architecture

```
src/
  index.html              Entry point
  css/                    Stylesheets (themes, layout, clock, settings)
  js/
    app.js                Main application - wires components together
    engine/
      TimerEngine.js      High-precision rAF + performance.now() timer
      TimingMethod.js      Abstract base class for timing methods
      PeriodManager.js     Multi-period transitions and method lifecycle
      MoveCounter.js       Per-player move tracking
      methods/             Strategy pattern implementations
        TimeMethod.js         Sudden death countdown
        FischerMethod.js      Fischer increment (bonus after move)
        BronsteinDelayMethod.js  Bronstein (compensate up to delay)
        UsDelayMethod.js      US delay (separate delay countdown)
        ByoYomiMethod.js      Japanese byo-yomi (per-moment time)
        CanadianByoYomiMethod.js  Canadian byo-yomi (time per move group)
        UpcountMethod.js      Scrabble overtime (count up)
    state/
      GameState.js         Central game state + pub/sub notifications
      PlayerState.js       Per-player state (time, period, flags, moves)
    ui/
      ClockDisplay.js      Clock face rendering (time, flags, colors)
      StatusBar.js         Method labels, period, icons, option number
      SettingsPanel.js     Preset browser + custom option editor
      CorrectionMode.js    Arbiter time/move/period correction overlay
      FlagIndicator.js     Blinking / non-blinking flag logic
      SoundManager.js      Web Audio API beep generation
      ThemeManager.js      Light/dark/auto theme switching
    input/
      InputHandler.js      Touch, click, keyboard events, long press
    storage/
      StorageManager.js    localStorage persistence
    presets/
      presets.js           26 preset configurations
    utils/
      constants.js         Enums and configuration constants
      TimeFormatter.js     ms-to-display-string formatting
tests/
  unit/                   Jest unit tests (12 files, 115+ tests)
  e2e/                    Playwright E2E tests (5 files)
```

### Design Principles

- **Zero runtime dependencies** -- vanilla JavaScript with native ES modules
- **Strategy pattern** for timing methods -- each method is a self-contained class implementing a common interface
- **Pub/sub state management** -- `GameState.onChange()` notifies UI components of state changes
- **Layered architecture** -- engine (logic), state (data), UI (rendering), input (events) are cleanly separated
- **High-precision timing** -- `requestAnimationFrame` + `performance.now()` with visibility change handling for background tabs

## Browser Support

- Chrome/Edge 80+
- Firefox 80+
- Safari 14+
- Mobile Chrome and Safari (iOS/Android)

Requires `requestAnimationFrame`, `performance.now()`, ES modules, and `AudioContext` (for sound).

## License

This project is licensed under the [GNU Affero General Public License v3.0](agpl-3.0.txt).
