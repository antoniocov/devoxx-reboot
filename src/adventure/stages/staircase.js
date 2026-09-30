// Stage 3 — The grand staircase and the corridor of auditoriums. Droid bridges a broken landing, Biggy is too
// heavy for it, a weak grating on the mezzanine drops him back down, and the power link terminal is connected.
import { TILES } from '../level.js';
import { buildTiles } from './tiles.js';

const widthTiles = 76;
const data = buildTiles(widthTiles, api => {
  api.floor(0, widthTiles - 1);
  api.stairs(6, 18, 12);                                            // up to the landing
  for (let x = 19; x <= 22; x++) for (let y = 8; y <= 13; y++) api.set(x, y, y === 8 ? TILES.STAIR : TILES.FILL);
  for (let x = 23; x <= 31; x++) for (let y = 13; y <= 15; y++) api.set(x, y, -1); // the broken landing: a pit
  for (let x = 32; x <= 35; x++) for (let y = 8; y <= 13; y++) api.set(x, y, y === 8 ? TILES.STAIR : TILES.FILL);
  for (let i = 0; i < 4; i++) for (let y = 9 + i; y <= 13; y++) api.set(36 + i, y, y === 9 + i ? TILES.STAIR : TILES.FILL); // down again
  api.platform(44, 9, 13);                                          // corridor mezzanine
  api.platform(60, 8, 3);                                           // launch ledge with sparks
  for (let x = 66; x <= 69; x++) for (let y = 13; y <= 15; y++) api.set(x, y, -1); // pit under the powered bridge
});
const coins = [];
for (const [x, y] of [[300, 560], [520, 512], [660, 464], [800, 416], [1000, 336], [1660, 336], [1700, 336], [1740, 336], [2200, 384], [2400, 384], [2600, 384], [2920, 336], [2968, 336], [3016, 336], [3300, 560], [3400, 560]]) coins.push({ x, y });

export const staircase = {
  id: 'staircase', index: 3, title: 'The grand staircase', subtitle: 'Reconnect the cinema level', short: 'STAIRCASE · CORRIDOR',
  clearTitle: 'Linked up.', clearCopy: 'The corridor of fourteen doors is behind you.<br>Only the keynote room remains.',
  widthTiles, data,
  spawn: { x: 200, y: 576 },
  checkpoints: [2000, 2650, 3450],
  requires: ['relay'],
  fixtures: {
    coins,
    heavyCases: [], cases: [],
    plates: [], doors: [],
    gratings: [{ col: 50, row: 9, length: 3 }],
    springs: [],
    terminals: [{ id: 'relay', x: 2980, y: 574, core: true, target: 'stair-bridge' }],
    bridges: [{ id: 'stair-bridge', start: 66, end: 69, row: 13 }],
    lens: null,
    drones: [
      { x: 2350, y: 584, min: 2300, max: 2560, speed: 85 },
      { x: 1250, y: 584, min: 1150, max: 1400, speed: 60 },
      { x: 3250, y: 584, min: 3180, max: 3400, speed: 100 },
    ],
    sentries: [{ x: 2780, y: 396, facing: -1, interval: 1900 }],
    swoopers: [{ x: 2200, y: 300, range: 320 }, { x: 3050, y: 320, range: 300 }],
    exit: { x: 3560 },
    finale: null,
  },
  signs: [
    { x: 150, y: 470, text: 'UP THE GRAND STAIRCASE  ↗', color: '#f8d3a2' },
    { x: 780, y: 300, text: '2  DROID  +  E   LIE DOWN AS A BRIDGE', color: '#9ad7df' },
    { x: 1000, y: 250, text: 'TOO HEAVY? BIGGY BUCKLES THE BRIDGE', color: '#f8d3a2' },
    { x: 2230, y: 350, text: 'MAX 4 · THE GRATING WON’T HOLD BIGGY', color: '#f8d3a2' },
    { x: 2790, y: 470, text: '2  DROID  +  E   CONNECT THE POWER LINK', color: '#9ad7df' },
    { x: 2820, y: 300, text: 'STAND ON BIGGY · E · LAUNCH  ↗', color: '#f8d3a2' },
    { x: 3430, y: 500, text: 'E   TO THE KEYNOTE', color: '#f8d3a2' },
  ],
  decor: 'staircase', music: 'staircase',
};
