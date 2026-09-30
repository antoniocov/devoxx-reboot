// Original procedural sprite sheets and reusable cinema tiles.
import { TILE, ROBOTS } from './level.js';

function surface(width, height) {
  const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
  return { canvas, c: canvas.getContext('2d') };
}
function rounded(c, x, y, w, h, r, fill, stroke) {
  c.beginPath(); c.roundRect(x, y, w, h, r); c.fillStyle = fill; c.fill();
  if (stroke) { c.lineWidth = 1.4; c.strokeStyle = stroke; c.stroke(); }
}
function ellipse(c, x, y, rx, ry, fill, stroke) {
  c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); c.fillStyle = fill; c.fill();
  if (stroke) { c.strokeStyle = stroke; c.lineWidth = 1.3; c.stroke(); }
}
function gradient(c, x, y, w, h, colors) {
  const g = c.createLinearGradient(x, y, x + w, y + h);
  colors.forEach((color, i) => g.addColorStop(i / (colors.length - 1), color)); return g;
}
function limb(c, points, width, color) {
  c.beginPath(); c.moveTo(...points[0]); points.slice(1).forEach(p => c.lineTo(...p));
  c.strokeStyle = '#14252b'; c.lineWidth = width + 3; c.lineCap = 'round'; c.stroke();
  c.strokeStyle = color; c.lineWidth = width; c.stroke();
}
function drawRobot(c, id, frame) {
  const running = frame < 8;
  const phase = running ? frame / 8 * Math.PI * 2 : 0;
  const step = Math.sin(phase);
  const air = frame === 9;
  const action = frame === 11;
  c.save(); c.translate(64, 109 - (running ? Math.abs(step) * 2 : 0));
  const metal = gradient(c, -30, -80, 70, 100, ['#bdcecc', '#718890', '#263e49']);
  const orange = gradient(c, -22, -70, 52, 80, ['#ffe0a5', '#f5a44d', '#b8552f']);
  const armor = gradient(c, -28, -50, 58, 65, ['#a4bbc5', '#647e8b', '#243e4c']);
  if (id === 'voxxy') {
    const front = air ? 8 : step * 9;
    limb(c, [[-9, -24], [-12 - front * .3, -12], [-10 - front, -1]], 5, '#53616a');
    limb(c, [[9, -24], [12 + front * .3, -12], [10 + front, -1]], 5, '#e7ba79');
    rounded(c, -17 - front, -5, 14, 7, 3, '#c97537', '#f7ba6c');
    rounded(c, 4 + front, -5, 15, 7, 3, orange, '#ffd596');
    limb(c, [[-18, -48], [-26, -31 + step * 7], [-26, -18 + step * 8]], 6, '#829490');
    rounded(c, -18, -50, 36, 34, 11, orange, '#ffc776');
    ellipse(c, -26, -19 + step * 8, 6, 9, '#df8742', '#fac389');
    limb(c, [[18, -47], [25, action ? -42 : -28 - step * 6], [action ? 40 : 26, action ? -43 : -15 - step * 6]], 6, '#c9d9d1');
    ellipse(c, action ? 41 : 27, action ? -43 : -16 - step * 6, 6, 8, orange, '#ffdba0');
    rounded(c, -28, -83, 56, 40, 19, orange, '#ffdea2');
    ellipse(c, -28, -61, 5, 11, metal); ellipse(c, 28, -61, 5, 11, metal);
    ellipse(c, -15, -81, 6, 6, orange, '#fff0c1'); ellipse(c, 15, -81, 6, 6, orange, '#fff0c1');
    rounded(c, -22, -75, 45, 24, 11, gradient(c, -22, -75, 45, 25, ['#223844', '#071821']), '#855b37');
    c.shadowColor = '#ffd483'; c.shadowBlur = 8;
    ellipse(c, -7, -62, 4, frame === 10 ? 1.5 : 3.5, '#ffcf75'); ellipse(c, 11, -62, 4, frame === 10 ? 1.5 : 3.5, '#ffcf75'); c.shadowBlur = 0;
    ellipse(c, 0, -36, 6, 5, '#f8e2b3'); ellipse(c, -2, -37, 1, 1, '#ae6940'); ellipse(c, 3, -37, 1, 1, '#ae6940');
  } else if (id === 'droid') {
    const stride = air ? 7 : step * 10;
    limb(c, [[-10, -39], [-12 - stride * .3, -22], [-12 - stride, -2]], 7, '#71848b');
    limb(c, [[10, -39], [13 + stride * .3, -22], [12 + stride, -2]], 7, '#a0b3b5');
    rounded(c, -20 - stride, -6, 17, 7, 3, metal); rounded(c, 5 + stride, -6, 18, 7, 3, metal);
    limb(c, [[-18, -75], [-29, -52 + step * 7], [-28, -32 + step * 7]], 7, '#789097');
    limb(c, [[18, -75], [action ? 33 : 28, action ? -65 : -51 - step * 7], [action ? 47 : 28, action ? -67 : -30 - step * 7]], 7, '#a1b4b5');
    rounded(c, -19, -79, 38, 40, 8, metal, '#a9bdba');
    rounded(c, -8, -70, 16, 30, 3, '#2b4654', '#5b7c88');
    rounded(c, -4, -65, 8, 17, 2, '#74bec8');
    rounded(c, -6, -87, 12, 9, 3, '#405561');
    rounded(c, -16, -109, 32, 26, 10, metal, '#b7c8c1');
    rounded(c, -12, -99, 25, 12, 5, '#243944');
    c.shadowBlur = 8; c.shadowColor = '#ffdda0'; ellipse(c, -5, -93, 2.5, 2.5, '#ffe2ac'); ellipse(c, 7, -93, 2.5, 2.5, '#ffe2ac'); c.shadowBlur = 0;
    for (const x of [-12, 12]) ellipse(c, x, -21, 4, 4, '#b5c4bd', '#3e505a');
    ellipse(c, action ? 48 : 28, action ? -67 : -31 - step * 7, 5, 6, metal);
  } else {
    const stride = air ? 5 : step * 6;
    limb(c, [[-15, -20], [-17, -9], [-19 - stride, 0]], 9, '#657781');
    limb(c, [[15, -20], [17, -9], [19 + stride, 0]], 9, '#85999d');
    rounded(c, -30 - stride, -7, 19, 9, 4, metal); rounded(c, 11 + stride, -7, 20, 9, 4, metal);
    rounded(c, -41, -55, 14, 39, 7, armor, '#a1b6bd'); rounded(c, 28, -55, 14, 39, 7, armor, '#a1b6bd');
    rounded(c, -32, -74, 64, 60, 28, armor, '#b3c7cd');
    rounded(c, -28, -51, 56, 41, 22, gradient(c, -25, -50, 60, 50, ['#edb477', '#bd754f', '#684e48']), '#d5a87c');
    rounded(c, -25, -55, 50, 6, 3, '#152935');
    ellipse(c, -13, -64, 4, 4, '#b7c5bd', '#334f5a'); ellipse(c, 13, -64, 4, 4, '#b7c5bd', '#334f5a');
    limb(c, [[2, -76], [3, -90]], 1.5, '#b5c6bc'); ellipse(c, 3, -90, 2, 2, '#ffe1a0');
    c.font = 'bold 16px monospace'; c.fillStyle = '#edcf9f'; c.textAlign = 'center'; c.fillText('Ⅱ', 0, -26);
    for (const [x, y] of [[-22,-34],[16,-43],[15,-23],[-9,-17]]) { c.fillStyle = '#74574b'; c.fillRect(x, y, 3, 2); }
  }
  c.restore();
}

