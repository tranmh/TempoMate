import http from 'k6/http';
import { check } from 'k6';

const BASE = (__ENV.AQAA_APP_WEB_URL || 'http://localhost:3000').replace(/\/$/, '');
const VUS = Math.min(parseInt(__ENV.AQAA_LOAD_VUS || '10', 10), 10);
const DURATION = __ENV.AQAA_LOAD_DURATION || '30s';

export const options = {
  scenarios: {
    load: { executor: 'constant-vus', vus: VUS, duration: DURATION },
  },
};

// Static assets served by `serve src`; weights favour the page and its startup modules.
const ENDPOINTS = [
  ['/', 30],
  ['/js/app.js', 10],
  ['/css/styles.css', 8],
  ['/manifest.json', 6],
  ['/sw.js', 6],
  ['/css/themes.css', 4],
  ['/css/clock-display.css', 4],
  ['/js/state/GameState.js', 4],
  ['/js/engine/TimerEngine.js', 4],
  ['/js/ui/ClockDisplay.js', 4],
  ['/js/ui/SettingsPanel.js', 4],
  ['/js/presets/presets.js', 3],
  ['/js/utils/constants.js', 3],
  ['/fonts/DSEG7Classic-Bold.woff2', 3],
  ['/fonts/Orbitron-Bold.woff2', 3],
  ['/img/icon.svg', 4],
];

const TOTAL = ENDPOINTS.reduce((s, e) => s + e[1], 0);

export default function () {
  let r = Math.random() * TOTAL;
  let path = ENDPOINTS[0][0];
  for (const [p, w] of ENDPOINTS) {
    if (r < w) { path = p; break; }
    r -= w;
  }
  const name = `web GET ${path}`;
  const res = http.get(`${BASE}${path}`, { tags: { endpoint: name } });
  check(res, { 'status is 200': (x) => x.status === 200 }, { endpoint: name });
}
