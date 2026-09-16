import { create } from "zustand";
import { persist } from "zustand/middleware";
import { BRAND } from "../config";
import { previousDay, puzzleDay } from "../game/daily";
import { MODES, MODE_ORDER } from "../game/modes";
import { pickBySeed, pickRandom } from "../game/rng";
import type { House, ModeId } from "../game/types";

/** Daily is one shared puzzle per UTC day. Unlimited is an endless private queue. */
export type PlayKind = "daily" | "unlimited";

export interface Session {
  answerId: string;
  /** Guessed ids, newest first (matching how the table renders). */
  guesses: string[];
  status: "playing" | "won" | "revealed";
}

export interface Stats {
  played: number;
  won: number;
  currentStreak: number;
  maxStreak: number;
  /** Total guesses across won games, for an average. */
  guessesInWins: number;
  /** Only used by daily, to decide whether a streak survived. */
  lastWinDay?: string;
}

const emptyStats = (): Stats => ({
  played: 0, won: 0, currentStreak: 0, maxStreak: 0, guessesInWins: 0,
});

const blankSession = (answerId: string): Session => ({ answerId, guesses: [], status: "playing" });

/** Deterministic: everyone in the world gets the same daily answer. */
function dailyAnswer(mode: ModeId, day: string): string {
  return pickBySeed(MODES[mode].answerIds, `${BRAND.storageKey}|${mode}|${day}`);
}

/** Unlimited: avoid repeating anything still in the recent-history window. */
function unlimitedAnswer(mode: ModeId, seen: string[]): string {
  const ids = MODES[mode].answerIds;
  const recent = new Set(seen.slice(0, Math.floor(ids.length * 0.6)));
  return pickRandom(ids, (id) => recent.has(id));
}

type ByMode<T> = Record<ModeId, T>;

const byMode = <T,>(make: (m: ModeId) => T): ByMode<T> =>
  Object.fromEntries(MODE_ORDER.map((m) => [m, make(m)])) as ByMode<T>;

interface GameState {
  mode: ModeId;
  kind: PlayKind;
  house: House | null;
  /** Hides yesterday's answer and any other spoiler text. */
  spoilerFree: boolean;

  /** The UTC puzzle day the stored daily sessions belong to. */
  day: string;
  daily: ByMode<Session>;
  unlimited: ByMode<Session>;
  /** Recently used unlimited answers per mode, newest first. */
  seen: ByMode<string[]>;
  stats: { daily: ByMode<Stats>; unlimited: ByMode<Stats> };

  setMode: (mode: ModeId) => void;
  setKind: (kind: PlayKind) => void;
  setHouse: (house: House | null) => void;
  toggleSpoilerFree: () => void;
  /** Returns false when the guess was a duplicate or unknown. */
  submitGuess: (id: string) => boolean;
  giveUp: () => void;
  /** Unlimited only: deal a fresh puzzle immediately. */
  nextPuzzle: () => void;
  /** Re-seeds daily sessions when the UTC day has turned over. */
  syncDay: () => void;
  resetEverything: () => void;
}

const initialDay = puzzleDay();

