import { CHARACTERS, CHARACTERS_BY_ID } from "../data/characters";
import { PLACES, PLACES_BY_ID } from "../data/places";
import { QUOTES } from "../data/quotes";
import { SPELLS, SPELLS_BY_ID } from "../data/spells";
import { bookTitle, compareCharacter, comparePlace, compareSpell, CHARACTER_COLUMNS, PLACE_COLUMNS, SPELL_COLUMNS } from "./compare";
import { hashString } from "./rng";
import type { GuessRow, ModeId } from "./types";

export interface Hint {
  /** Unlocks once the player has made this many guesses. */
  after: number;
  label: string;
  /** Short glyph shown on the locked tile. */
  glyph: string;
  reveal: (answerId: string) => string;
}

export interface SearchItem {
  id: string;
  name: string;
  /** Lowercased name + aliases, for matching. */
  terms: string[];
}

export interface ModeDef {
  id: ModeId;
  label: string;
  heading: string;
  prompt: string;
  placeholder: string;
  /** Column headings for the guess table. First column is the answer's name. */
  columns: readonly string[];
  /** Every id that can be the answer, in a stable order. */
  answerIds: string[];
  /** Everything the player is allowed to type. */
  search: SearchItem[];
  /** The clue shown above the input, if this mode has one. */
  clue: (answerId: string) => string | null;
  /** Small caption under the clue, e.g. "Who said this?" */
  clueKicker: string | null;
  compare: (guessId: string, answerId: string) => GuessRow | null;
  displayName: (answerId: string) => string;
  /** Optional drop-in art for the end screen. Undefined renders initials instead. */
  portrait: (answerId: string) => string | undefined;
  hints: Hint[];
}

const charSearch: SearchItem[] = CHARACTERS.map((c) => ({
  id: c.id,
  name: c.name,
  terms: [c.name, ...c.aliases].map((t) => t.toLowerCase()),
}));

const charName = (id: string) => CHARACTERS_BY_ID.get(id)?.name ?? id;

const CHARACTER_HINTS: Hint[] = [
  {
    after: 3,
    label: "Dead or alive",
    glyph: "†",
    reveal: (id) => (CHARACTERS_BY_ID.get(id)?.alive ? "Still alive" : "Dead"),
  },
  {
    after: 7,
    label: "Occupation",
    glyph: "?",
    reveal: (id) => CHARACTERS_BY_ID.get(id)?.occupation ?? "Unknown",
  },
];

