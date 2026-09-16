import { CLOSE_THRESHOLDS } from "../config";
import type { Cell, Character, GuessRow, Place, Spell } from "./types";

function exact(label: string, guess: string, answer: string): Cell {
  return { label, value: guess, state: guess === answer ? "hit" : "miss" };
}

/** Multi-value columns: green on an identical set, amber on any overlap. */
function overlap(label: string, guess: string[], answer: string[]): Cell {
  const g = new Set(guess);
  const a = new Set(answer);
  const shared = [...g].filter((v) => a.has(v));
  const state: Cell["state"] =
    shared.length === g.size && g.size === a.size ? "hit" : shared.length > 0 ? "close" : "miss";
  return { label, value: guess.length ? guess.join(" • ") : "None", state };
}

/** Numeric columns: green on equal, amber within the threshold, plus an arrow. */
function numeric(
  label: string,
  guess: number | null,
  answer: number | null,
  closeWithin: number,
  render: (n: number) => string = String,
): Cell {
  if (guess === null || answer === null) {
    return { label, value: guess === null ? "Unknown" : render(guess), state: guess === answer ? "hit" : "miss" };
  }
  if (guess === answer) return { label, value: render(guess), state: "hit" };
  return {
    label,
    value: render(guess),
    state: Math.abs(guess - answer) <= closeWithin ? "close" : "miss",
    direction: answer > guess ? "up" : "down",
  };
}

const BOOK_TITLES = [
  "Philosopher's Stone",
  "Chamber of Secrets",
  "Prisoner of Azkaban",
  "Goblet of Fire",
  "Order of the Phoenix",
  "Half-Blood Prince",
  "Deathly Hallows",
];

export const bookTitle = (n: number): string => BOOK_TITLES[n - 1] ?? `Book ${n}`;

export const CHARACTER_COLUMNS = [
  "Character", "Gender", "Blood", "Born", "House", "Species", "Patronus", "Affiliations", "First Appearance",
] as const;

export function compareCharacter(guess: Character, answer: Character): GuessRow {
  return {
    id: guess.id,
    name: guess.name,
    image: guess.image,
    correct: guess.id === answer.id,
    cells: [
      exact("Gender", guess.gender, answer.gender),
      exact("Blood", guess.blood, answer.blood),
      numeric("Born", guess.born, answer.born, CLOSE_THRESHOLDS.bornYear),
      exact("House", guess.house, answer.house),
      exact("Species", guess.species, answer.species),
      exact("Patronus", guess.patronus, answer.patronus),
      overlap("Affiliations", guess.affiliations, answer.affiliations),
      numeric("First Appearance", guess.firstBook, answer.firstBook, CLOSE_THRESHOLDS.firstBook, bookTitle),
    ],
  };
}

export const SPELL_COLUMNS = ["Spell", "Type", "Light", "First Appearance"] as const;

export function compareSpell(guess: Spell, answer: Spell): GuessRow {
  return {
    id: guess.id,
    name: guess.name,
    correct: guess.id === answer.id,
    cells: [
      exact("Type", guess.type, answer.type),
      exact("Light", guess.light, answer.light),
      numeric("First Appearance", guess.firstBook, answer.firstBook, CLOSE_THRESHOLDS.firstBook, bookTitle),
    ],
  };
}

export const PLACE_COLUMNS = ["Location", "Kind", "Region", "First Appearance"] as const;

export function comparePlace(guess: Place, answer: Place): GuessRow {
  return {
    id: guess.id,
    name: guess.name,
    correct: guess.id === answer.id,
    cells: [
      exact("Kind", guess.kind, answer.kind),
      exact("Region", guess.region, answer.region),
      numeric("First Appearance", guess.firstBook, answer.firstBook, CLOSE_THRESHOLDS.firstBook, bookTitle),
    ],
  };
}
