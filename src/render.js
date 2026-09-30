import { ROBOTS, ROOMS, FLOORS, SEATS, GATE, DURATION, HZ } from './simulation.js';

const C = { floor: '#233437', wall: '#51615e', ink: '#d9e2d4', mute: '#78918d', orange: '#ffad76', blue: '#9acbdd', green: '#bad7a5' };
export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  function box(x, y, w, h, color, radius = 0, stroke) {
    ctx.beginPath(); ctx.roundRect(x, y, w, h, radius); ctx.fillStyle = color; ctx.fill();
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1; ctx.stroke(); }
  }
  function line(points, color, width = 1, dash = []) {
    ctx.beginPath(); ctx.strokeStyle = color; ctx.lineWidth = width; ctx.setLineDash(dash);
    points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke(); ctx.setLineDash([]);
  }
  function text(value, x, y, size = 10, color = C.mute, align = 'left', weight = '400') {
    ctx.font = `${weight} ${size}px ui-monospace, SFMono-Regular, monospace`; ctx.fillStyle = color; ctx.textAlign = align; ctx.fillText(value, x, y);
  }
  function circle(x, y, radius, color, stroke) {
    ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.fillStyle = color; ctx.fill();
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1.4; ctx.stroke(); }
  }
  function glow(x, y, radius, color) {
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius); gradient.addColorStop(0, color); gradient.addColorStop(1, 'transparent');
    ctx.fillStyle = gradient; ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }
  function robot(p, spec, index, selected, ghost, tick) {
    ctx.save(); ctx.translate(p.x, p.y);
    const speed = Math.hypot(p.vx, p.vy);
    const gait = reduced ? 0 : Math.sin(p.distance * (index === 0 ? .095 : .15));
    const bob = speed > 4 ? Math.abs(gait) * (index === 0 ? 1.2 : 2) : 0;
    if (ghost) ctx.globalAlpha = .62;
    if (p.docked) glow(0, 0, 45, index === 1 ? '#87c6de30' : '#ffad7630');
    ctx.fillStyle = '#070e1260'; ctx.beginPath(); ctx.ellipse(3, 6, spec.radius + 7, 10, -.1, 0, 7); ctx.fill();
    if (selected) {
      ctx.beginPath(); ctx.ellipse(0, 3, spec.radius + 9, spec.radius * .65 + 4, 0, 0, 7); ctx.strokeStyle = spec.color; ctx.lineWidth = 1.5; ctx.stroke();
      line([[-4, 21], [0, 25], [4, 21]], spec.color, 2);
    }
    ctx.translate(0, -bob);
    const step = speed > 4 ? gait * 3 : 0;
    if (index === 0) {
      box(-16, -5 + step, 12, 11, '#52656a', 3, '#82918b'); box(5, -5 - step, 12, 11, '#52656a', 3, '#82918b');
      box(-29, -30, 11, 29, '#53686f', 5, '#829393'); box(19, -30, 11, 29, '#53686f', 5, '#829393');
      box(-23, -41, 46, 42, '#647c83', 16, '#94a7a4');
      box(-19, -23, 38, 25, '#bd7d50', 10, '#e3a778');
      box(-18, -28, 36, 6, '#1a272b', 3);
      circle(-9, -35, 3, '#bec5b1', '#26383d'); circle(9, -35, 3, '#bec5b1', '#26383d');
      line([[3, -42], [3, -50]], '#a1aaa1'); circle(3, -51, 1.5, C.orange);
      text('Ⅱ', 0, -7, 12, '#e7c39c', 'center');
      line([[-13, -15], [-9, -11]], '#775a45'); line([[10, -3], [15, -8]], '#775a45');
    } else if (index === 1) {
      line([[-7, -10], [-9, 3 + step]], '#91a3a7', 5); line([[7, -10], [9, 3 - step]], '#91a3a7', 5);
      box(-14, 1 + step, 10, 5, '#455a64', 2); box(4, 1 - step, 10, 5, '#455a64', 2);
      line([[-16, -35], [-23, -12 - step]], '#718992', 5); line([[16, -35], [23, -12 + step]], '#718992', 5);
      circle(-19, -25, 3, '#bcc2b4'); circle(19, -25, 3, '#bcc2b4');
      box(-15, -40, 30, 27, '#4d6570', 6, '#8ca4aa');
      box(-5, -33, 10, 20, '#233c45', 2); line([[-1, -30], [-1, -18]], '#90c8d1', 2);
      box(-11, -60, 22, 20, '#81949a', 7, '#b2bdb5');
      box(-9, -52, 18, 9, '#394a50', 3); circle(-5, -48, 2, '#ffe6ae'); circle(5, -48, 2, '#ffe6ae');
    } else {
      box(-10, -3 + step, 7, 9, '#c98342', 3); box(4, -3 - step, 7, 9, '#c98342', 3);
      line([[-12, -26], [-21, -5 - step]], '#bcc0ae', 5); line([[12, -26], [21, -5 + step]], '#bcc0ae', 5);
      box(-13, -32, 26, 29, '#db914b', 9, '#ffc77d');
      box(-21, -51, 42, 28, '#eea251', 13, '#ffd393');
      box(-17, -46, 34, 17, '#19282b', 8);
      circle(-22, -37, 4, '#c2cec1'); circle(22, -37, 4, '#c2cec1');
      circle(-10, -51, 4, '#eea251', '#ffd393'); circle(10, -51, 4, '#eea251', '#ffd393');
      const look = Math.sign(p.vx) * 2;
      circle(-7 + look, -38, 2.5, '#ffc471'); circle(7 + look, -38, 2.5, '#ffc471');
      circle(0, -19, 3, '#f1d3a1');
    }
    if (selected || p.docked) {
      const labelY = index === 1 ? -77 : -65;
      const label = p.docked ? `${spec.name.toUpperCase()} ✓` : spec.name.toUpperCase();
      box(-32, labelY - 10, 64, 17, '#101b20e6', 3, `${spec.color}70`);
      text(label, 0, labelY + 2, 8, spec.color, 'center');
    }
    ctx.restore();
  }
  return function render(session) {
    const width = Math.round(canvas.clientWidth * Math.min(devicePixelRatio || 1, 2));
    const height = Math.round(width * 720 / 1100);
    if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
    ctx.setTransform(canvas.width / 1100, 0, 0, canvas.height / 720, 0, 0);
    const w = session.world;
    ctx.fillStyle = '#142125'; ctx.fillRect(0, 0, 1100, 720);
    const background = ctx.createRadialGradient(570, 340, 80, 550, 350, 650);
    background.addColorStop(0, '#243736'); background.addColorStop(1, '#111b21'); ctx.fillStyle = background; ctx.fillRect(0, 0, 1100, 720);
    for (let x = 0; x < 1100; x += 25) line([[x, 0], [x, 720]], '#728f8610');
    for (let y = 0; y < 720; y += 25) line([[0, y], [1100, y]], '#728f8610');
    for (const r of FLOORS.slice(0, 6)) {
      box(r.x - 9, r.y - 8, r.w + 18, r.h + 19, '#09131765', 3);
      box(r.x - 5, r.y - 5, r.w + 10, r.h + 10, '#405351', 2);
      box(r.x, r.y, r.w, r.h, C.floor);
    }
    // Open the shared corridor into the foyer and cut doorways into room walls.
    box(480, 520, 145, 85, C.floor);
    for (const r of FLOORS.slice(6)) box(r.x, r.y, r.w, r.h, C.floor);
    for (let y = 80; y < 524; y += 30) line([[490, y], [615, y]], '#79988914');
    for (let x = 285; x < 835; x += 30) line([[x, 545], [x, 635]], '#79988914');
    for (const room of ROOMS) {
      text(room.name, room.x + 15, room.y + 23, 11, '#cad0b9', 'left', '600');
      text(room.sub, room.x + 15, room.y + 37, 7, '#7f9890');
      line([[room.x + 12, room.y + room.h - 9], [room.x + room.w - 12, room.y + room.h - 9]], '#8bae853f', 2);
    }
    for (const s of SEATS) {
      for (let x = s.x; x < s.x + s.w - 10; x += 23) {
        box(x, s.y + 5, 17, 20, '#101d22', 3);
        box(x, s.y, 17, 14, '#456166', 3, '#607b78');
        line([[x + 3, s.y + 3], [x + 13, s.y + 3]], '#80948450');
      }
    }
    text('GRAND STAIRCASE', 560, 676, 8, '#a4b6a1', 'center');
    box(471, 612, 164, 38, '#40534d', 1, '#8d9a7e');
    for (let y = 616; y < 650; y += 5) line([[477, y], [629, y]], '#899b804f');
    line([[476, 612], [476, 650]], '#aab499', 2); line([[631, 612], [631, 650]], '#aab499', 2);
    text('FOYER', 324, 589, 15, '#658078'); text('↑ AUDITORIUMS', 545, 513, 8, '#acb9a2', 'center');
    text('DEVOXX', 749, 576, 18, '#9cab85', 'center', '700'); text('BELGIUM / 2026', 749, 592, 7, '#6f8a80', 'center');
    for (const y of [110, 270, 450]) {
      box(492, y, 4, 18, '#a9c898', 2); glow(498, y + 9, 38, '#b9d1a218');
      box(609, y, 4, 18, '#a9c898', 2); glow(609, y + 9, 38, '#b9d1a218');
    }
    // Supply lines also communicate the puzzle dependencies spatially.
    line([[332, 373], [440, 373], [440, 181], [GATE.x + 7, 181]], w.door ? '#dd9e73aa' : '#62757180', 2, [5, 5]);
    line([[797, 365], [867, 365], [867, 277], [636, 277], [636, 61], [310, 61], [310, 130]], w.power ? '#89c6d899' : '#61747650', 2, [5, 5]);
    const pad = ROBOTS[0].target;
    box(pad.x - 34, pad.y - 29, 68, 58, w.robots[0].docked ? '#695443' : '#3a3e36', 4, '#d7a06c');
    for (let n = -24; n <= 24; n += 12) line([[pad.x + n, pad.y - 21], [pad.x + n, pad.y + 21]], '#c38c5750', 3);
    text('01 / BRACE', pad.x, pad.y + 47, 9, '#d9a274', 'center');
    const power = ROBOTS[1].target;
    box(power.x - 29, power.y - 32, 58, 46, '#162c36', 5, '#82b2c2');
    box(power.x - 22, power.y - 25, 44, 17, w.power ? '#91cbd2' : '#385763', 2);
    for (let x = -15; x <= 15; x += 10) circle(power.x + x, power.y + 2, 2, w.power ? C.blue : '#60767b');
    text('02 / CONNECT', power.x, power.y + 45, 9, '#99c6d5', 'center');
    const target = ROBOTS[2].target;
    box(277, 117, 65, 29, '#596768', 5, '#a9b8a4');
    box(286, 123, 22, 14, w.won ? '#ffe5b0' : '#283f43', 3);
    circle(327, 130, 6, w.power ? '#ffb478' : '#263c42', '#8f9c87');
    text('03 / BOOT', target.x, target.y + 45, 9, '#edb687', 'center');
    const screenColor = w.won ? '#f1ddbc' : w.charge > 0 ? '#a6b7a1' : '#6b827a';
    box(368, 91, 80, 6, screenColor, 2); glow(405, 100, 88, w.won ? '#f0c99670' : '#cfcea914');
    if (w.charge > 0) {
      ctx.beginPath(); ctx.moveTo(329, 125); ctx.lineTo(368, 98); ctx.lineTo(448, 98); ctx.closePath(); ctx.fillStyle = `rgba(255,223,154,${w.charge * .18})`; ctx.fill();
      box(367, 104, 82 * w.charge, 3, '#f7cb8e', 1);
    }
    if (w.won) text('HELLO, DEVOXX.', 408, 119, 7, '#ffe6b5', 'center');
    if (!w.door) {
      box(GATE.x, GATE.y, GATE.w, GATE.h, '#9b6851', 2, '#e1a278');
      for (let y = GATE.y + 9; y < GATE.y + GATE.h; y += 12) line([[GATE.x + 2, y], [GATE.x + 12, y - 5]], '#edaf7655', 3);
      text('LOCKED', GATE.x + 7, GATE.y - 9, 7, '#e0a17d', 'center');
    } else {
      box(GATE.x, GATE.y - 4, GATE.w, 7, '#acd19a', 1); box(GATE.x, GATE.y + GATE.h - 3, GATE.w, 7, '#acd19a', 1);
      text('OPEN', GATE.x + 7, GATE.y - 9, 7, '#b6d0a6', 'center');
    }
    text('01', 131, 335, 28, '#6b7161'); text('HOLD THE DOOR', 132, 355, 8, '#8c9b87');
    line([[134, 367], [185, 367], [209, 385]], '#778e764f', 1);
    text('02', 978, 338, 28, '#5b7e87'); text('RESTORE', 979, 357, 8, '#839c9e'); text('THE POWER', 979, 370, 8, '#839c9e');
    text('KINÉPOLIS', 137, 138, 11, '#8ea48f'); text('ANTWERP', 137, 154, 7, '#6a8277');
    text('↑', 554, 320, 25, '#617e71', 'center'); text('CINEMA LEVEL', 554, 345, 7, '#718f81', 'center');
    for (let i = 0; i < 3; i++) {
      const trail = w.robots[i].trail;
      if (trail.length > 1) line(trail.map(p => [p.x, p.y]), `${ROBOTS[i].color}55`, 2, [3, 6]);
      if (i === session.selected && session.mode !== 'play' && session.mode !== 'finished') {
        const t = ROBOTS[i].target;
        const pulse = reduced ? 0 : Math.sin(w.tick / HZ * 4) * 2;
        circle(t.x, t.y, 46 + pulse, 'transparent', `${ROBOTS[i].color}40`);
        if (!w.robots[i].docked) { box(t.x + 26, t.y - 44, 18, 18, '#152227', 3, ROBOTS[i].color); text('E', t.x + 35, t.y - 31, 10, ROBOTS[i].color, 'center'); }
      }
    }
    const sorted = w.robots.map((p, i) => ({ p, i })).sort((a, b) => a.p.y - b.p.y);
    for (const { p, i } of sorted) robot(p, ROBOTS[i], i, session.selected === i && session.mode !== 'play', session.mode === 'record' && session.selected !== i, w.tick);
    if (session.mode === 'record') {
      const seconds = Math.max(0, DURATION - w.tick / HZ);
      text(seconds.toFixed(1), 1023, 595, 31, seconds < 4 ? '#ff986c' : '#b3c7b5', 'center'); text('SECONDS LEFT', 1023, 612, 7, '#7c9788', 'center');
    }
    const vignette = ctx.createRadialGradient(550, 340, 240, 550, 340, 690); vignette.addColorStop(0, '#020b1000'); vignette.addColorStop(1, '#020b105c'); ctx.fillStyle = vignette; ctx.fillRect(0, 0, 1100, 720);
  };
}
