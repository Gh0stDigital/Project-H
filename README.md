# Thoth

A lightweight, offline, portrait-mobile dungeon-crawling language-study RPG prototype, built for the
iPhone 14 Pro Max viewport (~430×932 CSS px) and responsive down to smaller phones.

Create vocabulary **Spellwords** → group them into **Spell Sets** → equip a set to your **Totem** →
configure a **Dungeon** → explore from a **Standby** hub, moving one turn at a time into weighted
random events (treasure, traps, magic rooms, rest areas, battles, direction forks) → answer
vocabulary prompts by assembling syllable tiles → find the **Boss Door** and the **Key** → break the
boss **Barrier** by using every word correctly → defeat the boss → review your **Results** and
long-term **Records**.

A run ends in exactly one of three ways: the boss falls, the Totem's HP hits 0 (costing one **Life
Point** — at zero the Totem is destroyed for good), or the player walks out.

No accounts, no network calls, no cloud sync — everything runs and saves locally in the browser.

## Running it

```bash
npm install
npm run dev       # local dev server
npm run build     # production build to dist/
npm run preview   # serve the production build locally
npm test          # unit tests
```

## Playing it offline

The game never talks to a server, but *loading* it still has to work with no
network at all. `npm run build` therefore emits three ways to launch it, and
each is verified to boot and play with the network hard-blocked:

| What | Use it when |
| --- | --- |
| `dist/index.html` | You can copy the whole `dist/` folder. Open the file directly — no server needed. Code is inlined; art sits alongside as ordinary files. |
| `dist/thoth-offline.html` | You want **one file**. Every image is embedded as a data URI, so it cannot lose its art (~10 MB). Mail it to yourself, drop it on a USB stick, open it anywhere. |
| `dist/sw.js` | The build is *hosted* over http(s), or added to a phone's home screen. The service worker precaches the whole app on first visit, so later launches never touch the network. |

Two things make the from-disk cases work, and both are load-bearing:

- **`vite.config.ts` builds an IIFE, not an ES module.** Module scripts are
  CORS-checked, and a page opened over `file://` has a null origin — so a
  `type="module"` build is blocked outright and the app never boots. This was
  the actual cause of "it won't open without internet": a blank page and a CORS
  error in the console.
- **`scripts/bundle-offline.mjs` inlines that bundle** into the HTML as a plain
  `<script>` at the end of `<body>`, so there is no separate file left to fetch
  and nothing left to block.

### If it opens to a white screen

The build no longer fails silently. Whatever you see tells you what happened:

| On screen | Meaning |
| --- | --- |
| The game | Working. |
| *"JavaScript is turned off"* | The page rendered but scripting is disabled. **On iPhone this is what the Files app preview looks like** — it displays HTML but does not run JavaScript, so a JS app can never start there. Open the file in a real browser instead. |
| *"Starting Thoth…"*, stuck | The page loaded but the bundle never executed. |
| *"Thoth could not start"* + an error | The bundle ran and threw. The error text is on screen — that's the thing to report. |
| Genuinely blank | The file itself didn't load. Check it downloaded completely (it's ~10 MB). |

The iPhone Files-app preview is the common one, and it is a limitation of that
preview, not of the build. `<noscript>`, a boot placeholder and a global error
handler live in `index.html` ahead of the bundle so that none of these states
can present as an unexplained white page.

On a phone, the single-file `thoth-offline.html` is the most reliable option —
*provided it is opened in something that runs JavaScript*. Adding a hosted copy
to the home screen is the most dependable route of all, but it has to be opened
online once so the service worker can precache.

## Art

Every PNG under `public/assets/<category>/` is registered automatically —
`scripts/gen-asset-manifest.mjs` scans the folder and writes
`src/config/assetManifest.ts`. Drop a file in, run `npm run gen:assets` (it
also runs on install and before every build), and it is selectable in game.
There is no list to update by hand.

Placeholders are generated for any slot that has no file yet, and are never
overwritten — committing real artwork over one is permanent.

### Dungeon backdrops

`public/assets/locations/` holds the dungeon art, mapped to situations by
`src/config/scenes.ts`. The backdrop is chosen per event, so it changes every
time the player moves.

| File | Used for |
| --- | --- |
| `dkp_entrance` | The dungeon setup screen |
| `dkp_corridor1`, `dkp_corridor2` | Standby between events; also stands in for encounters and traps |
| `dkp_treasureRoom` | Treasure events |
| `dkp_trapRoom1` | Traps |
| `dkp_battle` | Ordinary battles |
| `dkp_bossBattle` | The boss door and the boss fight |
| `dkp_restRoom` | Rest areas |
| `dkp_shrineRoom` | Magic rooms; also traps and encounters |
| `dkp_keyRoom` | The Key Room, and some treasure rooms |
| `dkp_2way` | Direction forks |

Where a situation lists more than one option, the room the event is about
shows about two thirds of the time and an alternate the rest, so the dungeon
varies without the backdrop looking wrong. Lookups ignore case and separators
(`dkp_keyRoom` = `dkp-keyroom`), and anything missing falls back to the run's
`locationKey` rather than breaking.