export function makeArt(scene) {
  for (const robot of ROBOTS) {
    if (scene.textures.exists(robot.id)) continue;
    const { canvas, c } = surface(128 * 13, 128);
    for (let frame = 0; frame < 12; frame++) { c.save(); c.translate(frame * 128, 0); drawRobot(c, robot.id, frame); c.restore(); }
    // Frame 12: Droid lying flat as a bridge, head forward. Other robots reuse their idle pose.
    c.save(); c.translate(12 * 128 + 64, 64);
    if (robot.id === 'droid') { c.rotate(Math.PI / 2); c.translate(0, 8); }
    c.translate(-64, -64); drawRobot(c, robot.id, 8); c.restore();
    scene.textures.addSpriteSheet(robot.id, canvas, { frameWidth: 128, frameHeight: 128 });
    scene.anims.create({ key: `${robot.id}-run`, frames: scene.anims.generateFrameNumbers(robot.id, { start: 0, end: 7 }), frameRate: robot.id === 'biggy' ? 10 : 15, repeat: -1 });
  }
  const texture = (key, width, height, draw) => {
    if (scene.textures.exists(key)) return;
    const { canvas, c } = surface(width, height); draw(c); scene.textures.addCanvas(key, canvas);
  };
  texture('cinema-tiles', TILE * 8, TILE, c => {
    for (let i = 0; i < 8; i++) {
      c.save(); c.translate(i * TILE, 0);
      if (i === 6) { // weak service grating: only Biggy is heavy enough to break it
        c.fillStyle = '#0c151d'; c.fillRect(0, 0, 48, 48);
        c.strokeStyle = '#5a7078'; c.lineWidth = 2;
        for (let k = 4; k < 48; k += 8) { c.beginPath(); c.moveTo(k, 2); c.lineTo(k, 46); c.stroke(); c.beginPath(); c.moveTo(2, k); c.lineTo(46, k); c.stroke(); }
        c.fillStyle = '#f0a860'; c.fillRect(0, 0, 48, 3); c.fillStyle = '#ffd9a0'; c.font = 'bold 9px monospace'; c.textAlign = 'center'; c.fillText('MAX 4', 24, 30);
        c.restore(); continue;
      }
      if (i === 7) { // steel shutter door
        c.fillStyle = gradient(c, 0, 0, 48, 0, ['#3e5561', '#78929b', '#2c424e']); c.fillRect(0, 0, 48, 48);
        c.fillStyle = '#16262e'; for (let k = 6; k < 48; k += 12) c.fillRect(0, k, 48, 3);
        c.fillStyle = '#f2b06a'; c.fillRect(20, 0, 8, 48); c.fillStyle = '#0a141b55'; c.fillRect(0, 0, 3, 48); c.fillRect(45, 0, 3, 48);
        c.restore(); continue;
      }
      const colors = i === 5 ? ['#813e43','#472831','#261e2a'] : i === 4 ? ['#447786','#234754','#172e3a'] : ['#687c7a','#394d53','#1b2e38'];
      c.fillStyle = gradient(c, 0, 0, 12, 48, colors); c.fillRect(0, 0, 48, 48);
      c.fillStyle = i === 0 ? '#48605d' : i === 5 ? '#f4b177' : i === 4 ? '#8bdce6' : '#dab888'; c.fillRect(0, 0, 48, i === 0 ? 1 : 4);
      c.fillStyle = '#050e1850'; c.fillRect(0, 44, 48, 4); c.fillRect(46, 5, 2, 43);
      if (i === 2 || i === 3) {
        c.fillStyle = '#13232c'; c.fillRect(3, 18, 42, 5); c.fillRect(3, 29, 42, 4);
        c.fillStyle = '#c7a674'; c.fillRect(5, 6, 5, 2); c.fillRect(38, 6, 5, 2);
      }
      for (let j = 0; j < 20; j++) { c.fillStyle = j % 2 ? '#c2c9ad13' : '#020e191a'; c.fillRect((j * 13 + i * 7) % 45, 7 + (j * 17) % 36, 2 + j % 4, 1); }
      c.restore();
    }
  });
  for (const threshold of [3, 5]) texture(`plate-${threshold}`, 96, 16, c => {
    rounded(c, 0, 4, 96, 12, 4, gradient(c, 0, 4, 0, 12, ['#7c8f92', '#33474f']), '#a9bcb6');
    rounded(c, 6, 0, 84, 10, 4, threshold === 5 ? '#c96a4e' : '#d9a862', '#ffe1b0');
    c.fillStyle = '#1a1f24'; c.font = 'bold 10px monospace'; c.textAlign = 'center'; c.fillText(`${threshold}`, 48, 9);
    c.fillStyle = '#1a1f2488'; c.fillText('◀', 18, 9); c.fillText('▶', 78, 9);
  });
  texture('spring', 48, 28, c => {
    rounded(c, 2, 2, 44, 18, 8, gradient(c, 0, 0, 0, 20, ['#c0625f', '#8a3f49', '#4a2735']), '#d98777');
    rounded(c, 6, 4, 36, 7, 4, '#d77a70'); c.fillStyle = '#2a1a24'; for (const x of [10, 24, 38]) c.fillRect(x - 1, 20, 3, 8);
    c.strokeStyle = '#ffd7a0'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(12, 24); c.lineTo(18, 21); c.lineTo(24, 24); c.lineTo(30, 21); c.lineTo(36, 24); c.stroke();
  });
  texture('case', 48, 48, c => {
    rounded(c, 2, 2, 44, 44, 5, gradient(c, 0, 0, 48, 48, ['#8d9a96', '#4f6570', '#2a3e49']), '#b4c3b8');
    rounded(c, 8, 8, 32, 32, 3, '#324b58', '#96a69a'); c.fillStyle = '#c9a274'; c.fillRect(6, 22, 36, 4);
    for (const x of [6, 40]) for (const y of [6, 40]) ellipse(c, x, y, 2, 2, '#e2d7bb');
    c.fillStyle = '#ffd9a0'; c.font = 'bold 9px monospace'; c.textAlign = 'center'; c.fillText('AV', 24, 20); c.fillText('3', 24, 37);
  });
  texture('sentry', 44, 44, c => {
    rounded(c, 2, 4, 40, 36, 6, gradient(c, 0, 0, 44, 44, ['#8a9ca0', '#3f5762', '#1d2f3a']), '#b0c2bc');
    rounded(c, 10, 12, 24, 20, 4, '#0e1c26', '#f0a860'); ellipse(c, 22, 22, 7, 7, gradient(c, 15, 15, 14, 14, ['#ffe2b0', '#f08c4a', '#7a2f1e']));
    ellipse(c, 20, 20, 2, 2, '#fff4d0'); c.fillStyle = '#c9a274'; c.fillRect(4, 38, 36, 3); for (const x of [6, 36]) ellipse(c, x, 8, 2, 2, '#e2d7bb');
  });
  texture('bolt', 26, 12, c => {
    const g = c.createRadialGradient(13, 6, 1, 13, 6, 13); g.addColorStop(0, '#fff2c8'); g.addColorStop(.5, '#ffb35c'); g.addColorStop(1, '#ff7a3000'); c.fillStyle = g; c.fillRect(0, 0, 26, 12);
    rounded(c, 4, 3, 18, 6, 3, '#ffd28a', '#fff3d2');
  });
  texture('swooper', 70, 54, c => {
    ellipse(c, 35, 48, 22, 4, '#0005'); for (const [x, d] of [[10, -1], [60, 1]]) { c.beginPath(); c.moveTo(35, 22); c.lineTo(x, 8); c.lineTo(x + d * 4, 26); c.closePath(); c.fillStyle = '#7d6fb8'; c.fill(); c.strokeStyle = '#bcb0e8'; c.lineWidth = 1.5; c.stroke(); }
    rounded(c, 17, 16, 36, 26, 12, gradient(c, 0, 15, 65, 32, ['#c9c0ea', '#6d5fa8', '#2c2447']), '#d5cbf0');
    rounded(c, 22, 24, 26, 8, 4, '#1b1630'); ellipse(c, 30, 28, 3, 2.5, '#ff8d76'); ellipse(c, 40, 28, 3, 2.5, '#ff8d76');
    limb(c, [[35, 15], [35, 6]], 2, '#bcb0e8'); ellipse(c, 35, 6, 3, 3, '#ff9475');
  });
  texture('spark', 36, 36, c => {
    const g = c.createRadialGradient(18,18,1,18,18,18); g.addColorStop(0,'#fff5cb'); g.addColorStop(.3,'#ffc96f'); g.addColorStop(1,'#ff9e4200'); c.fillStyle=g;c.fillRect(0,0,36,36);
    rounded(c,11,7,14,22,5,'#f4b766','#fff1b8'); rounded(c,15,11,6,14,2,'#ffe0a0');
  });
  texture('crate', 84, 84, c => {
    rounded(c, 3, 3, 78, 78, 7, gradient(c,0,0,90,90,['#75878b','#3c515c','#1c323e']), '#a5b3a7');
    rounded(c, 11, 11, 62, 62, 4, '#304957', '#8f9d90');
    limb(c, [[14,14],[70,70]], 8, '#c08f5d'); limb(c,[[70,14],[14,70]],8,'#c08f5d');
    for(const x of [9,74])for(const y of [9,74])ellipse(c,x,y,2,2,'#d2c7aa');
    rounded(c,30,29,24,26,4,'#162c36','#ddae71'); c.fillStyle='#ffd491';c.font='bold 17px monospace';c.textAlign='center';c.fillText('Ⅱ',42,48);
  });
  texture('drone', 70, 54, c => {
    ellipse(c,35,48,26,5,'#0005'); rounded(c,7,15,56,29,12,gradient(c,0,15,65,32,['#adc2c2','#556e7f','#243949']),'#b7c7bd');
    rounded(c,13,24,44,9,4,'#1b303d'); ellipse(c,28,28,4,3,'#ff8d76'); ellipse(c,44,28,4,3,'#ff8d76');
    limb(c,[[35,14],[35,5]],2,'#a5c3c6');ellipse(c,35,5,3,3,'#ff9475');
    for(const x of [14,49])rounded(c,x,39,8,8,3,'#142a36');
  });
  texture('terminal', 94, 112, c => {
    rounded(c,17,7,60,73,8,gradient(c,0,0,94,112,['#748c92','#2d4554','#122c37']),'#9ec4c6');
    rounded(c,25,16,44,40,4,'#102b3b','#8bdce6');
    c.strokeStyle='#7fd4dc';c.lineWidth=2;c.beginPath();c.moveTo(32,29);c.lineTo(40,35);c.lineTo(32,41);c.stroke();c.fillStyle='#7fd4dc';c.fillRect(45,40,13,2);
    rounded(c,28,64,37,6,2,'#8cd5d3');rounded(c,37,81,20,23,2,'#486270');rounded(c,18,103,59,6,2,'#6f929a');
  });
  texture('lens', 68, 68, c => {
    ellipse(c,34,34,27,27,gradient(c,0,0,68,68,['#fff0ba','#d69861','#623f42']),'#ffe7ad');
    ellipse(c,34,34,20,20,'#192c40','#f3c187');ellipse(c,34,34,14,14,gradient(c,18,18,30,30,['#d4eff0','#80bec8','#354b69']));
    ellipse(c,30,29,5,4,'#ffffffb0');
  });
  texture('glow', 256, 256, c => { const g=c.createRadialGradient(128,128,0,128,128,128);g.addColorStop(0,'#ffd79f65');g.addColorStop(.35,'#f4b47625');g.addColorStop(1,'#ec9f6300');c.fillStyle=g;c.fillRect(0,0,256,256); });
  texture('booth', 300, 250, c => {
    rounded(c,10,44,280,200,7,gradient(c,0,0,300,250,['#395964','#1c3546','#14232f']),'#718b89');
    rounded(c,3,33,294,33,5,'#23444f','#c29f6d');
    c.fillStyle='#e8c58c';c.fillRect(10,66,280,3);
    c.fillStyle='#8eaeb0';c.font='12px monospace';c.textAlign='center';c.fillText('DEVOXX  /  DISCOVER · BUILD · SHARE',150,55);
    rounded(c,30,92,101,78,3,'#081e2d','#5f969b');c.fillStyle='#709ba0';for(let i=0;i<5;i++)c.fillRect(42,105+i*10,35+(i*13)%37,2);
    rounded(c,179,92,72,106,5,'#193443','#506d78');rounded(c,187,101,56,59,2,'#2d5967');
    rounded(c,0,199,300,44,3,gradient(c,0,190,300,40,['#66827f','#2d4853','#162b3b']),'#c8b38a');
    c.fillStyle='#b6a684';c.fillRect(10,202,280,3);
  });
  texture('seat', 54, 75, c => {
    rounded(c,5,2,44,52,10,gradient(c,0,0,54,65,['#a15e5a','#713b47','#371f32']),'#b3776b');
    rounded(c,7,42,40,16,5,'#925350','#bc8070');rounded(c,1,32,7,28,3,'#4c3440');rounded(c,46,32,7,28,3,'#4c3440');rounded(c,11,58,6,15,2,'#192833');rounded(c,38,58,6,15,2,'#192833');
  });
  texture('curtain', 256, 660, c => {
    for(let x=0;x<256;x+=32){c.fillStyle=gradient(c,x,0,32,0,['#1a202f','#5a2f3d','#934d4e','#372333']);c.fillRect(x,0,32,660);}
    c.fillStyle='#07182755';c.fillRect(0,0,256,660);
  });
}

