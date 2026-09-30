// Stage 2 — The exhibition hall: columns, booths, orange ceiling strips. Biggy recovers the power cell,
// a case is pushed onto a plate, and Voxxy on Droid weighs enough to open the far shutter.
import { TILES } from '../level.js';
import { buildTiles } from './tiles.js';

const widthTiles = 72;
const data = buildTiles(widthTiles, api => {
  api.floor(0, widthTiles - 1);
  api.gap(38, 39);                                  // a service trench: two tiles, everyone can jump it
  api.platform(13, 10, 4); api.platform(19, 8, 3);  // booth roofs to explore
  api.platform(30, 10, 3);
  api.platform(42, 12, 2, TILES.PLATFORM); api.set(42, 13, TILES.FILL); api.set(43, 13, TILES.FILL); // a one-tile step Biggy can climb
  api.platform(44, 10, 4);                          // the ledge with the mass-3 plate: Droid and Voxxy only
  api.platform(52, 10, 3); api.platform(58, 8, 3);
});
const coins = [];
for (let x = 350; x < 3300; x += 240) {
  const col = Math.floor(x / 48);
  if (col === 38 || col === 39) continue;
  let row = 13;
  for (let y = 3; y < 13; y++) if (data[y][col] >= 0) { row = y; break; }
  coins.push({ x, y: row * 48 - 48 });
}
for (const [x, y] of [[960, 336], [1008, 336], [2160, 430], [2208, 430], [2820, 336]]) coins.push({ x, y });

export const hall = {
  id: 'hall', index: 2, title: 'The exhibition hall', subtitle: 'Find the missing power cell', short: 'EXHIBITION HALL',
  clearTitle: 'Powered up.', clearCopy: 'The power cell is safe in Biggy’s belly.<br>Now for the grand staircase.',
  widthTiles, data,
  spawn: { x: 200, y: 576 },
  checkpoints: [1150, 2500],
  requires: ['power'],
  fixtures: {
    coins,
    heavyCases: [{ x: 1480, y: 584, core: true }, { x: 1670, y: 584 }],
    cases: [{ x: 700, y: 600 }],
    plates: [
      { id: 'booth-plate', x: 1150, threshold: 3, target: 'booth-door' },
      { id: 'ledge-plate', x: 2208, y: 480, threshold: 3, target: 'hall-exit-door' },
    ],
    doors: [{ id: 'booth-door', col: 27, row: 12, height: 13 }, { id: 'hall-exit-door', col: 68, row: 12, height: 13 }],
    gratings: [], springs: [], terminals: [], bridges: [], lens: null,
    drones: [
      { x: 1900, y: 584, min: 1850, max: 2050, speed: 80 },
      { x: 2700, y: 584, min: 2620, max: 2900, speed: 95 },
      { x: 3050, y: 584, min: 2980, max: 3200, speed: 100 },
    ],
    sentries: [{ x: 2440, y: 566, facing: -1, interval: 1700 }, { x: 3150, y: 470, facing: -1, interval: 1500 }],
    swoopers: [],
    exit: { x: 3380 },
    finale: null,
  },
  signs: [
    { x: 520, y: 470, text: 'PUSH THE CASE  →  ONTO PLATE 3', color: '#f8d3a2' },
    { x: 560, y: 300, text: 'VOXXY CAN’T MOVE IT · DROID AND BIGGY CAN', color: '#9ad7df' },
    { x: 1400, y: 470, text: '3  BIGGY  +  E   CHARGE THE MARKED CASE', color: '#f8d3a2' },
    { x: 2020, y: 380, text: 'PLATE 3 UP THERE · BIGGY CAN’T CLIMB IT', color: '#f8d3a2' },
    { x: 2100, y: 330, text: 'VOXXY ON DROID = 3', color: '#9ad7df' },
    { x: 3250, y: 500, text: 'E   TO THE STAIRCASE', color: '#f8d3a2' },
  ],
  decor: 'hall', music: 'hall',
};
