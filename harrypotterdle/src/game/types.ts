export type ModeId = "classic" | "quote" | "spell" | "description" | "location";

export type House = "Gryffindor" | "Hufflepuff" | "Ravenclaw" | "Slytherin" | "None";

export type Blood =
  | "Pure-blood"
  | "Half-blood"
  | "Muggle-born"
  | "Muggle"
  | "Squib"
  | "Unknown";

export interface Character {
  id: string;
  name: string;
  /** Alternative spellings, nicknames and titles accepted by the input. */
  aliases: string[];
  gender: "Male" | "Female" | "Other";
  blood: Blood;
  /** Year of birth. null when unrecorded. */
  born: number | null;
  house: House;
  species: string;
  patronus: string;
  affiliations: string[];
  /** Book number in which the character first appears (1-7). */
  firstBook: number;
  alive: boolean;
  occupation: string;
  /** Original clue written for Description mode. Never a book excerpt. */
  description: string;
  /** Optional drop-in portrait. Put a file in public/portraits/ and set the path. */
  image?: string;
}

export interface Spell {
  id: string;
  name: string;
  aliases: string[];
  /** Original one-line clue written for Spell mode. */
  effect: string;
  type: "Charm" | "Curse" | "Jinx" | "Hex" | "Transfiguration" | "Counter-spell" | "Healing";
  light: string;
  firstBook: number;
  /** Where in the story it turns up — revealed as a hint. */
  mentions: string;
}

export interface Place {
  id: string;
  name: string;
  aliases: string[];
  /** Original clue written for Location mode. Never a book excerpt. */
  description: string;
  region: string;
  kind: "School" | "Shop" | "Home" | "Institution" | "Wilderness" | "Transport" | "Village";
  firstBook: number;
  chapterHint: string;
}

export interface QuoteLine {
  id: string;
  /** Original paraphrase of a moment, written in-voice. Not a transcription. */
  line: string;
  speakerId: string;
  firstBook: number;
}

/** Result of comparing one attribute of a guess against the answer. */
export type CellState = "hit" | "close" | "miss";

export interface Cell {
  label: string;
  value: string;
  state: CellState;
  /** Set for numeric columns when the answer is higher/lower than the guess. */
  direction?: "up" | "down";
}

export interface GuessRow {
  id: string;
  name: string;
  image?: string;
  cells: Cell[];
  correct: boolean;
}
