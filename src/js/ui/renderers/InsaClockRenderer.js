/**
 * InsaClockRenderer - Insa-style analog clock face (SVG).
 *
 * Yugoslav tournament clock: darker walnut wood housing, bolder sans-serif
 * numerals, thicker hands, brass trim border, distinctive oscillating bar
 * that swings when the clock is active.
 */

import { ClockRenderer } from './ClockRenderer.js';
import { FlagState, TimingMethodType } from '../../utils/constants.js';

export class InsaClockRenderer extends ClockRenderer {
  constructor() {
    super();
    this._side = null;
    this._container = null;
    this._svgEl = null;
    this._minuteHand = null;
    this._hourHand = null;
    this._flagPanel = null;
    this._ledCircle = null;
    this._colorCircle = null;
    this._movesText = null;
    this._byoText = null;
    this._dialBorder = null;
    this._oscillatorBar = null;
    this._prev = {};
  }

  /** @override */
  build(container, side) {
    this._side = side;
    this._container = container;
    container.classList.add('analog-clock', 'insa-clock');

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 200 230');
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    svg.classList.add('analog-svg');

    // Wood housing background
    const housing = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    housing.setAttribute('x', '5');
    housing.setAttribute('y', '5');
    housing.setAttribute('width', '190');
    housing.setAttribute('height', '220');
    housing.setAttribute('rx', '8');
    housing.classList.add('insa-housing');

    // Brass trim border
    const trim = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    trim.setAttribute('x', '10');
    trim.setAttribute('y', '10');
    trim.setAttribute('width', '180');
    trim.setAttribute('height', '210');
    trim.setAttribute('rx', '6');
    trim.classList.add('insa-trim');

    // Clock dial
    const dialGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    dialGroup.setAttribute('transform', 'translate(100, 100)');

    // Dial background
    const dialBg = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    dialBg.setAttribute('r', '78');
    dialBg.classList.add('insa-dial');

    // Dial border
    this._dialBorder = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    this._dialBorder.setAttribute('r', '78');
    this._dialBorder.classList.add('insa-dial-border');

    // Red flag panel (between 11 and 12)
    this._flagPanel = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    this._flagPanel.classList.add('insa-flag');
    const flagPath = this._describeArc(0, 0, 68, 330, 360);
    this._flagPanel.setAttribute('d', flagPath);

    // Minute markers
    const markersGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    for (let i = 0; i < 60; i++) {
      const angle = i * 6;
      const isHour = i % 5 === 0;
      const inner = isHour ? 60 : 67;
      const outer = 73;
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      const rad = (angle - 90) * Math.PI / 180;
      line.setAttribute('x1', String(inner * Math.cos(rad)));
      line.setAttribute('y1', String(inner * Math.sin(rad)));
      line.setAttribute('x2', String(outer * Math.cos(rad)));
      line.setAttribute('y2', String(outer * Math.sin(rad)));
      line.classList.add(isHour ? 'insa-marker-hour' : 'insa-marker-minute');
      markersGroup.appendChild(line);
    }

    // Bold Arabic numerals (1-12)
    const numerals = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    numerals.classList.add('insa-numerals');
    for (let i = 1; i <= 12; i++) {
      const angle = i * 30 - 90;
      const rad = angle * Math.PI / 180;
      const r = 50;
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', String(r * Math.cos(rad)));
      text.setAttribute('y', String(r * Math.sin(rad)));
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('dominant-baseline', 'central');
      text.textContent = String(i);
      numerals.appendChild(text);
    }

    // Hour hand (thicker than Garde)
    this._hourHand = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    this._hourHand.setAttribute('x1', '0');
    this._hourHand.setAttribute('y1', '8');
    this._hourHand.setAttribute('x2', '0');
    this._hourHand.setAttribute('y2', '-35');
    this._hourHand.classList.add('insa-hand-hour');

    // Minute hand (thicker than Garde)
    this._minuteHand = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    this._minuteHand.setAttribute('x1', '0');
    this._minuteHand.setAttribute('y1', '10');
    this._minuteHand.setAttribute('x2', '0');
    this._minuteHand.setAttribute('y2', '-65');
    this._minuteHand.classList.add('insa-hand-minute');

    // Center pin (larger than Garde)
    const pin = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    pin.setAttribute('r', '4.5');
    pin.classList.add('insa-pin');

    dialGroup.appendChild(dialBg);
    dialGroup.appendChild(this._flagPanel);
    dialGroup.appendChild(markersGroup);
    dialGroup.appendChild(numerals);
    dialGroup.appendChild(this._dialBorder);
    dialGroup.appendChild(this._hourHand);
    dialGroup.appendChild(this._minuteHand);
    dialGroup.appendChild(pin);

    // Oscillating bar (below dial)
    this._oscillatorBar = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    this._oscillatorBar.setAttribute('x', '60');
    this._oscillatorBar.setAttribute('y', '188');
    this._oscillatorBar.setAttribute('width', '80');
    this._oscillatorBar.setAttribute('height', '6');
    this._oscillatorBar.setAttribute('rx', '3');
    this._oscillatorBar.classList.add('insa-oscillator');

    // LED indicator
    this._ledCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    this._ledCircle.setAttribute('cx', '100');
    this._ledCircle.setAttribute('cy', '205');
    this._ledCircle.setAttribute('r', '5');
    this._ledCircle.classList.add('insa-led');

    // Color indicator
    this._colorCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    this._colorCircle.setAttribute('cx', '160');
    this._colorCircle.setAttribute('cy', '205');
    this._colorCircle.setAttribute('r', '8');
    this._colorCircle.classList.add('insa-color-indicator');

    // Moves text
    this._movesText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    this._movesText.setAttribute('x', '40');
    this._movesText.setAttribute('y', '209');
    this._movesText.setAttribute('text-anchor', 'middle');
    this._movesText.classList.add('insa-info-text', 'hidden');

    // Byo-yomi text
    this._byoText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    this._byoText.setAttribute('x', '40');
    this._byoText.setAttribute('y', '221');
    this._byoText.setAttribute('text-anchor', 'middle');
    this._byoText.classList.add('insa-info-text', 'hidden');

    svg.appendChild(housing);
    svg.appendChild(trim);
    svg.appendChild(dialGroup);
    svg.appendChild(this._oscillatorBar);
    svg.appendChild(this._ledCircle);
    svg.appendChild(this._colorCircle);
    svg.appendChild(this._movesText);
    svg.appendChild(this._byoText);

    this._svgEl = svg;
    container.appendChild(svg);
    this._prev = {};
  }