> **Note on size.** This art is ~34 MB at full resolution, which makes the
> single-file `dist/thoth-offline.html` about 52 MB. That is fine from a
> desktop but heavy for a phone download. Downscaling the PNGs to roughly
> 1290px wide (3x the 430px viewport) would cut it dramatically with no
> visible loss.

## Project structure

Gameplay logic is kept independent of presentation wherever practical:

```
src/
  config/       Balance formulas & tunable constants (balance.ts), dungeon
                event weights / Direction modifiers / per-event balance
                (dungeonEvents.ts), item catalog + drop rates (items.ts),
                local asset registry with placeholder fallback (assets.ts) —
                no numeric constant lives inside a component or system.
  domain/       Plain data types: Spell, SpellSet, Totem, DungeonConfig/Run,
                Challenge, Battle (deck/plateau/timer), Settings.
  systems/      Pure, UI-free logic modules:
                  spellFactory / spellProgression / spellCompendium — Spell
                    CRUD, leveling, charge, damage & reward formulas.
                  spellSetManager, totemManager — Set & Totem CRUD.
                  deck.ts — battle-deck ordering (Spell IDs only, no vocab).
                  answerChecker.ts — normalized answer comparison, no AI.
                  eventGenerator.ts — weighted random events, anti-repeat.
                  eventContent.ts — static per-event-type flavor/asset data.
                  challengeEngine.ts — prompt generation + grading.
                  dungeonState.ts — the dungeon state machine: which states
                    exist and which transitions are legal. The single
                    authority on what the player may do right now.
                  dungeonSession.ts — run orchestration: turns, events,
                    modifiers, key/door tracking, rewards, run stats.
                  directionModifiers.ts — temporary Direction weight biases
                    (add / tick / expire / apply, floored at 0).
                  wordStats.ts — per-run vocabulary tracking, separate from
                    a Spell's lifetime counters.
                  hangman.ts — the Magic Room syllable puzzle.
                  restArea.ts — rest healing, price curve, affordability.
                  runResults.ts — builds the end-of-run report (derives
                    only; grants nothing).
                  battleEngine.ts — turn-based attack/defense state machine,
                    multi-prompt enemy attacks, mimics, barrier access.
                  bossPlateau.ts — boss Barrier requirement tracking.
                  totemManager.ts — Totem CRUD, HP, and Life Points.
                  records.ts — Records screen sort/filter selectors.
                  persistence.ts — storage abstraction (swap the adapter to
                    change where saves live) + versioned save/load.
                  offlineCache.ts — registers the service worker when the app
                    is served over http(s); a no-op from disk.
  state/        Zustand stores that call into systems/ and hold state:
                  persistentStore.ts — Compendium, Sets, Totems, Settings
                    (autosaved to localStorage via systems/persistence.ts).
                  dungeonStore.ts — transient dungeon run + battle state.
                  uiStore.ts — top-level screen navigation.
  ui/
    components/ Shared presentational components (SpellCard, Bar, TypewriterText,
                TotemPanel, ProgressMeter, AssetImage, SlidePanel, TopBar).
    screens/    MainMenu, Compendium, Totem, Records, and Dungeon —
                DungeonScreen routes to config / ExploreView / BattleView /
                ResultsView; ExploreView in turn renders whichever event
                view the run's state calls for (StandbyActions,
                MagicRoomView, RestAreaView, EventActionViews).
    styles/     Single global stylesheet (dark theme, system fonts only —
                no network font loads).
scripts/
  bundle-offline.mjs     Post-build step: inlines the JS bundle into
                         dist/index.html as a classic script, emits the
                         all-in-one dist/thoth-offline.html, and generates
                         dist/sw.js. Runs as part of `npm run build`.
  gen-placeholders.mjs   Fills in any missing placeholder PNG under
                         public/assets (no external deps — hand-rolled PNG
                         encoder). Runs automatically via `npm install`'s
                         postinstall hook, or manually with `npm run
                         gen:assets`. Never overwrites a file that already
                         exists, so replacing a placeholder with real
                         artwork is permanent.
public/assets/           Local art, committed to the repo, one folder per
                         replaceable slot: locations, events, traps,
                         treasure, totems, enemies, bosses, battlebg,
                         spells. Drop a real PNG in with the matching
                         filename to replace a placeholder — no code
                         changes needed, and it won't be regenerated over.
```

## Notes on scope

- Vocabulary is never semantically validated — a Spell's Korean/English text is only checked against
  the player's own saved answer(s) (trim + English case-insensitive). No AI, dictionary, or
  translation API is used anywhere.
- Vocabulary answers are assembled from tiles rather than typed, so a correct recall can never be
  rejected for a typo and no keyboard ever opens mid-dungeon. The Magic Room's Hangman follows the
  same rule: guesses are tapped from a grid of candidate syllable blocks.
- Only the 10-Word Dungeon tier is exercised end-to-end in this prototype; 25/50-word tiers reuse the
  same systems with a higher `wordLimit` in `config/balance.ts`.
- Rewards are credited at the moment they are earned, during the run. The Results screen only
  *reports* — re-rendering or reopening it can never grant anything twice.
- Dungeon runs are transient (in-memory) by design; Spell/Totem/Set progression and Records persist
  across reloads via `localStorage`.
