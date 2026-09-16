/**
 * Single place to rebrand. Change these and the whole UI follows.
 */
export const BRAND = {
  /** Shown in the header. Two words render in alternating weight. */
  title: "Wizardle",
  tagline: "Guess the daily character, spell, and place!",
  /** Daily puzzles roll over at this UTC hour. */
  rolloverHourUTC: 0,
  /** localStorage namespace. Bump to wipe everyone's saved progress. */
  storageKey: "wizardle.v1",
};

/** How close a numeric guess must be to earn a "close" (amber) cell. */
export const CLOSE_THRESHOLDS = {
  bornYear: 10,
  firstBook: 1,
};