  /** @override */
  update(state) {
    const p = this._prev;

    // Hand angles
    const angles = this._computeAngles(state.timeMs);
    if (angles.minute !== p.minuteAngle) {
      this._minuteHand.setAttribute('transform', `rotate(${angles.minute})`);
      p.minuteAngle = angles.minute;
    }
    if (angles.hour !== p.hourAngle) {
      this._hourHand.setAttribute('transform', `rotate(${angles.hour})`);
      p.hourAngle = angles.hour;
    }

    // Active/paused/frozen state
    if (state.isActive !== p.isActive) {
      this._container.classList.toggle('active', state.isActive);
      this._dialBorder.classList.toggle('insa-dial-active', state.isActive);
      this._oscillatorBar.classList.toggle('oscillating', state.isActive);
      p.isActive = state.isActive;
    }
    if (state.isPaused !== p.isPaused) {
      this._container.classList.toggle('paused', state.isPaused);
      if (state.isPaused) this._oscillatorBar.classList.remove('oscillating');
      p.isPaused = state.isPaused;
    }
    if (state.isFrozen !== p.isFrozen) {
      this._container.classList.toggle('frozen', state.isFrozen);
      if (state.isFrozen) this._oscillatorBar.classList.remove('oscillating');
      p.isFrozen = state.isFrozen;
    }

    // LED state
    const ledState = state.isFrozen ? 'frozen' : state.isPaused ? 'paused' : state.isActive ? 'active' : 'off';
    if (ledState !== p.ledState) {
      this._ledCircle.classList.remove('led-active', 'led-paused', 'led-frozen');
      if (ledState !== 'off') this._ledCircle.classList.add(`led-${ledState}`);
      p.ledState = ledState;
    }

    // Flag state
    if (state.flagState !== p.flagState) {
      this._flagPanel.classList.remove('flag-raised', 'flag-fallen', 'flag-fallen-blink');
      if (state.flagState === FlagState.NONE) {
        this._flagPanel.classList.add('flag-raised');
      } else if (state.flagState === FlagState.BLINKING) {
        this._flagPanel.classList.add('flag-fallen-blink');
      } else {
        this._flagPanel.classList.add('flag-fallen');
      }
      p.flagState = state.flagState;
    }

    // Color indicator
    if (state.color !== p.color) {
      this._colorCircle.classList.remove('piece-white', 'piece-black');
      this._colorCircle.classList.add(`piece-${state.color}`);
      p.color = state.color;
    }

    // Move count
    if (state.showMoves !== p.showMoves || state.moves !== p.moves) {
      if (state.showMoves) {
        this._movesText.textContent = `Moves: ${state.moves}`;
        this._movesText.classList.remove('hidden');
      } else {
        this._movesText.classList.add('hidden');
      }
      p.showMoves = state.showMoves;
      p.moves = state.moves;
    }

    // Byo-yomi
    if (state.byoMoments !== p.byoMoments) {
      if (state.byoMoments !== undefined && state.byoMoments > 0) {
        this._byoText.textContent = `\u00D7${state.byoMoments}`;
        this._byoText.classList.remove('hidden');
      } else {
        this._byoText.classList.add('hidden');
      }
      p.byoMoments = state.byoMoments;
    }

    // Low time / expired on hands
    const isUpcount = state.method === TimingMethodType.UPCOUNT;
    const lowTime = !isUpcount && state.timeMs > 0 && state.timeMs <= 10000;
    const expired = !isUpcount && state.timeMs <= 0;
    if (lowTime !== p.lowTime) {
      this._minuteHand.classList.toggle('hand-low', lowTime);
      this._hourHand.classList.toggle('hand-low', lowTime);
      p.lowTime = lowTime;
    }
    if (expired !== p.expired) {
      this._minuteHand.classList.toggle('hand-expired', expired);
      this._hourHand.classList.toggle('hand-expired', expired);
      p.expired = expired;
    }

    return {};
  }

