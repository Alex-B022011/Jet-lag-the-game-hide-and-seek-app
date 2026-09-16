import { BRAND } from "../config";

const DAY_MS = 86_400_000;

/**
 * The puzzle day, as YYYY-MM-DD in UTC, shifted by the configured rollover hour.
 * With rolloverHourUTC = 0 this is simply today's UTC date.
 */
export function puzzleDay(now: Date = new Date()): string {
  const shifted = new Date(now.getTime() - BRAND.rolloverHourUTC * 3_600_000);
  return shifted.toISOString().slice(0, 10);
}

/** The previous puzzle day, used for the "yesterday's answer" line. */
export function previousDay(day: string): string {
  return new Date(Date.parse(`${day}T00:00:00Z`) - DAY_MS).toISOString().slice(0, 10);
}

/** Milliseconds until the next rollover. */
export function msUntilRollover(now: Date = new Date()): number {
  const shifted = new Date(now.getTime() - BRAND.rolloverHourUTC * 3_600_000);
  const nextMidnight = Date.UTC(
    shifted.getUTCFullYear(),
    shifted.getUTCMonth(),
    shifted.getUTCDate() + 1,
  );
  return nextMidnight - shifted.getTime();
}

export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = String(Math.floor(total / 3600)).padStart(2, "0");
  const m = String(Math.floor((total % 3600) / 60)).padStart(2, "0");
  const s = String(total % 60).padStart(2, "0");
  return `${h}:${m}:${s}`;
}
