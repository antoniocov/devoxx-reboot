import { Session, ROBOTS, INPUT, HZ, DT, TICKS, DURATION } from './simulation.js';
import { createRenderer } from './render.js';

const $ = selector => document.querySelector(selector);
const session = new Session();
const canvas = $('#game');
const render = createRenderer(canvas);
const held = new Set();
let actionPending = false;
let accumulator = 0;
let lastTime = performance.now();
let sound = false;
let audio;
let uiClock = 0;
let windowPaused = false;
let clearArmed = false;
let clearTimeoutId;
const controls = { KeyW: INPUT.UP, ArrowUp: INPUT.UP, KeyS: INPUT.DOWN, ArrowDown: INPUT.DOWN, KeyA: INPUT.LEFT, ArrowLeft: INPUT.LEFT, KeyD: INPUT.RIGHT, ArrowRight: INPUT.RIGHT };

function announce(message) { $('#status-message').textContent = message; }
function beep(frequency = 420, duration = .07) {
  if (!sound || !audio) return;
  const oscillator = audio.createOscillator(); const gain = audio.createGain();
  oscillator.type = 'sine'; oscillator.frequency.value = frequency;
  gain.gain.setValueAtTime(.035, audio.currentTime); gain.gain.exponentialRampToValueAtTime(.001, audio.currentTime + duration);
  oscillator.connect(gain); gain.connect(audio.destination); oscillator.start(); oscillator.stop(audio.currentTime + duration);
}
function clearInput() { held.clear(); actionPending = false; }
function focusGame() { canvas.focus({ preventScroll: true }); }
function selectRobot(index) {
  if (!session.select(index)) return;
  clearInput(); accumulator = 0;
  announce(`${ROBOTS[index].name} selected. Press R to record. Saved takes will replay alongside you.`);
  syncUI(); focusGame();
}
function recordOrSave() {
  if (session.mode === 'record') {
    if (!session.save()) return;
    afterSave();
  } else if (session.record()) {
    clearInput(); accumulator = 0;
    announce(`Recording ${ROBOTS[session.selected].name}. Move with WASD or arrows; press E at the marked station.`);
    beep(360); syncUI(); focusGame();
  }
}
function afterSave() {
  const name = ROBOTS[session.selected].name;
  const next = session.tracks.findIndex(t => !t);
  const suffix = next < 0 ? 'All three takes are ready. Run the plan.' : `Select ${ROBOTS[next].name} to record the next part.`;
  announce(`${name} saved. ${suffix}`);
  clearInput(); beep(680); syncUI(); drawTracks();
}
function play() {
  if (!session.play()) return;
  clearInput(); accumulator = 0;
  announce('Running all three takes. Watch the door, power and projector.');
  beep(560); syncUI(); focusGame();
}
function stop() {
  const wasRecording = session.mode === 'record';
  session.stop(); clearInput(); accumulator = 0;
  $('#result').hidden = true;
  announce(wasRecording ? 'Recording cancelled. Your previous take is still saved.' : 'Back to planning. Select a robot to improve its take.');
  syncUI(); drawTracks();
}
function finish() {
  const { won, time } = session.lastResult;
  $('#result').hidden = false;
  $('#result-eyebrow').textContent = won ? 'ALL SYSTEMS GO' : 'A LITTLE OUT OF SYNC';
  $('#result-title').textContent = won ? 'Right on cue.' : 'One more take.';
  $('#result-description').textContent = won ? `Three robots. One perfect entrance. You brought the keynote to life in ${time.toFixed(2)} seconds. Can you get the crew there faster?` : 'The projector needs all three robots connected at the same time. Check which system stayed offline, then re-record that robot’s route.';
  announce(won ? `Mission complete in ${time.toFixed(2)} seconds.` : 'The 18-second plan ended. Re-record a take and try again.');
  beep(won ? 880 : 190, .3); syncUI(); $('#result-button').focus({ preventScroll: true });
}
function systemStatus(selector, enabled, on, off) {
  const element = $(selector); element.classList.toggle('on', enabled); element.querySelector('i').textContent = enabled ? on : off;
}
function syncUI() {
  const recording = session.mode === 'record';
  const playing = session.mode === 'play';
  const planning = session.mode === 'plan';
  document.querySelectorAll('.robot-card').forEach((element, index) => {
    element.classList.toggle('selected', index === session.selected);
    element.classList.toggle('recorded', Boolean(session.tracks[index]));
    element.setAttribute('aria-pressed', String(index === session.selected));
    element.disabled = !planning;
    element.querySelector('.track-state').textContent = recording && index === session.selected ? '● RECORDING' : session.tracks[index] ? `${(session.tracks[index].length / HZ).toFixed(1)}s TAKE SAVED ✓` : 'NO TAKE YET';
  });
  $('#assignment-label').textContent = `${ROBOTS[session.selected].name.toUpperCase()}’S JOB`;
  $('#assignment-text').textContent = ROBOTS[session.selected].job;
  $('#record-label').textContent = recording ? 'Save take' : `${session.tracks[session.selected] ? 'Re-record' : 'Record'} ${ROBOTS[session.selected].name}`;
  $('#record-button').disabled = !recording && !planning;
  $('#play-button').disabled = !planning || !session.tracks.every(Boolean);
  $('#stop-button').hidden = !recording && !playing;
  $('#reset-button').disabled = !planning || !session.tracks.some(Boolean);
  $('#mode-label').innerHTML = `<i></i> ${recording ? 'RECORDING TAKE' : playing ? 'RUNNING THE PLAN' : session.mode === 'finished' ? 'REHEARSAL COMPLETE' : 'PLANNING MODE'}`;
  $('#mode-label').classList.toggle('recording', recording);
  $('#map-time').textContent = `${(session.world.tick / HZ).toFixed(2).padStart(5, '0')} / 18.00`;
  systemStatus('#door-status', session.world.door, 'OPEN', 'LOCKED');
  systemStatus('#power-status', session.world.power, 'ONLINE', 'OFFLINE');
  systemStatus('#projector-status', session.world.charge > 0, session.world.won ? 'LIVE' : 'BOOTING', 'OFFLINE');
  document.querySelectorAll('.playhead').forEach(head => head.style.left = `${Math.min(99.8, session.world.tick / TICKS * 100)}%`);
}
function drawTracks() {
  document.querySelectorAll('.timeline-row').forEach((element, index) => {
    const recording = session.mode === 'record' && index === session.selected;
    const track = recording ? session.draft : session.tracks[index];
    const c = element.querySelector('canvas'); const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, c.width, c.height);
    element.querySelector('b').hidden = Boolean(track?.length);
    if (!track?.length) return;
    const length = track.length / TICKS * c.width;
    ctx.fillStyle = `${ROBOTS[index].color}19`; ctx.fillRect(0, 0, c.width, c.height);
    ctx.fillStyle = `${ROBOTS[index].color}55`; ctx.fillRect(0, 0, length, c.height);
    for (let j = 0; j < track.length; j += 4) {
      const slice = track.slice(j, j + 4);
      const action = slice.some(mask => mask & INPUT.ACTION);
      const moving = slice.some(mask => mask & 15);
      ctx.fillStyle = action ? '#fff0d6' : ROBOTS[index].color;
      const height = action ? 21 : moving ? 11 : 3;
      ctx.fillRect(j / TICKS * c.width, (24 - height) / 2, action ? 4 : 2, height);
    }
  });
}
$('#record-button').addEventListener('click', recordOrSave);
$('#play-button').addEventListener('click', play);
$('#stop-button').addEventListener('click', stop);
$('#result-button').addEventListener('click', () => { stop(); focusGame(); });
document.querySelectorAll('[data-robot]').forEach(button => button.addEventListener('click', () => selectRobot(Number(button.dataset.robot))));
$('#help-button').addEventListener('click', () => { clearInput(); $('#help-dialog').showModal(); });
$('#help-dialog').addEventListener('close', () => { lastTime = performance.now(); accumulator = 0; focusGame(); });
$('#reset-button').addEventListener('click', () => {
  if (!clearArmed) {
    clearArmed = true; $('#reset-button').textContent = 'Click again to clear all takes';
    clearTimeoutId = setTimeout(() => { clearArmed = false; $('#reset-button').textContent = 'Clear all takes ↺'; }, 3500); return;
  }
  clearTimeout(clearTimeoutId); clearArmed = false; $('#reset-button').textContent = 'Clear all takes ↺';
  session.clear(); clearInput(); announce('Takes cleared. Start a fresh plan with any robot.'); syncUI(); drawTracks();
});
$('#sound-button').addEventListener('click', async () => {
  try {
    audio ??= new AudioContext();
    await audio.resume(); sound = !sound;
    $('#sound-button').textContent = sound ? 'Sound on ♫' : 'Sound off ♫';
    $('#sound-button').setAttribute('aria-pressed', String(sound)); beep(600);
  } catch { announce('Audio is unavailable in this browser. The game is ready to play.'); }
});
window.addEventListener('keydown', event => {
  if ($('#help-dialog').open || event.ctrlKey || event.metaKey || event.altKey) return;
  // Preserve normal keyboard activation for focused buttons.
  if ((event.code === 'Space' || event.code === 'Enter') && event.target.closest?.('button')) return;
  if (controls[event.code]) {
    event.preventDefault(); held.add(controls[event.code]);
    if (session.mode === 'plan') announce('Press R to start recording, then move your robot.');
  } else if (event.code === 'KeyE') { event.preventDefault(); if (!event.repeat && session.mode === 'record') actionPending = true; }
  else if (!event.repeat) {
    if (event.code === 'KeyR') { event.preventDefault(); recordOrSave(); }
    if (event.code === 'Space') { event.preventDefault(); play(); }
    if (event.code === 'Escape') { event.preventDefault(); stop(); }
    if (['Digit1', 'Digit2', 'Digit3'].includes(event.code)) selectRobot(Number(event.code.at(-1)) - 1);
  }
});
window.addEventListener('keyup', event => held.delete(controls[event.code]));
window.addEventListener('blur', () => { clearInput(); windowPaused = true; });
window.addEventListener('focus', () => { windowPaused = false; lastTime = performance.now(); accumulator = 0; });
document.addEventListener('visibilitychange', () => { clearInput(); lastTime = performance.now(); accumulator = 0; });
const touchMap = { up: INPUT.UP, down: INPUT.DOWN, left: INPUT.LEFT, right: INPUT.RIGHT };
document.querySelectorAll('[data-move]').forEach(button => {
  const bit = touchMap[button.dataset.move];
  button.addEventListener('pointerdown', event => { event.preventDefault(); button.setPointerCapture(event.pointerId); held.add(bit); });
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) button.addEventListener(type, () => held.delete(bit));
});
$('#touch-action').addEventListener('click', () => { if (session.mode === 'record') actionPending = true; });

function frame(now) {
  const elapsed = Math.min((now - lastTime) / 1000, .1); lastTime = now;
  const paused = document.hidden || windowPaused || $('#help-dialog').open;
  if (!paused && (session.mode === 'record' || session.mode === 'play')) {
    accumulator += elapsed;
    while (accumulator >= DT && (session.mode === 'record' || session.mode === 'play')) {
      const previousMode = session.mode;
      let input = 0; for (const key of held) input |= key;
      if (actionPending) { input |= INPUT.ACTION; actionPending = false; }
      session.step(input); accumulator -= DT;
      for (const event of session.world.events) if (previousMode === 'record' && event.robot === session.selected) { announce(event.text); beep(500); }
      if (previousMode === 'record' && session.mode === 'plan') afterSave();
      if (session.mode === 'finished') finish();
    }
  } else accumulator = 0;
  if (now - uiClock > 90) {
    syncUI(); if (session.mode === 'record') drawTracks(); uiClock = now;
    if (paused && (session.mode === 'record' || session.mode === 'play')) $('#mode-label').innerHTML = '<i></i> PAUSED';
  }
  render(session);
  requestAnimationFrame(frame);
}
syncUI(); drawTracks(); requestAnimationFrame(frame);
