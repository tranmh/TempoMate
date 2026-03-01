/**
 * MoveCounter - Tracks move counts per player
 *
 * In chess: White and Black alternate moves. Move numbers are tracked
 * per the convention where one "move" = one player's action.
 * The clock counts button presses as moves.
 */

export class MoveCounter {
  constructor() {
    /** @type {number} */
    this.leftMoves = 0;
    /** @type {number} */
    this.rightMoves = 0;
  }

  /**
   * Record a move for a player.
   * @param {string} side - 'left' or 'right'
   */
  recordMove(side) {
    if (side === 'left') {
      this.leftMoves++;
    } else {
      this.rightMoves++;
    }
  }

  /**
   * Get move count for a player.
   * @param {string} side
   * @returns {number}
   */
  getMoves(side) {
    return side === 'left' ? this.leftMoves : this.rightMoves;
  }

  /**
   * Set move count for a player (used in correction mode).
   * @param {string} side
   * @param {number} count
   */
  setMoves(side, count) {
    if (side === 'left') {
      this.leftMoves = Math.max(0, count);
    } else {
      this.rightMoves = Math.max(0, count);
    }
  }

  /**
   * Reset all move counts.
   */
  reset() {
    this.leftMoves = 0;
    this.rightMoves = 0;
  }

  /**
   * Get the chess move number (1-based, increments every 2 half-moves).
   * @param {string} whiteColor - Which side plays white ('left' or 'right')
   * @returns {number} Chess move number
   */
  getChessMoveNumber(whiteColor) {
    const whiteMoves = whiteColor === 'left' ? this.leftMoves : this.rightMoves;
    // Chess move number = white's move count (white moves first)
    return whiteMoves;
  }
}
