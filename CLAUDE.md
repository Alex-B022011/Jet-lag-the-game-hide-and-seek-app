# Working notes for this repo

## Always give the run command

Whenever work in this repo is delivered, **end the reply with the terminal
command to run it.** Not a description of where the file is — the actual
copy-pasteable command. This is a standing request from the repo owner.

For Wizardle that is:

```bash
./play.sh
```

## What's in here

Two unrelated projects share this repo:

- **Jet Lag hide & seek app** — the Vite/React app at the repo root
  (`src/`, `index.html`, `vite.config.ts`). Deployed to GitHub Pages by
  `.github/workflows/`. Run with `npm run dev`.
- **Wizardle** — `wizardle.html`, a single self-contained file. All CSS and
  JS inline, no build step, no dependencies, no server. Launch with
  `./play.sh`.

Don't let changes to one leak into the other.

## Wizardle content rules

All clue text — character descriptions, spell effects, place descriptions,
and the lines in Quote mode — is original writing for this game. Nothing is
copied from the books or films, and the Quote-mode lines are invented to fit
a speaker rather than quoted. Keep it that way when adding entries.

Attribute values (house, blood, species, patronus, birth year, first
appearance) are factual. Where the books never establish one, record it as
`"Unknown"` or `null` rather than guessing — the comparison treats two
unknowns as a match, so accuracy there matters to gameplay.

No franchise artwork or marks. Icons are generic line art; `image` fields on
characters are empty by default and read from `public/portraits/` if you
supply your own.
