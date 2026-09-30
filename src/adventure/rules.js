// Pure gameplay rules. No Phaser, no DOM: everything here is unit tested in Node.
export const MASS = { voxxy: 1, droid: 2, biggy: 5, case: 3 };

// Sum of the masses of every body whose "standingOn" chain reaches the base.
export function stackMass(base, bodies) {
  const byId = new Map(bodies.map(body => [body.id, body]));
  let total = 0;
  for (const body of bodies) {
    let current = body, depth = 0;
    while (current && current.standingOn && depth++ < 8) {
      if (current.standingOn === base.id) { total += body.mass ?? MASS[body.id] ?? 0; break; }
      current = byId.get(current.standingOn);
    }
  }
  return total;
}
export const plateHeld = (mass, threshold) => mass >= threshold;
export const gratingBreaks = mass => mass >= 5;
// 850 lifts Voxxy about 240 px (five tiles), Droid 60 px and Biggy barely 10 px.
export const springImpulse = (mass, base = 850) => -(base / mass);
export function pushSpeed(mass, charging) {
  if (charging) return 510;
  if (mass >= 5) return 150;
  if (mass >= 2) return 60;
  return 0;
}
export const bridgeBuckles = mass => mass >= 5;
export function launchImpulse(riderId, facing) {
  if (riderId === 'voxxy') return { vx: facing * 560, vy: -640 };
  if (riderId === 'droid') return { vx: facing * 280, vy: -640 };
  return null;
}
export function shouldRecall({ follower, leader, levelHeight, now }) {
  if (follower.state === 'parked') return false;
  return Math.abs(leader.x - follower.x) > 1900 || follower.y > levelHeight + 40 || now - follower.stuckSince > 3000;
}
export function followDecision({ follower, leader, blockedAhead, freeAbove, onFloor, leaderGrounded = true }) {
  const dx = leader.x - follower.x;
  const direction = Math.abs(dx) <= 70 ? 0 : Math.sign(dx);
  // Climb toward a leader standing above, but never jump straight into one overhead or still in the air.
  const climb = leaderGrounded && leader.y < follower.y - 48 && Math.abs(dx) < 96 && Math.abs(dx) > 30;
  const jump = onFloor && ((direction !== 0 && blockedAhead && freeAbove) || climb);
  return { direction, jump };
}
// A sentry bolt shoves a light robot hard and barely moves Biggy: vx = 420 / mass, vy lifts a little.
export function boltKnockback(mass, direction) {
  return { vx: direction * 420 / mass, vy: -(75 + 225 / mass) };
}