export const MODES: Record<ModeId, ModeDef> = {
  classic: {
    id: "classic",
    label: "Classic",
    heading: "Classic Mode",
    prompt: "Guess today's character!",
    placeholder: "Enter a character name or alias…",
    columns: CHARACTER_COLUMNS,
    answerIds: CHARACTERS.map((c) => c.id),
    search: charSearch,
    clue: () => null,
    clueKicker: null,
    displayName: charName,
    portrait: (id) => CHARACTERS_BY_ID.get(id)?.image,
    compare: (g, a) => {
      const guess = CHARACTERS_BY_ID.get(g);
      const answer = CHARACTERS_BY_ID.get(a);
      return guess && answer ? compareCharacter(guess, answer) : null;
    },
    hints: CHARACTER_HINTS,
  },

  quote: {
    id: "quote",
    label: "Quote",
    heading: "Quote Mode",
    prompt: "Guess today's character from the line!",
    placeholder: "Enter a character name or alias…",
    columns: CHARACTER_COLUMNS,
    // Only characters that actually have a line attached can be the answer.
    answerIds: [...new Set(QUOTES.map((q) => q.speakerId))],
    search: charSearch,
    clueKicker: "Who would say this?",
    clue: (id) => {
      const lines = QUOTES.filter((q) => q.speakerId === id);
      if (!lines.length) return null;
      // Stable per-speaker choice so the clue never changes mid-game.
      return `“${lines[hashString(id) % lines.length].line}”`;
    },
    displayName: charName,
    portrait: (id) => CHARACTERS_BY_ID.get(id)?.image,
    compare: (g, a) => {
      const guess = CHARACTERS_BY_ID.get(g);
      const answer = CHARACTERS_BY_ID.get(a);
      return guess && answer ? compareCharacter(guess, answer) : null;
    },
    hints: [
      {
        after: 4,
        label: "Book",
        glyph: "?",
        reveal: (id) => {
          const line = QUOTES.find((q) => q.speakerId === id);
          return line ? bookTitle(line.firstBook) : "Unknown";
        },
      },
      ...CHARACTER_HINTS,
    ],
  },

  spell: {
    id: "spell",
    label: "Spell",
    heading: "Spell Mode",
    prompt: "Guess today's spell from the description!",
    placeholder: "Enter a spell name…",
    columns: SPELL_COLUMNS,
    answerIds: SPELLS.map((s) => s.id),
    search: SPELLS.map((s) => ({
      id: s.id,
      name: s.name,
      terms: [s.name, ...s.aliases].map((t) => t.toLowerCase()),
    })),
    clueKicker: "Which spell is being described?",
    clue: (id) => {
      const spell = SPELLS_BY_ID.get(id);
      return spell ? `“${spell.effect}”` : null;
    },
    displayName: (id) => SPELLS_BY_ID.get(id)?.name ?? id,
    portrait: () => undefined,
    compare: (g, a) => {
      const guess = SPELLS_BY_ID.get(g);
      const answer = SPELLS_BY_ID.get(a);
      return guess && answer ? compareSpell(guess, answer) : null;
    },
    hints: [
      { after: 4, label: "Where it appears", glyph: "?", reveal: (id) => SPELLS_BY_ID.get(id)?.mentions ?? "Unknown" },
      { after: 8, label: "Spell type", glyph: "✦", reveal: (id) => SPELLS_BY_ID.get(id)?.type ?? "Unknown" },
    ],
  },

  description: {
    id: "description",
    label: "Description",
    heading: "Description Mode",
    prompt: "Find out which character is being described",
    placeholder: "Enter a character name or alias…",
    columns: CHARACTER_COLUMNS,
    answerIds: CHARACTERS.map((c) => c.id),
    search: charSearch,
    clueKicker: "Which character is being described?",
    clue: (id) => {
      const c = CHARACTERS_BY_ID.get(id);
      return c ? `“${c.description}”` : null;
    },
    displayName: charName,
    portrait: (id) => CHARACTERS_BY_ID.get(id)?.image,
    compare: (g, a) => {
      const guess = CHARACTERS_BY_ID.get(g);
      const answer = CHARACTERS_BY_ID.get(a);
      return guess && answer ? compareCharacter(guess, answer) : null;
    },
    hints: [
      { after: 2, label: "Book", glyph: "?", reveal: (id) => bookTitle(CHARACTERS_BY_ID.get(id)?.firstBook ?? 1) },
      { after: 5, label: "Occupation", glyph: "☖", reveal: (id) => CHARACTERS_BY_ID.get(id)?.occupation ?? "Unknown" },
    ],
  },

  location: {
    id: "location",
    label: "Location",
    heading: "Location Mode",
    prompt: "Find the place being described!",
    placeholder: "Enter a place name…",
    columns: PLACE_COLUMNS,
    answerIds: PLACES.map((p) => p.id),
    search: PLACES.map((p) => ({
      id: p.id,
      name: p.name,
      terms: [p.name, ...p.aliases].map((t) => t.toLowerCase()),
    })),
    clueKicker: "Which location is being described?",
    clue: (id) => {
      const p = PLACES_BY_ID.get(id);
      return p ? `“${p.description}”` : null;
    },
    displayName: (id) => PLACES_BY_ID.get(id)?.name ?? id,
    portrait: () => undefined,
    compare: (g, a) => {
      const guess = PLACES_BY_ID.get(g);
      const answer = PLACES_BY_ID.get(a);
      return guess && answer ? comparePlace(guess, answer) : null;
    },
    hints: [
      { after: 5, label: "Book", glyph: "?", reveal: (id) => bookTitle(PLACES_BY_ID.get(id)?.firstBook ?? 1) },
      { after: 10, label: "Region", glyph: "◎", reveal: (id) => PLACES_BY_ID.get(id)?.region ?? "Unknown" },
      { after: 15, label: "Where in the story", glyph: "?", reveal: (id) => PLACES_BY_ID.get(id)?.chapterHint ?? "Unknown" },
    ],
  },
};

export const MODE_ORDER: ModeId[] = ["classic", "quote", "spell", "description", "location"];

/** The mode the site nudges you towards next, as the win screen does. */
export function nextMode(current: ModeId): ModeId {
  const i = MODE_ORDER.indexOf(current);
  return MODE_ORDER[(i + 1) % MODE_ORDER.length];
}
