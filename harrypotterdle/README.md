# Wizardle

A daily *and* unlimited wizarding guessing game, in the shape of the daily-guessing
puzzles: five modes, a colour-coded attribute grid, staged hints, streaks and stats.

The difference from the site it's modelled on: **every mode has an Unlimited track**
alongside the daily one, with its own separate statistics, so practising never costs
you a daily streak.

## Running it

```bash
cd harrypotterdle
npm install
npm run dev       # http://localhost:5173
npm run build     # production build into dist/
npm run preview   # serve the built files
```

Deploying under a sub-path (GitHub Pages, say):

```bash
BASE_PATH=/your-repo/wizardle/ npm run build
```

## Modes

| Mode | Clue | Guess |
|---|---|---|
| Classic | none — deduce from the grid | a character |
| Quote | a line in someone's voice | who'd say it |
| Spell | what the spell does | the spell |
| Description | a character described | the character |
| Location | a place described | the place |

Grid colours: **green** exact, **amber** close or partially overlapping (used for
multi-value columns like Affiliations, and for numbers within a threshold), **red**
wrong. Numeric columns get a ▲/▼ pointing towards the answer.

## Daily vs Unlimited

**Daily** — one shared puzzle per mode per UTC day, seeded from the date so everyone
gets the same answer. Rolls over at 00:00 UTC. Missing a day resets that mode's streak.

**Unlimited** — a fresh random puzzle on demand, with a recent-answers window so you
don't see the same one twice in quick succession. Separate stats, separate streak.

Rollover hour lives in `src/config.ts` if you'd rather it wasn't midnight UTC.

## Adding or editing content

Everything lives in `src/data/`, as plain TypeScript arrays checked against the
interfaces in `src/game/types.ts`:

- `characters.ts` — attributes plus a `description` used as the Description-mode clue
- `spells.ts` — `effect` is the Spell-mode clue
- `places.ts` — `description` is the Location-mode clue
- `quotes.ts` — lines keyed to a `speakerId`

Add an entry and it's immediately in rotation for both daily and unlimited. Adding to
`aliases` widens what the autocomplete accepts.

### Artwork

Character records have an optional `image` field, unset by default. Drop image files
into `public/portraits/` and point `image` at them (e.g. `/portraits/name.jpg`) to get
thumbnails in the guess grid and a portrait on the win screen. Without it the game
falls back to initials, which is why it ships with no art.

### Rebranding

`src/config.ts` holds the title, tagline, rollover hour and the localStorage key.
Changing `storageKey` wipes everyone's saved progress, which is the intended way to
force a reset after a breaking data change.

## Notes on content

This is an unofficial fan project. All clue text — descriptions, spell effects, place
descriptions and the lines in Quote mode — is **original writing for this game**;
nothing is copied from the books or films, and the Quote-mode lines are invented
rather than quoted. Attribute data (house, species, patronus, blood status, first
appearance) is factual. No franchise artwork or marks are included, which is why the
icons are generic line art and the portrait slots ship empty.

Not affiliated with, endorsed by, or connected to the rights holders.
