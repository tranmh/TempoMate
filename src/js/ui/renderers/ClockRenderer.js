/**
 * ClockRenderer - Base class / interface for clock face renderers.
 *
 * Each renderer implements a specific visual style for one side of the
 * clock display (digital LCD, Garde analog, Insa analog, etc.).
 */

export class ClockRenderer {
  /**
   * Build the DOM/SVG for this clock face inside the container.
   * @param {HTMLElement} container - The .clock-face element
   * @param {string} side - 'left' or 'right'
   */
  build(container, side) {
    // Override in subclasses
  }

  /**
   * Update the rendered display with new state.
   * @param {object} state - Per-side state snapshot
   * @param {number} state.timeMs - Remaining time in ms
   * @param {boolean} state.isActive - Whether this side's clock is running
   * @param {boolean} state.isPaused - Whether this side is paused
   * @param {boolean} state.isFrozen - Whether this side is frozen
   * @param {string} state.color - 'white' or 'black'
   * @param {string} state.flagState - FlagState value
   * @param {number} state.moves - Move count
   * @param {boolean} state.showMoves - Whether to display moves
   * @param {number} [state.byoMoments] - Byo-yomi moments remaining
   * @param {string} [state.method] - TimingMethodType
   * @param {string} state.gameStatus - GameStatus value
   */
  update(state) {
    // Override in subclasses
  }

  /**
   * Called when the container is resized.
   * @param {number} width - Container width in px
   * @param {number} height - Container height in px
   */
  onResize(width, height) {
    // Override in subclasses
  }

  /**
   * Clean up resources (event listeners, animations, etc.).
   */
  destroy() {
    // Override in subclasses
  }
}