  /**
   * Compute hand angles from remaining milliseconds.
   * @param {number} timeMs
   * @returns {{ minute: number, hour: number }}
   */
  _computeAngles(timeMs) {
    const totalSeconds = Math.max(0, timeMs) / 1000;
    const minutesPart = (totalSeconds / 60) % 60;
    const secondsPart = totalSeconds % 60;
    const minuteAngle = (360 - (minutesPart * 6 + (secondsPart / 60) * 6)) % 360;
    const hourAngle = (360 - (((totalSeconds / 3600) % 12) * 30)) % 360;
    return { minute: minuteAngle, hour: hourAngle };
  }

  /**
   * Describe an SVG arc path.
   * @param {number} cx
   * @param {number} cy
   * @param {number} r
   * @param {number} startAngle
   * @param {number} endAngle
   * @returns {string}
   */
  _describeArc(cx, cy, r, startAngle, endAngle) {
    const start = this._polarToCartesian(cx, cy, r, endAngle);
    const end = this._polarToCartesian(cx, cy, r, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
    return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 0 ${end.x} ${end.y} Z`;
  }

  /**
   * @param {number} cx
   * @param {number} cy
   * @param {number} r
   * @param {number} angleDeg
   * @returns {{ x: number, y: number }}
   */
  _polarToCartesian(cx, cy, r, angleDeg) {
    const rad = (angleDeg - 90) * Math.PI / 180;
    return {
      x: cx + r * Math.cos(rad),
      y: cy + r * Math.sin(rad),
    };
  }

  /** @override */
  destroy() {
    if (this._container) {
      this._container.classList.remove('analog-clock', 'insa-clock');
    }
    this._svgEl = null;
    this._minuteHand = null;
    this._hourHand = null;
    this._flagPanel = null;
    this._ledCircle = null;
    this._colorCircle = null;
    this._movesText = null;
    this._byoText = null;
    this._dialBorder = null;
    this._oscillatorBar = null;
    this._container = null;
    this._prev = {};
  }
}
