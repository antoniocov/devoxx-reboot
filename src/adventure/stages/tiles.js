// Small builder for 16-row, 48px tile maps used by every stage.
import { TILES } from '../level.js';

export function buildTiles(widthTiles, build) {
  const data = Array.from({ length: 16 }, () => Array(widthTiles).fill(-1));
  const api = {
    floor(from, to, top = TILES.FLOOR) { for (let x = from; x <= to; x++) { data[13][x] = top; data[14][x] = TILES.FILL; data[15][x] = TILES.FILL; } },
    gap(from, to) { for (let x = from; x <= to; x++) for (let y = 13; y < 16; y++) data[y][x] = -1; },
    platform(col, row, length, tile = TILES.PLATFORM) { for (let i = 0; i < length; i++) data[row][col + i] = tile; },
    stairs(from, to, bottomRow, stepEvery = 3) {
      for (let x = from; x <= to; x++) {
        const row = bottomRow - Math.floor((x - from) / stepEvery);
        for (let y = row; y <= bottomRow; y++) data[y][x] = y === row ? TILES.STAIR : TILES.FILL;
      }
    },
    set(col, row, tile) { data[row][col] = tile; },
  };
  build(api);
  return data;
}