export const useGame = create<GameState>()(
  persist(
    (set, get) => ({
      mode: "classic",
      kind: "daily",
      house: null,
      spoilerFree: false,

      day: initialDay,
      daily: byMode((m) => blankSession(dailyAnswer(m, initialDay))),
      unlimited: byMode((m) => blankSession(unlimitedAnswer(m, []))),
      seen: byMode(() => []),
      stats: { daily: byMode(emptyStats), unlimited: byMode(emptyStats) },

      setMode: (mode) => set({ mode }),
      setKind: (kind) => set({ kind }),
      setHouse: (house) => set({ house }),
      toggleSpoilerFree: () => set((s) => ({ spoilerFree: !s.spoilerFree })),

      syncDay: () => {
        const today = puzzleDay();
        if (get().day === today) return;
        set((s) => {
          // A daily left unfinished breaks the streak for that mode.
          const stats = { ...s.stats, daily: { ...s.stats.daily } };
          for (const m of MODE_ORDER) {
            if (s.daily[m].status === "playing" && s.daily[m].guesses.length > 0) {
              stats.daily[m] = { ...stats.daily[m], played: stats.daily[m].played + 1, currentStreak: 0 };
            } else if (s.daily[m].status !== "won" && stats.daily[m].lastWinDay !== s.day) {
              stats.daily[m] = { ...stats.daily[m], currentStreak: 0 };
            }
          }
          return {
            day: today,
            daily: byMode((m) => blankSession(dailyAnswer(m, today))),
            stats,
          };
        });
      },

      submitGuess: (id) => {
        const { mode, kind } = get();
        const def = MODES[mode];
        if (!def.answerIds.includes(id) && !def.search.some((s) => s.id === id)) return false;

        const bucket = kind === "daily" ? "daily" : "unlimited";
        const session = get()[bucket][mode];
        if (session.status !== "playing" || session.guesses.includes(id)) return false;

        const guesses = [id, ...session.guesses];
        const won = id === session.answerId;
        const next: Session = { ...session, guesses, status: won ? "won" : "playing" };

        set((s) => {
          const stats = { ...s.stats[bucket] };
          if (won) {
            const prev = stats[mode];
            const day = s.day;
            // A daily streak continues only if the last win was yesterday.
            const continues =
              bucket === "unlimited" || prev.lastWinDay === previousDay(day) || prev.lastWinDay === day;
            const currentStreak = continues ? prev.currentStreak + 1 : 1;
            stats[mode] = {
              ...prev,
              played: prev.played + 1,
              won: prev.won + 1,
              guessesInWins: prev.guessesInWins + guesses.length,
              currentStreak,
              maxStreak: Math.max(prev.maxStreak, currentStreak),
              lastWinDay: bucket === "daily" ? day : prev.lastWinDay,
            };
          }
          return {
            [bucket]: { ...s[bucket], [mode]: next },
            stats: { ...s.stats, [bucket]: stats },
          } as Partial<GameState>;
        });
        return true;
      },

      giveUp: () => {
        const { mode, kind } = get();
        const bucket = kind === "daily" ? "daily" : "unlimited";
        if (get()[bucket][mode].status !== "playing") return;
        set((s) => {
          const stats = { ...s.stats[bucket] };
          const prev = stats[mode];
          stats[mode] = { ...prev, played: prev.played + 1, currentStreak: 0 };
          return {
            [bucket]: { ...s[bucket], [mode]: { ...s[bucket][mode], status: "revealed" } },
            stats: { ...s.stats, [bucket]: stats },
          } as Partial<GameState>;
        });
      },

      nextPuzzle: () => {
        const { mode } = get();
        set((s) => {
          const seen = [s.unlimited[mode].answerId, ...s.seen[mode]].slice(0, 200);
          return {
            kind: "unlimited",
            seen: { ...s.seen, [mode]: seen },
            unlimited: { ...s.unlimited, [mode]: blankSession(unlimitedAnswer(mode, seen)) },
          };
        });
      },

      resetEverything: () => {
        const today = puzzleDay();
        set({
          day: today,
          daily: byMode((m) => blankSession(dailyAnswer(m, today))),
          unlimited: byMode((m) => blankSession(unlimitedAnswer(m, []))),
          seen: byMode(() => []),
          stats: { daily: byMode(emptyStats), unlimited: byMode(emptyStats) },
        });
      },
    }),
    {
      name: BRAND.storageKey,
      version: 1,
      // Rehydrating on a new day must not resurrect yesterday's puzzle.
      onRehydrateStorage: () => (state) => state?.syncDay(),
    },
  ),
);

/** The session currently on screen. */
export function activeSession(s: GameState): Session {
  return s.kind === "daily" ? s.daily[s.mode] : s.unlimited[s.mode];
}

export function activeStats(s: GameState): Stats {
  return s.stats[s.kind][s.mode];
}

/** Yesterday's daily answer for the current mode — used for the spoiler line. */
export function yesterdayAnswer(mode: ModeId, day: string): string {
  return dailyAnswer(mode, previousDay(day));
}
