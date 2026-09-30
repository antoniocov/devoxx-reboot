// Stage 1 — Arrival: the evening frontage, glass doors and registration desks. Teaches moving, jumping,
// switching, stacking on Biggy, the launch and the mass-5 plate.
import { TILES } from '../level.js';
import { buildTiles } from './tiles.js';

const widthTiles = 50;
const data = buildTiles(widthTiles, api => {
  api.floor(0, widthTiles - 1);
  api.gap(20, 28);                 // the turnstile pit: 9 tiles, only a launched Voxxy makes it
  api.platform(12, 8, 3);          // ledge with sparks: reachable by standing on Biggy
  api.platform(31, 10, 3);         // welcome desk canopy
});
const coins = [];
for (const x of [700, 780, 3 * 48 + 12 * 48 + 24, 13 * 48 + 24, 14 * 48 + 24, 1600, 1680, 1760, 2000, 2080]) coins.push({ x, y: x >= 600 && x <= 720 ? 336 : x < 1000 && x > 590 ? 336 : 560 });
coins.length = 0;
for (const c of [[700, 560], [780, 560], [612, 336], [660, 336], [708, 336], [1600, 560], [1680, 560], [1760, 560], [2000, 560], [2080, 560], [1520, 430], [1568, 430]]) coins.push({ x: c[0], y: c[1] });

export const arrival = {
  id: 'arrival', index: 1, title: 'Arrival', subtitle: 'Get the crew inside', short: 'ARRIVAL',
  clearTitle: 'We’re in.', clearCopy: 'The registration desks are behind you.<br>The exhibition hall is dark ahead.',
  widthTiles, data,
  spawn: { x: 200, y: 576 },
  checkpoints: [900, 1500],
  requires: [],
  fixtures: {
    coins,
    heavyCases: [], cases: [],
    plates: [{ id: 'arrival-plate', x: 1760, threshold: 5, target: 'arrival-door' }],
    doors: [{ id: 'arrival-door', col: 41, row: 12, height: 13 }],
    gratings: [], springs: [], terminals: [], bridges: [], lens: null,
    drones: [{ x: 700, y: 584, min: 620, max: 860, speed: 60 }, { x: 1500, y: 584, min: 1440, max: 1660, speed: 75 }],
    sentries: [], swoopers: [],
    exit: { x: 2260 },
    finale: null,
  },
  signs: [
    { x: 110, y: 470, text: 'A / D   MOVE  →', color: '#f8d3a2' },
    { x: 330, y: 430, text: 'SPACE   JUMP', color: '#f8d3a2' },
    { x: 380, y: 300, text: '1 · 2 · 3   SWITCH ROBOT', color: '#9ad7df' },
    { x: 470, y: 440, text: 'STAND ON BIGGY  ↑  TO REACH THE LEDGE', color: '#f8d3a2' },
    { x: 760, y: 300, text: '3  BIGGY  +  E   LAUNCH THE RIDER  →', color: '#f8d3a2' },
    { x: 1480, y: 330, text: 'PLATE 5 · ONLY BIGGY IS HEAVY ENOUGH', color: '#f8d3a2' },
    { x: 2130, y: 500, text: 'E   ENTER THE HALL', color: '#f8d3a2' },
  ],
  decor: 'arrival', music: 'arrival',
};
