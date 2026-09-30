// Stage 4 — The keynote auditorium: seating tiers as steps, spring seats for Voxxy, the lens high above, and a
// finale that needs all three robots at once.
import { TILES } from '../level.js';
import { buildTiles } from './tiles.js';

const widthTiles = 64;
const data = buildTiles(widthTiles, api => {
  api.floor(0, widthTiles - 1, TILES.AUDITORIUM);
  const tier = (from, to, top) => { for (let x = from; x <= to; x++) for (let y = top; y <= 13; y++) api.set(x, y, y === top ? TILES.AUDITORIUM : TILES.FILL); };
  tier(18, 25, 12); tier(26, 33, 11); tier(34, 43, 10);   // three seating tiers, one-tile steps Biggy can climb
  api.platform(40, 5, 5, TILES.AUDITORIUM);              // the projector balcony with the lens, right of the top springs
  api.platform(10, 10, 3, TILES.AUDITORIUM);
  api.gap(46, 47);                                       // the orchestra pit: two tiles
});
const coins = [];
for (const [x, y] of [[400, 560], [500, 560], [528, 432], [576, 432], [1000, 512], [1300, 464], [1700, 416], [1900, 416], [1968, 192], [2016, 192], [2064, 192], [2500, 560], [2600, 560]]) coins.push({ x, y });

export const auditorium = {
  id: 'auditorium', index: 4, title: 'The opening keynote', subtitle: 'Bring the big screen back to life', short: 'KEYNOTE',
  widthTiles, data,
  spawn: { x: 200, y: 576 },
  checkpoints: [700, 2350],
  requires: ['lens'],
  fixtures: {
    coins,
    heavyCases: [{ x: 2250, y: 584 }], cases: [],
    plates: [{ id: 'stage-plate', x: 2700, threshold: 5, target: 'finale', momentary: true }],
    doors: [],
    gratings: [],
    springs: [{ x: 1080, y: 562, length: 2 }, { x: 1440, y: 514, length: 2 }, { x: 1800, y: 466, length: 2 }],
    terminals: [{ id: 'finale-terminal', x: 2800, y: 574, core: false, target: null, message: 'Projector terminal connected. Hold the plate and restart the show!' }],
    bridges: [], lens: { x: 2064, y: 190 },
    drones: [
      { x: 700, y: 584, min: 600, max: 820, speed: 90 },
      { x: 2480, y: 584, min: 2400, max: 2600, speed: 110 },
      { x: 1500, y: 488, min: 1300, max: 1580, speed: 100 },
    ],
    sentries: [{ x: 1000, y: 560, facing: 1, interval: 1600 }, { x: 2200, y: 430, facing: -1, interval: 1400 }],
    swoopers: [{ x: 1250, y: 260, range: 300 }, { x: 2300, y: 300, range: 220 }],
    exit: { x: 2980 },
    finale: { plateId: 'stage-plate', terminalId: 'finale-terminal' },
  },
  signs: [
    { x: 120, y: 470, text: 'ZAAL 8 · THE KEYNOTE ROOM  →', color: '#f8d3a2' },
    { x: 1000, y: 380, text: 'SEAT SPRINGS · LIGHT ROBOTS BOUNCE HIGH', color: '#f8d3a2' },
    { x: 1560, y: 300, text: 'VOXXY: BOUNCE, THEN JUMP AGAIN  ↑', color: '#f8d3a2' },
    { x: 2560, y: 330, text: 'FINALE · BIGGY HOLDS PLATE 5', color: '#f8d3a2' },
    { x: 2560, y: 290, text: 'DROID + E CONNECTS · VOXXY + E RESTARTS', color: '#9ad7df' },
  ],
  objective: progress => !progress.cores.lens ? 'Bounce Voxxy up the seat tiers to the projector balcony and grab the lens.' : 'Finale: park Biggy on plate 5, connect Droid to the terminal, then restart the projector as Voxxy.',
  decor: 'auditorium', music: 'auditorium',
};
