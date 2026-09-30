// A chiptune sequencer on the Web Audio API in the spirit of 8-bit console soundtracks. No audio files.
// Five channels: two pulse leads with real 25% and 12.5% duty cycles (PeriodicWave), a fast pulse arpeggio,
// a triangle bass walking in octaves, and noise drums; swung sixteenths, a short echo and vibrato on held notes.
// Each stage tune is 16 bars long with an A section and a B answer, written as bars of sixteenth-note tokens.
const KEY = 'keynote-music';
const NOTE_INDEX = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
export function noteFrequency(name) {
  const match = /^([A-G])([#b]?)(\d)$/.exec(name);
  if (!match) return 0;
  const midi = 12 * (Number(match[3]) + 1) + NOTE_INDEX[match[1]] + (match[2] === '#' ? 1 : match[2] === 'b' ? -1 : 0);
  return 440 * 2 ** ((midi - 69) / 12);
}
const bar = text => { const tokens = text.trim().split(/\s+/); if (tokens.length !== 16) throw new Error(`bar needs 16 tokens: ${text}`); return tokens; };
const REST = bar('. . . . . . . . . . . . . . . .');
// Chords: root, third, fifth as scale degrees from C; used to generate the arpeggio and bass lines.
const CHORDS = { C: ['C', 'E', 'G'], F: ['F', 'A', 'C'], G: ['G', 'B', 'D'], Am: ['A', 'C', 'E'], Dm: ['D', 'F', 'A'], Em: ['E', 'G', 'B'], Bb: ['Bb', 'D', 'F'], D: ['D', 'F#', 'A'], E: ['E', 'G#', 'B'], Fm: ['F', 'Ab', 'C'], Gm: ['G', 'Bb', 'D'] };
const up = (note, octave) => `${note}${octave}`;
function arpBar(chord, shape = 0) {
  const [r, t, f] = CHORDS[chord];
  const runs = [
    [up(r, 4), up(t, 4), up(f, 4), up(r, 5), up(t, 5), up(r, 5), up(f, 4), up(t, 4)],
    [up(r, 5), up(f, 4), up(t, 4), up(r, 4), up(t, 4), up(f, 4), up(r, 5), up(t, 5)],
  ][shape % 2];
  return [...runs, ...runs];
}
function bassBar(chord, style = 0) {
  const [r, , f] = CHORDS[chord];
  const octaveRoot = up(r, 3), root = up(r, 2), fifth = up(f, 2);
  if (style === 1) return bar(`${root} . . ${root} . . ${octaveRoot} . ${root} . . ${fifth} . . ${octaveRoot} .`);
  return bar(`${root} . ${octaveRoot} . ${fifth} . ${octaveRoot} . ${root} . ${octaveRoot} . ${fifth} . ${octaveRoot} .`);
}
const DRUMS = {
  bounce: bar('k . h . s . h . k . h h s . h .'), bounceFill: bar('k . h . s . h . k k s . s s s s'),
  drive: bar('k . h h s . h k k . h h s . h .'), driveFill: bar('k . h h s . h k k s s . s s k k'),
  march: bar('k . . h s . . h k . . h s . h h'), marchFill: bar('k . . h s . . h k k k . s s s s'),
  half: bar('k . . . . . . . s . . . . . h .'), halfFill: bar('k . . . . . . . s . s . s . s s'),
};
// Songs: 16 bars. `lead`, `harmony` and `chords` are indexed per bar; `drums` names a groove with a fill every 4th bar.
const SONGS = {
  arrival: { bpm: 156, swing: .1, drums: 'bounce', chords: ['C', 'C', 'F', 'G', 'C', 'Am', 'F', 'G', 'F', 'G', 'C', 'Am', 'F', 'G', 'C', 'C'],
    lead: [
      'C5 . E5 . G5 . E5 . C5 . E5 . G5 ^ . .', 'A4 . C5 . E5 . C5 . A4 . C5 . E5 ^ . .', 'F4 . A4 . C5 . A4 . G4 . B4 . D5 ^ . .', 'G5 . E5 . C5 . E5 . D5 ^ ^ ^ . . . .',
      'C5 . E5 . G5 . E5 . C5 . E5 . G5 ^ . .', 'A4 . C5 . E5 . C5 . A4 . C5 . E5 ^ . .', 'F4 . A4 . C5 . A4 . G4 . B4 . D5 ^ . .', 'E5 ^ ^ . C5 ^ ^ . G4 ^ ^ ^ ^ ^ . .',
      'A5 . G5 . F5 ^ . E5 . D5 . C5 . . . .', 'B4 . D5 . G5 ^ . F5 . D5 . B4 . . . .', 'C5 . E5 . G5 . C6 ^ . B5 . G5 . E5 . .', 'A5 . E5 . C5 . A4 . E5 ^ ^ ^ . . . .',
      'F5 . A5 . C6 ^ . A5 . F5 . C5 . . . .', 'D5 . G5 . B5 ^ . G5 . D5 . B4 . . . .', 'C5 . E5 . G5 . E5 . C5 . E5 . G5 ^ . .', 'C6 ^ ^ ^ . . G5 . E5 . C5 ^ ^ ^ . .'],
    harmony: [
      REST, REST, REST, REST,
      'E4 . G4 . C5 . G4 . E4 . G4 . C5 ^ . .', 'C4 . E4 . A4 . E4 . C4 . E4 . A4 ^ . .', 'A3 . C4 . F4 . C4 . B3 . D4 . G4 ^ . .', 'C5 ^ ^ . G4 ^ ^ . E4 ^ ^ ^ ^ ^ . .',
      'F5 . E5 . C5 ^ . C5 . B4 . A4 . . . .', 'G4 . B4 . D5 ^ . D5 . B4 . G4 . . . .', 'E5 . G5 . C6 . E6 ^ . D6 . B5 . G5 . .', 'C5 . A4 . E4 . C4 . A4 ^ ^ ^ . . . .',
      'A4 . C5 . F5 ^ . F5 . C5 . A4 . . . .', 'B4 . D5 . G5 ^ . G5 . D5 . B4 . . . .', 'E4 . G4 . C5 . G4 . E4 . G4 . C5 ^ . .', 'E5 ^ ^ ^ . . E5 . C5 . G4 ^ ^ ^ . .'] },
  hall: { bpm: 162, swing: .08, drums: 'drive', chords: ['F', 'F', 'Bb', 'C', 'F', 'Dm', 'Bb', 'C', 'Dm', 'Am', 'Bb', 'F', 'Gm', 'C', 'F', 'C'],
    lead: [
      'F5 . F5 . . . E5 . F5 . . . C5 . . .', 'F5 . F5 . . . A5 . G5 . F5 . D5 . . .', 'D5 . F5 . Bb5 ^ . A5 . F5 . D5 . . . .', 'E5 . G5 . C6 ^ . Bb5 . G5 . E5 . . . .',
      'F5 . F5 . . . E5 . F5 . . . C5 . . .', 'D5 . F5 . A5 ^ . A5 . F5 . D5 . . . .', 'Bb4 . D5 . F5 ^ . F5 . D5 . Bb4 . . . .', 'C5 . E5 . G5 ^ ^ ^ . . . . . . . .',
      'A5 ^ . F5 . D5 ^ . F5 . A5 ^ . . . .', 'E5 ^ . C5 . A4 ^ . C5 . E5 ^ . . . .', 'F5 . Bb5 . D6 ^ . C6 . Bb5 . A5 . F5 . .', 'A5 ^ ^ . F5 ^ ^ . C5 ^ ^ ^ . . . .',
      'G5 . Bb5 . D6 ^ . Bb5 . G5 . D5 . . . .', 'E5 . G5 . C6 ^ . G5 . E5 . C5 . . . .', 'F5 . A5 . C6 . F6 ^ ^ . C6 . A5 . F5 .', 'E5 ^ ^ ^ . . G5 ^ ^ ^ . . C6 ^ ^ ^'],
    harmony: [
      'A4 . A4 . . . G4 . A4 . . . F4 . . .', 'A4 . A4 . . . C5 . Bb4 . A4 . F4 . . .', 'Bb4 . D5 . F5 ^ . F5 . D5 . Bb4 . . . .', 'C5 . E5 . G5 ^ . G5 . E5 . C5 . . . .',
      REST, REST, REST, 'G4 . C5 . E5 ^ ^ ^ . . . . . . . .',
      'F5 ^ . D5 . A4 ^ . D5 . F5 ^ . . . .', 'C5 ^ . A4 . E4 ^ . A4 . C5 ^ . . . .', 'D5 . F5 . Bb5 ^ . A5 . F5 . F5 . D5 . .', 'F5 ^ ^ . C5 ^ ^ . A4 ^ ^ ^ . . . .',
      'D5 . G5 . Bb5 ^ . G5 . D5 . Bb4 . . . .', 'C5 . E5 . G5 ^ . E5 . C5 . G4 . . . .', 'A4 . C5 . F5 . A5 ^ ^ . F5 . C5 . A4 .', 'C5 ^ ^ ^ . . E5 ^ ^ ^ . . G5 ^ ^ ^'] },
  staircase: { bpm: 152, swing: .12, drums: 'march', chords: ['G', 'G', 'C', 'D', 'G', 'Em', 'C', 'D', 'Em', 'C', 'G', 'D', 'Em', 'C', 'D', 'G'],
    lead: [
      'G4 . A4 . B4 . C5 . D5 ^ . . B4 . D5 .', 'G5 ^ ^ . F#5 . E5 . D5 ^ ^ ^ . . . .', 'E5 . G5 . C6 ^ . B5 . A5 . G5 . E5 . .', 'F#5 . A5 . D6 ^ . C6 . A5 . F#5 . D5 . .',
      'G4 . A4 . B4 . C5 . D5 ^ . . B4 . D5 .', 'E5 . G5 . B5 ^ . G5 . E5 . B4 . . . .', 'C5 . E5 . G5 ^ . E5 . C5 . G4 . . . .', 'D5 . F#5 . A5 ^ ^ ^ . . . . . . . .',
      'B5 . G5 . E5 . G5 . B5 ^ ^ ^ . . . .', 'C6 . G5 . E5 . G5 . C6 ^ ^ ^ . . . .', 'B5 . D6 . G6 ^ . F#6 . D6 . B5 . G5 . .', 'A5 ^ ^ . F#5 ^ ^ . D5 ^ ^ ^ . . . .',
      'E5 . G5 . B5 . E6 ^ . D6 . B5 . G5 . .', 'C5 . E5 . G5 . C6 ^ . B5 . G5 . E5 . .', 'D5 . F#5 . A5 . D6 ^ . C6 . A5 . F#5 . .', 'G5 ^ ^ ^ . . D5 . B4 . G4 ^ ^ ^ . .'],
    harmony: [
      REST, REST, REST, REST,
      'B3 . C4 . D4 . E4 . G4 ^ . . G4 . B4 .', 'G4 . B4 . E5 ^ . B4 . G4 . E4 . . . .', 'E4 . G4 . C5 ^ . G4 . E4 . C4 . . . .', 'A4 . D5 . F#5 ^ ^ ^ . . . . . . . .',
      'G5 . E5 . B4 . E5 . G5 ^ ^ ^ . . . .', 'G5 . E5 . C5 . E5 . G5 ^ ^ ^ . . . .', 'D5 . G5 . B5 ^ . A5 . G5 . D5 . B4 . .', 'F#5 ^ ^ . D5 ^ ^ . A4 ^ ^ ^ . . . .',
      'B4 . E5 . G5 . B5 ^ . G5 . E5 . B4 . .', 'G4 . C5 . E5 . G5 ^ . E5 . C5 . G4 . .', 'A4 . D5 . F#5 . A5 ^ . F#5 . D5 . A4 . .', 'B4 ^ ^ ^ . . B4 . G4 . D4 ^ ^ ^ . .'] },
  auditorium: { bpm: 165, swing: .06, drums: 'drive', chords: ['Am', 'Am', 'F', 'G', 'Am', 'Am', 'F', 'E', 'C', 'G', 'F', 'E', 'Am', 'F', 'G', 'Am'],
    lead: [
      'A5 . . . E5 . . . C5 . . . E5 . . .', 'A5 . G5 . E5 . D5 . C5 ^ ^ ^ . . . .', 'F5 . A5 . C6 ^ . A5 . F5 . C5 . . . .', 'G5 . B5 . D6 ^ . B5 . G5 . D5 . . . .',
      'A5 . . . E5 . . . C5 . . . E5 . . .', 'A5 . B5 . C6 . B5 . A5 ^ ^ ^ . . . .', 'F5 . A5 . C6 . F6 ^ . E6 . C6 . A5 . .', 'G#5 ^ ^ ^ . . E5 . B5 ^ ^ ^ . . . .',
      'C6 . E6 . G6 ^ ^ . E6 . C6 . G5 . . .', 'B5 . D6 . G6 ^ ^ . D6 . B5 . G5 . . .', 'A5 . C6 . F6 ^ ^ . C6 . A5 . F5 . . .', 'G#5 . B5 . E6 ^ ^ ^ . . . . . . . .',
      'A5 . E5 . C5 . E5 . A5 ^ . . E5 . . .', 'F5 . C5 . A4 . C5 . F5 ^ . . C5 . . .', 'G5 . D5 . B4 . D5 . G5 ^ . . B5 . . .', 'A5 ^ ^ ^ . . E5 . C5 . A4 ^ ^ ^ . .'],
    harmony: [
      'E5 . . . C5 . . . A4 . . . C5 . . .', 'E5 . E5 . C5 . B4 . A4 ^ ^ ^ . . . .', 'C5 . F5 . A5 ^ . F5 . C5 . A4 . . . .', 'D5 . G5 . B5 ^ . G5 . D5 . B4 . . . .',
      REST, REST, REST, 'E5 ^ ^ ^ . . B4 . G#5 ^ ^ ^ . . . .',
      'G5 . C6 . E6 ^ ^ . C6 . G5 . E5 . . .', 'G5 . B5 . D6 ^ ^ . B5 . G5 . D5 . . .', 'F5 . A5 . C6 ^ ^ . A5 . F5 . C5 . . .', 'E5 . G#5 . B5 ^ ^ ^ . . . . . . . .',
      'E5 . C5 . A4 . C5 . E5 ^ . . C5 . . .', 'C5 . A4 . F4 . A4 . C5 ^ . . A4 . . .', 'D5 . B4 . G4 . B4 . D5 ^ . . G5 . . .', 'E5 ^ ^ ^ . . C5 . A4 . E4 ^ ^ ^ . .'] },
  stage: { bpm: 160, once: true, swing: 0, drums: 'half', chords: ['C', 'G'],
    lead: ['C5 . E5 . G5 . C6 ^ ^ ^ . . . . . .', 'D6 ^ ^ ^ ^ ^ ^ ^ . . . . . . . .'], harmony: ['E4 . G4 . C5 . E5 ^ ^ ^ . . . . . .', 'G5 ^ ^ ^ ^ ^ ^ ^ . . . . . . . .'] },
  over: { bpm: 150, once: true, swing: 0, drums: 'half', chords: ['Am', 'E'],
    lead: ['E5 . . . C5 . . . A4 ^ ^ ^ . . . .', 'G#4 ^ ^ ^ ^ ^ ^ ^ E4 ^ ^ ^ ^ ^ ^ ^'], harmony: ['C5 . . . A4 . . . E4 ^ ^ ^ . . . .', 'E4 ^ ^ ^ ^ ^ ^ ^ B3 ^ ^ ^ ^ ^ ^ ^'] },
  win: { bpm: 150, once: true, swing: 0, drums: 'bounce', chords: ['C', 'F', 'G', 'C'],
    lead: ['G5 . G5 . G5 . E5 . G5 . C6 ^ ^ ^ . .', 'A5 . A5 . A5 . F5 . A5 . C6 ^ ^ ^ . .', 'B5 . D6 . G6 ^ ^ ^ . . D6 . B5 . G5 .', 'C6 ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^'],
    harmony: ['E5 . E5 . E5 . C5 . E5 . G5 ^ ^ ^ . .', 'F5 . F5 . F5 . C5 . F5 . A5 ^ ^ ^ . .', 'G5 . B5 . D6 ^ ^ ^ . . B5 . G5 . D5 .', 'E6 ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^'] },
};
function buildTrack(song) {
  const bars = song.chords.length;
  const expand = (list, fallback) => { const out = []; for (let i = 0; i < bars; i++) { const b = list?.[i] ?? fallback; out.push(...(Array.isArray(b) ? b : bar(b))); } return out; };
  const groove = DRUMS[song.drums], fill = DRUMS[`${song.drums}Fill`] ?? groove;
  const drums = []; for (let i = 0; i < bars; i++) drums.push(...((i + 1) % 4 === 0 ? fill : groove));
  const arp = [], bass = [];
  song.chords.forEach((chord, i) => { arp.push(...arpBar(chord, i)); bass.push(...bassBar(chord, i % 8 >= 4 ? 1 : 0)); });
  return { bpm: song.bpm, swing: song.swing ?? 0, once: Boolean(song.once), lead: expand(song.lead, REST), harmony: expand(song.harmony, REST), arp, bass, drums };
}
export const TRACKS = Object.fromEntries(Object.entries(SONGS).map(([id, song]) => [id, buildTrack(song)]));

export function createMusic() {
  let context = null, master = null, echo = null, waves = {}, enabled = false, current = null, timer = null, nextTime = 0, step = 0, held = {}, unavailable = false;
  try { enabled = localStorage.getItem(KEY) === 'on'; } catch { /* no persistence */ }
  const pulseWave = duty => {
    const real = new Float32Array(48), imag = new Float32Array(48);
    for (let n = 1; n < 48; n++) real[n] = 2 * Math.sin(n * Math.PI * duty) / (n * Math.PI);
    return context.createPeriodicWave(real, imag, { disableNormalization: false });
  };
  // Create the graph synchronously; resuming is fire-and-forget because it only resolves after a user gesture.
  const ensure = () => {
    if (unavailable) return false;
    try {
      if (!context) {
        context = new AudioContext();
        master = context.createGain(); master.gain.value = .14;
        const tone = context.createBiquadFilter(); tone.type = 'lowpass'; tone.frequency.value = 6500;
        master.connect(tone); tone.connect(context.destination);
        echo = context.createDelay(.5); echo.delayTime.value = .19;
        const feedback = context.createGain(); feedback.gain.value = .22; const wet = context.createGain(); wet.gain.value = .35;
        echo.connect(feedback); feedback.connect(echo); echo.connect(wet); wet.connect(master);
        waves = { p25: pulseWave(.25), p12: pulseWave(.125), p50: pulseWave(.5) };
      }
      if (context.state !== 'running') context.resume().catch(() => {});
      return true;
    } catch { unavailable = true; return false; }
  };
  function voice({ wave, type }, frequency, time, duration, volume, { vibrato = false, echoSend = 0 } = {}) {
    const oscillator = context.createOscillator(), gain = context.createGain();
    if (wave) oscillator.setPeriodicWave(waves[wave]); else oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, time);
    if (vibrato) {
      const lfo = context.createOscillator(), depth = context.createGain();
      lfo.frequency.value = 6; depth.gain.value = frequency * .012; lfo.connect(depth); depth.connect(oscillator.frequency);
      lfo.start(time + .08); lfo.stop(time + duration + .02);
    }
    gain.gain.setValueAtTime(0, time); gain.gain.linearRampToValueAtTime(volume, time + .006);
    gain.gain.setValueAtTime(volume, time + Math.max(.01, duration * .55)); gain.gain.exponentialRampToValueAtTime(.001, time + duration);
    oscillator.connect(gain); gain.connect(master);
    if (echoSend) { const send = context.createGain(); send.gain.value = echoSend; gain.connect(send); send.connect(echo); }
    oscillator.start(time); oscillator.stop(time + duration + .03);
  }
  function drum(kind, time) {
    if (kind === 'k') {
      const oscillator = context.createOscillator(), gain = context.createGain();
      oscillator.type = 'triangle'; oscillator.frequency.setValueAtTime(150, time); oscillator.frequency.exponentialRampToValueAtTime(42, time + .11);
      gain.gain.setValueAtTime(1, time); gain.gain.exponentialRampToValueAtTime(.001, time + .13);
      oscillator.connect(gain); gain.connect(master); oscillator.start(time); oscillator.stop(time + .14); return;
    }
    const length = kind === 's' ? .1 : .03, buffer = context.createBuffer(1, Math.ceil(context.sampleRate * length), context.sampleRate), data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length) ** 1.5;
    const source = context.createBufferSource(), gain = context.createGain(), filter = context.createBiquadFilter();
    source.buffer = buffer; filter.type = kind === 's' ? 'bandpass' : 'highpass'; filter.frequency.value = kind === 's' ? 2200 : 7000; filter.Q.value = .7;
    gain.gain.value = kind === 's' ? .55 : .18;
    source.connect(filter); filter.connect(gain); gain.connect(master); source.start(time);
  }
  const CHANNELS = [
    ['lead', { wave: 'p25' }, .17, { vibrato: true, echoSend: .5 }],
    ['harmony', { wave: 'p12' }, .09, { vibrato: true, echoSend: .35 }],
    ['arp', { wave: 'p50' }, .045, { echoSend: .15 }],
    ['bass', { type: 'triangle' }, .32, {}],
  ];
  function playStep(track, index, time, stepDuration) {
    for (const [name, sound, volume, options] of CHANNELS) {
      const pattern = track[name]; if (!pattern) continue;
      const token = pattern[index % pattern.length];
      if (token === '.' || token === '^') continue;
      let length = 1; while (pattern[(index + length) % pattern.length] === '^' && length < 32) length++;
      voice(sound, noteFrequency(token), time, stepDuration * length * (name === 'arp' ? .8 : .95), volume, { ...options, vibrato: options.vibrato && length >= 3 });
    }
    const hit = track.drums?.[index % track.drums.length];
    if (hit && hit !== '.') drum(hit, time);
  }
  function stopTimer() { clearInterval(timer); timer = null; }
  function schedule(track) {
    stopTimer(); step = 0; nextTime = context.currentTime + .05;
    const stepDuration = 60 / track.bpm / 4, length = track.lead.length;
    timer = setInterval(() => {
      if (context.state !== 'running') { nextTime = context.currentTime + .05; return; }
      while (nextTime < context.currentTime + .15) {
        if (track.once && step >= length) { stopTimer(); if (held.after) { const next = held.after; held.after = null; schedule(next); } return; }
        const swing = step % 2 === 1 ? stepDuration * track.swing : 0;
        playStep(track, step, nextTime + swing, stepDuration); nextTime += stepDuration; step++;
        if (!track.once) step %= length;
      }
    }, 25);
  }
  const api = {
    get enabled() { return enabled; },
    get unavailable() { return unavailable; },
    toggle() {
      enabled = !enabled;
      try { localStorage.setItem(KEY, enabled ? 'on' : 'off'); } catch { /* fine */ }
      if (enabled) { if (!ensure()) { enabled = false; return false; } if (current && !api.paused) schedule(current); }
      else stopTimer();
      return enabled;
    },
    play(id) {
      current = TRACKS[id] ?? null;
      if (!enabled || !current || api.paused) return;
      if (!ensure()) return;
      schedule(current);
    },
    stop() { stopTimer(); current = null; },
    paused: false,
    pause() { api.paused = true; stopTimer(); },
    resume() { api.paused = false; if (enabled && current && master) schedule(current); },
    jingle(name) {
      if (!enabled || !ensure()) return;
      held.after = current; schedule(TRACKS[name]);
    },
  };
  return api;
}
