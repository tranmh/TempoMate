/**
 * TimeFormatter - Converts milliseconds to display strings
 */

/**
 * Format milliseconds to a display string.
 * Display format rules:
 * - >= 1 hour:   H:MM:SS
 * - >= 20 min:   MM:SS
 * - >= 1 min:    M:SS
 * - < 1 min:     M:SS.d (with tenths)
 * - Negative:    0:00
 *
 * @param {number} ms - Time in milliseconds
 * @param {boolean} [showTenths=true] - Whether to show tenths when under 1 minute
 * @returns {string} Formatted time string
 */
export function formatTime(ms, showTenths = true) {
  if (ms < 0) ms = 0;

  const totalSeconds = Math.floor(ms / 1000);
  const tenths = Math.floor((ms % 1000) / 100);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad2 = (n) => String(n).padStart(2, '0');

  if (hours > 0) {
    return `${hours}:${pad2(minutes)}:${pad2(seconds)}`;
  }

  if (totalSeconds < 60 && showTenths) {
    return `${minutes}:${pad2(seconds)}.${tenths}`;
  }

  return `${minutes}:${pad2(seconds)}`;
}

/**
 * Format milliseconds for correction mode (always show all digits).
 * Format: H:MM:SS
 *
 * @param {number} ms - Time in milliseconds
 * @returns {string} Formatted time string with all digits
 */
export function formatTimeFull(ms) {
  if (ms < 0) ms = 0;

  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad2 = (n) => String(n).padStart(2, '0');

  return `${hours}:${pad2(minutes)}:${pad2(seconds)}`;
}

/**
 * Parse a time string (H:MM:SS or M:SS) back to milliseconds.
 *
 * @param {string} timeStr - Time string
 * @returns {number} Time in milliseconds
 */
export function parseTime(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return 0;
  const parts = timeStr.split(':').map(Number);
  if (parts.some(isNaN)) return 0;
  if (parts.length === 3) {
    return (parts[0] * 3600 + parts[1] * 60 + parts[2]) * 1000;
  }
  if (parts.length === 2) {
    return (parts[0] * 60 + parts[1]) * 1000;
  }
  return 0;
}

/**
 * Format milliseconds to a short description string (for preset display).
 * Examples: "5 min", "1h 30m", "2h", "30 sec"
 *
 * @param {number} ms - Time in milliseconds
 * @returns {string} Human-readable short time
 */
export function formatTimeShort(ms) {
  if (!ms || ms < 0 || isNaN(ms)) return '0s';
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const parts = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (seconds > 0 && hours === 0) parts.push(`${seconds}s`);
  if (parts.length === 0) return '0s';

  return parts.join(' ');
}
