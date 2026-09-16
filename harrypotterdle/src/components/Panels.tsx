import { Modal } from "./Modal";
import { MODES, MODE_ORDER } from "../game/modes";
import type { House } from "../game/types";
import type { PlayKind, Stats } from "../state/useGame";

const HOUSES: House[] = ["Gryffindor", "Hufflepuff", "Ravenclaw", "Slytherin"];

export function HousePanel({ house, onPick, onClose }: { house: House | null; onPick: (h: House | null) => void; onClose: () => void }) {
  return (
    <Modal title="Choose your house" onClose={onClose}>
      <p>Purely cosmetic — it tags your stats and tints the header.</p>
      <div className="houses">
        {HOUSES.map((h) => (
          <button key={h} className="house-btn" aria-pressed={house === h} onClick={() => onPick(h)}>{h}</button>
        ))}
      </div>
      <p style={{ marginTop: 14 }}>
        <button className="btn ghost" onClick={() => onPick(null)}>No house, thanks</button>
      </p>
    </Modal>
  );
}

function pct(a: number, b: number) {
  return b === 0 ? "0%" : `${Math.round((a / b) * 100)}%`;
}

export function StatsPanel({
  stats, kind, onReset, onClose,
}: {
  stats: { daily: Record<string, Stats>; unlimited: Record<string, Stats> };
  kind: PlayKind;
  onReset: () => void;
  onClose: () => void;
}) {
  const bucket = stats[kind];
  const total = MODE_ORDER.reduce(
    (acc, m) => {
      const s = bucket[m];
      acc.played += s.played;
      acc.won += s.won;
      acc.guessesInWins += s.guessesInWins;
      acc.maxStreak = Math.max(acc.maxStreak, s.maxStreak);
      return acc;
    },
    { played: 0, won: 0, guessesInWins: 0, maxStreak: 0 },
  );

  return (
    <Modal title={kind === "daily" ? "Daily statistics" : "Unlimited statistics"} onClose={onClose}>
      <div className="statgrid">
        <div className="statbox"><b>{total.played}</b><span>played</span></div>
        <div className="statbox"><b>{pct(total.won, total.played)}</b><span>win rate</span></div>
        <div className="statbox"><b>{total.maxStreak}</b><span>best streak</span></div>
        <div className="statbox">
          <b>{total.won ? (total.guessesInWins / total.won).toFixed(1) : "—"}</b>
          <span>avg guesses</span>
        </div>
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ textAlign: "left", color: "var(--text-dim)", fontSize: "0.85rem" }}>
            <th style={{ padding: "6px 4px" }}>Mode</th>
            <th style={{ padding: "6px 4px" }}>Played</th>
            <th style={{ padding: "6px 4px" }}>Won</th>
            <th style={{ padding: "6px 4px" }}>Streak</th>
            <th style={{ padding: "6px 4px" }}>Best</th>
          </tr>
        </thead>
        <tbody>
          {MODE_ORDER.map((m) => (
            <tr key={m} style={{ borderTop: "1px solid var(--edge)" }}>
              <td style={{ padding: "8px 4px" }}>{MODES[m].label}</td>
              <td style={{ padding: "8px 4px" }}>{bucket[m].played}</td>
              <td style={{ padding: "8px 4px" }}>{bucket[m].won}</td>
              <td style={{ padding: "8px 4px" }}>{bucket[m].currentStreak}</td>
              <td style={{ padding: "8px 4px" }}>{bucket[m].maxStreak}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <p style={{ marginTop: 18 }}>
        <button className="btn ghost" onClick={onReset}>Reset all progress</button>
      </p>
    </Modal>
  );
}

export function InfoPanel({ onClose }: { onClose: () => void }) {
  return (
    <Modal title="How to play" onClose={onClose}>
      <ul>
        <li><b>Classic</b> — guess the character. Each guess fills a row comparing house, blood status, species, patronus and more against the answer.</li>
        <li><b>Quote</b> — a line is shown; work out who would say it.</li>
        <li><b>Spell</b> — a spell's effect is described; name the spell.</li>
        <li><b>Description</b> — a character is described without being named.</li>
        <li><b>Location</b> — a place is described; name it.</li>
      </ul>
      <p>
        Green means an exact match, amber means close or partially overlapping, red means wrong.
        Arrows on numeric columns point towards the answer.
      </p>
      <p>
        <b>Daily</b> gives everyone the same five puzzles, rolling over at 00:00 UTC, and keeps a streak.
        <b> Unlimited</b> deals a fresh puzzle whenever you want one, with its own separate stats — so practising
        never costs you a daily streak.
      </p>
      <p style={{ fontSize: "0.85rem", opacity: 0.8 }}>
        An unofficial fan game. All clue text in this build is original writing; character and spell attributes
        are drawn from the published books. Not affiliated with or endorsed by the rights holders.
      </p>
    </Modal>
  );
}
