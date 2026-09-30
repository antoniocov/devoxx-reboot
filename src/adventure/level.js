export const TILE = 48;
export const HEIGHT = 768;
export const FLOOR = 624;
export const GRAVITY = 1500;
export const TILES = { FILL: 0, FLOOR: 1, STAIR: 2, PLATFORM: 3, BRIDGE: 4, AUDITORIUM: 5, GRATING: 6, DOOR: 7 };
export const ROBOTS = [
  { id: 'voxxy', name: 'Voxxy', title: 'The spark', ability: 'Double jump · dash', color: '#ffb166', mass: 1, speed: 320, acceleration: 2400, drag: 2200, jump: 590, width: 32, height: 60 },
  { id: 'droid', name: 'Droid', title: 'The connection', ability: 'Hack terminals · lie down as a bridge', color: '#8bdce6', mass: 2, speed: 270, acceleration: 1700, drag: 1800, jump: 550, width: 32, height: 82 },
  { id: 'biggy', name: 'Biggy', title: 'The heavyweight', ability: 'Charge · carry · launch', color: '#e2b387', mass: 5, speed: 230, acceleration: 950, drag: 1100, jump: 475, width: 52, height: 66 },
];

export function newProgress() {
  return { cores: { power: false, relay: false, lens: false }, coins: 0, health: 3, lives: LIVES, deaths: 0, elapsed: 0, won: false };
}
export const LIVES = 3;
// A respawn costs one life; the run is over when none are left. Deaths keep counting for the score.
export function loseLife(progress) {
  progress.deaths++; progress.lives = Math.max(0, progress.lives - 1);
  return { gameOver: progress.lives === 0, lives: progress.lives };
}
export function canFinish(progress) { return Object.values(progress.cores).every(Boolean); }
export function grantCore(progress, kind, robot) {
  const required = { power: 'biggy', relay: 'droid', lens: 'voxxy' };
  if (progress.cores[kind] || required[kind] !== robot) return false;
  progress.cores[kind] = true;
  return true;
}
export function resultScore(progress) {
  return Math.max(0, Math.round(3000 + progress.coins * 100 - progress.elapsed * 4 - progress.deaths * 150));
}

// Returns a list of problems; an empty list means the stage data is playable.
export function validateStage(stage) {
  const errors = [];
  const width = stage.widthTiles * TILE;
  const { data, fixtures } = stage;
  if (data.length !== HEIGHT / TILE) errors.push(`${stage.id}: expected ${HEIGHT / TILE} rows, got ${data.length}`);
  data.forEach((row, i) => { if (row.length !== stage.widthTiles) errors.push(`${stage.id}: row ${i} has ${row.length} columns, expected ${stage.widthTiles}`); });
  const standing = (x, label) => {
    for (const dx of [-26, 0, 26]) {
      const col = Math.floor((x + dx) / TILE);
      if (col < 0 || col >= stage.widthTiles) { errors.push(`${label} at ${x} is outside the stage`); return; }
      if (!(data[13]?.[col] >= 0)) errors.push(`${label} at ${x} has no ground`);
      if (data[12]?.[col] >= 0 || data[11]?.[col] >= 0) errors.push(`${label} at ${x} is blocked or lacks headroom`);
    }
  };
  standing(stage.spawn.x, 'spawn');
  if (!stage.checkpoints?.length) errors.push(`${stage.id}: no checkpoints`);
  for (const x of stage.checkpoints ?? []) standing(x, 'checkpoint');
  const inside = (x, label) => { if (!(x >= 0 && x <= width)) errors.push(`${label} at ${x} is outside the stage`); };
  const doorIds = new Set((fixtures.doors ?? []).map(door => door.id));
  for (const plate of fixtures.plates ?? []) {
    inside(plate.x, `plate ${plate.id}`);
    if (plate.target !== 'finale' && !doorIds.has(plate.target)) errors.push(`plate ${plate.id} targets unknown door ${plate.target}`);
  }
  for (const key of ['coins', 'heavyCases', 'cases', 'springs', 'terminals', 'drones', 'sentries', 'swoopers']) for (const item of fixtures[key] ?? []) inside(item.x, key);
  if (fixtures.lens) inside(fixtures.lens.x, 'lens');
  if (!fixtures.exit) errors.push(`${stage.id}: no exit`); else inside(fixtures.exit.x, 'exit');
  // Every walkable surface needs two free rows above it: Droid is 82 px tall and cannot duck.
  for (let x = 0; x < stage.widthTiles; x++) for (let y = 1; y < data.length - 1; y++) {
    if (data[y][x] === -1 && data[y + 1][x] >= 0 && data[y - 1][x] >= 0) errors.push(`${stage.id}: column ${x} row ${y} has only one tile of headroom`);
  }
  return errors;
}