export function decorate(scene, stage) {
  const WIDTH = stage.widthTiles * TILE;
  const text = (x, y, value, size = 14, color = '#dbc69e') => scene.add.text(x, y, value, { fontFamily: 'monospace', fontSize: size, color, letterSpacing: 2 }).setDepth(-2);
  const sign = (x, y, title, subtitle, width = 280) => {
    scene.add.rectangle(x, y, width, 69, 0x122e3a, .93).setStrokeStyle(1, 0x8a9e92).setDepth(-4);
    scene.add.rectangle(x - width / 2, y - 34, 4, 69, 0xf1b36e).setDepth(-3);
    text(x - width / 2 + 20, y - 23, title, 17, '#f1d9ac'); text(x - width / 2 + 20, y + 6, subtitle, 10, '#8fafb0');
  };
  const panorama = (alpha, tint) => {
    for (let x = 0, i = 0; x < WIDTH; x += 3000, i++) {
      const image = scene.add.image(x, 0, 'foyer').setOrigin(0, 0).setDisplaySize(3000, 720).setFlipX(i % 2 === 1).setScrollFactor(.32, 0).setDepth(-20).setAlpha(alpha);
      if (tint) image.setTint(tint);
    }
  };
  const glow = (x, y, alpha = .28, scale = 1) => scene.add.image(x, y, 'glow').setBlendMode(Phaser.BlendModes.ADD).setAlpha(alpha).setScale(scale).setDepth(-4);
  const rails = () => {
    // Steel-and-glass rails follow every staircase step and landing in the tile data.
    let previous = null;
    for (let col = 0; col < stage.widthTiles; col++) {
      let top = null;
      for (let row = 0; row < 13; row++) if (stage.data[row][col] === 2 && stage.data[row - 1]?.[col] === -1) { top = row * TILE; break; }
      if (top === null) { previous = null; continue; }
      const x = col * TILE + 24;
      scene.add.rectangle(x, top - 40, 3, 80, 0x768f8d, .8).setDepth(-4);
      scene.add.rectangle(x, top - 62, 34, 22, 0x9fd0d8, .12).setDepth(-4);
      if (previous) { const g = scene.add.graphics().setDepth(-4); g.lineStyle(4, 0xc7c4a4, .85); g.lineBetween(previous.x, previous.top - 80, x, top - 80); }
      previous = { x, top };
    }
  };
  const doors = (from, to, count) => {
    for (let i = 0; i < count; i++) {
      const x = from + (to - from) * i / (count - 1);
      scene.add.rectangle(x, 566, 62, 116, 0x1a2c36).setStrokeStyle(2, 0x5f7a84).setDepth(-6);
      scene.add.rectangle(x, 566, 50, 104, 0x2a3f4b).setDepth(-5); scene.add.rectangle(x + 16, 568, 4, 10, 0xd9b98a).setDepth(-5);
      scene.add.rectangle(x, 494, 54, 18, 0x0f1d26).setStrokeStyle(1, 0xc39c6a).setDepth(-5);
      text(x - 20, 488, `ZAAL ${i + 1}`, 9, '#f2c78e');
    }
  };
  const aisle = () => { for (let x = 0; x < WIDTH; x += 480) scene.add.rectangle(x + 80, 620, 56, 3, 0xf5c181, .5).setDepth(3); };

  if (stage.decor === 'arrival') {
    panorama(.55, 0x8fb0d8); scene.add.rectangle(0, 0, WIDTH, 768, 0x061424, .4).setOrigin(0, 0).setDepth(-19);
    scene.add.rectangle(WIDTH / 2, 92, WIDTH, 120, 0x0b1822, .9).setDepth(-12); scene.add.rectangle(WIDTH / 2, 154, WIDTH, 6, 0xf1b36e, .9).setDepth(-12);
    text(150, 56, 'K I N E P O L I S', 44, '#f7c98d'); text(160, 112, 'A N T W E R P', 16, '#9fb7bd');
    glow(330, 80, .35, 1.6); glow(1700, 80, .25, 1.4);
    for (let x = 60; x < WIDTH; x += 300) { scene.add.rectangle(x, 400, 6, 450, 0x2a3d49, .9).setDepth(-11); scene.add.rectangle(x + 150, 400, 280, 440, 0x9fc3e0, .06).setDepth(-11); }
    sign(600, 200, 'DEVOXX BELGIUM', 'WELCOME  /  REGISTRATION  →');
    sign(1500, 190, 'REGISTRATION', 'BADGES  ·  LANYARDS  ·  COFFEE');
    for (const x of [1350, 1560]) scene.add.image(x, 486, 'booth').setDepth(-5).setScale(.8);
    sign(2200, 200, 'EXHIBITION HALL  →', 'MIND THE STEP', 240);
  } else if (stage.decor === 'hall') {
    panorama(.85); scene.add.rectangle(0, 0, WIDTH, 768, 0x081829, .22).setOrigin(0, 0).setDepth(-19);
    for (const x of [800, 1700, 2600, 3200]) { scene.add.image(x, 486, 'booth').setDepth(-5); glow(x, 320); }
    sign(355, 170, 'DEVOXX BELGIUM', 'KINEPOLIS ANTWERP  /  EXHIBITION');
    sign(2000, 175, 'EXHIBITION HALL', 'BOOTHS  ·  DEMOS  ·  COFFEE');
    text(300, 542, 'WELCOME, LITTLE ROBOT.', 10, '#c1caba');
  } else if (stage.decor === 'staircase') {
    panorama(.7); scene.add.rectangle(0, 0, WIDTH, 768, 0x081829, .3).setOrigin(0, 0).setDepth(-19);
    rails();
    sign(300, 178, 'THE GRAND STAIRCASE', '↑ CINEMA LEVEL  /  AUDITORIUMS 1 – 14');
    sign(2100, 200, 'AUDITORIUMS', 'ZAAL 1 – 14  ·  KEYNOTE  →', 240);
    scene.add.rectangle(1920 + (WIDTH - 1920) / 2, 300, WIDTH - 1920, 400, 0x0d1a24, .55).setDepth(-12);
    doors(1990, WIDTH - 120, 14);
    for (let x = 2000; x < WIDTH; x += 500) glow(x, 300, .2, 1.3);
    scene.add.rectangle(50 * TILE, 200, 1400, 40, 0xf1b36e, .06).setDepth(-12);
  } else {
    scene.add.rectangle(0, 50, WIDTH, 580, 0x101a2c, .95).setOrigin(0, 0).setDepth(-10);
    for (let x = 30; x < WIDTH; x += 750) scene.add.image(x, 318, 'curtain').setDisplaySize(165, 590).setDepth(-8).setAlpha(.95);
    for (let row = 0; row < 3; row++) for (let x = 120; x < WIDTH - 500; x += 64) scene.add.image(x + row * 20, 607 - row * 76, 'seat').setDepth(-7 - row).setAlpha(.9 - row * .2).setScale(1 - row * .09);
    for (const x of [500, 1100, 1700, 2300]) { const g = scene.add.graphics().setDepth(-6); g.fillStyle(0xffd195, .055); g.fillTriangle(x - 40, 70, x - 250, 600, x + 240, 600); scene.add.image(x, 90, 'glow').setDisplaySize(120, 120).setAlpha(.3).setDepth(-6); }
    const screenX = WIDTH - 330;
    scene.screen = scene.add.rectangle(screenX, 262, 580, 330, 0x203744).setStrokeStyle(8, 0x596e6c).setDepth(-7);
    scene.screenTitle = text(screenX, 198, 'SIGNAL LOST', 32, '#708d93').setOrigin(.5, 0);
    scene.screenSubtitle = text(screenX, 244, 'RESTORE THE THREE SYSTEMS', 12, '#7a9698').setOrigin(.5, 0);
    text(screenX, 455, 'DEVOXX 2026', 22, '#bca783').setOrigin(.5, 0);
    sign(300, 165, 'ZAAL 8  →', 'THE OPENING KEYNOTE', 220);
  }
  for (const s of stage.signs ?? []) void s;
  aisle();
}
