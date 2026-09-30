# Devoxx Reboot

**Three robots. One opening night.** A 2D platform adventure through Devoxx at Kinepolis Antwerp, made for the [Devoxx Belgium Robot Games](https://game.devoxx.be/game.html).

The cinema has gone dark just before the keynote. Voxxy, Droid and Biggy are always on stage together: you control one, the other two follow, and everything in the building reacts to how much each robot weighs. Get the crew from the front doors to the keynote room and bring the big screen back to life.

## Run

Node.js **22 or newer**:

```sh
npm ci
npm start
```

Open **http://localhost:5173**. Use `PORT=5174 npm start` if that port is occupied. The server only listens on your local computer. No accounts, database or API keys are needed to play.

## Play

Pick a starting robot with the crew cards and press **Let’s save the show**. The stage list on the intro screen unlocks as you clear stages.

| Control | Action |
| --- | --- |
| A / D or left / right | Move |
| Space / W / up | Jump; hold for a higher leap |
| E | Robot ability, terminal, exit door or projector |
| 1 / 2 / 3 (main keys or keypad) | Switch to Voxxy / Droid / Biggy, where that robot stands |
| R | Return the crew to the last checkpoint |
| Escape | Pause / resume |

Touch controls appear on small or coarse-pointer screens. The fullscreen button gives the game more room. Sound and music are separate toggles in the header and are off until you turn them on.

### The crew

Switching never teleports: you take over the robot where it is. The other two follow you along the ground, jump small obstacles, and are fetched through a service hatch if they fall behind or into a pit. A robot doing a job (lying down as a bridge, holding a plate, waiting where it was thrown) stays put until you switch back to it.

| Robot | Mass | What it does |
| --- | --- | --- |
| **Voxxy** | 1 | Fast, double jump, dash. Bounces high on seat springs. The only one light enough to cross Droid’s bridge and delicate enough to handle the projector lens. |
| **Droid** | 2 | Hacks blue terminals. Press E anywhere else and Droid lies down as a three-tile bridge. Pushes cases slowly. |
| **Biggy** | 5 | Slow to start, hard to stop. Charges through heavy cases and cleaning bots, pushes cases fast, breaks weak gratings, and throws whoever is standing on his back. |

### Mass is the rule

- **Pressure plates** show the weight they need. Voxxy standing on Droid weighs 3. Biggy alone weighs 5. A pushed flight case weighs 3.
- **Weak gratings** collapse under Biggy only.
- **Seat springs** launch light robots high and barely move Biggy.
- **Droid’s bridge** carries Voxxy but buckles when Biggy steps on it.
- **Biggy’s launch**: stand on Biggy, switch to him and press E. The rider is thrown across gaps nobody could jump.
- **Sentry bolts** shove Voxxy hard and barely move Biggy, and a charging Biggy shrugs them off.

### Enemies

- **Cleaning bots** patrol the floor. Jump on them or charge through them with Biggy.
- **Sentry projectors** sit on walls and fire slow bolts. Jump the bolts, duck under the high ones, stomp a sentry as Voxxy or charge it as Biggy.
- **Swoopers** perch above the corridor and the auditorium and dive when you come close, then fly back to their perch. Stomp or charge them like bots.

One energy bar for the whole crew, so switching robots never refills it. Every hit flashes the robot red, shakes the HUD bar and knocks the crew back; the bar turns red on the last cell. Losing all three cells, falling off the stage, or pressing R sends the crew back to the last checkpoint with every item kept, and costs one of three lives. With no lives left the stage shows GAME OVER and can be tried again with a fresh crew.

### Stages

1. **Arrival** — the evening frontage and registration desks. Learn to move, stack and launch, and let Biggy hold the heavy plate.
2. **The exhibition hall** — columns, booths and orange ceiling light. Push a case onto a plate, smash the marked power case with Biggy, and stack Voxxy on Droid to open the far shutter.
3. **The grand staircase** — climb to the auditorium level, bridge the broken landing with Droid, cross the corridor of fourteen numbered doors and reconnect the power link.
4. **The opening keynote** — bounce Voxxy up the seating tiers to the projector lens, then finish with all three robots at once: Biggy holds the stage plate, Droid connects the projector terminal, Voxxy restarts the show.

Golden sparks add to your score, checkpoints recharge the crew, each stage gives you three lives, and stage results keep a personal best on this device.

## Technology

- **Phaser 3.90.0**, pinned: Arcade Physics, tilemaps, sprite animation, input and scrolling camera.
- **JavaScript ES modules**: pure rules (`src/adventure/rules.js`), crew AI (`crew.js`), mass mechanics (`mechanics.js`), stage data (`stages/`), a Web Audio chiptune sequencer (`music.js`) and the Phaser scene (`main.js`).
- **HTML / CSS**: page UI, stage select, crew status chips, dialogs and touch controls.
- **Canvas-generated tiles and sprite sheets**: original robot drawings, 48 px modular cinema geometry, plates, gratings, springs and cases.
- **Illustrated panorama**: one foyer backdrop image in `assets/`.
- **Web Audio API**: synthesized effects and music; no audio files. The music is a five-channel chiptune sequencer: two pulse leads with real 25 and 12.5 percent duty cycles, a pulse arpeggio, a triangle bass and noise drums, with swing, echo and vibrato. Each stage has its own 16-bar tune.
- **Node.js**: local static server, built-in unit tests, headless Chrome smoke test and static build script.

Everything runs in the browser. The local server serves the installed Phaser distribution as `/vendor/phaser.js`; no CDN is required at runtime.

## Checks and build

```sh
npm test               # rules, stage validation, music patterns
npm run test:browser   # keep the development server running in another terminal
npm run build
```

The Node tests cover the mass rules (stack mass, plates, gratings, springs, pushing, bridge buckling, launch, follower decisions), validate every stage’s tile data (ground under spawns and checkpoints, two tiles of headroom everywhere, plate targets, bounds) and check the music patterns. The browser script uses installed Chrome through its debugging protocol, with no browser-test npm dependency: it drives all four stages end to end in the real Phaser simulation, including the launch, the case push, the stacked plate, the bridge and its buckling, follower recall, the spring climb and the three-robot finale, then checks music, replay, mobile layout and the console.

The browser script defaults to Google Chrome’s macOS installation path. Set `CHROME_PATH` for another Chromium executable and optionally `GAME_URL` for a different URL. Screenshots are written to ignored `artifacts/`.

`npm run build` creates **`dist/`**, including Phaser and its license notices. It is a plain static site: publish that directory on any static host (GitHub Pages, Netlify, a plain web server).

## Files

- `src/adventure/rules.js` — pure gameplay rules, unit tested.
- `src/adventure/crew.js` — the three robots: switching, following, stacking, recall.
- `src/adventure/mechanics.js` — plates, doors, gratings, springs, cases, Droid’s bridge, Biggy’s launch, mission fixtures.
- `src/adventure/stages/` — one data module per stage plus the tile builder.
- `src/adventure/music.js` — chiptune sequencer and patterns.
- `src/adventure/main.js` — Phaser scene, stage flow, HUD, dialogs and audio toggles.
- `src/adventure/art.js` — procedural sprite sheets, tiles, props and per-stage scenery.

The earlier recording/replay prototype remains at **[rehearsal.html](rehearsal.html)** with its own scripts in `src/`. The platform adventure is the game.

## Status and license

Playable local development version. The stages are stylized side elevations of the venue, not a survey: the frontage, exhibition hall, grand staircase, the corridor of auditoriums 1 to 14 and the largest auditorium follow the official plan and photographs, while plates, gratings, springs and cases are invented.

Original code is MIT licensed. Phaser and its dependency notices are in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). Competition character designs, venue names and reference material retain their respective rights.
