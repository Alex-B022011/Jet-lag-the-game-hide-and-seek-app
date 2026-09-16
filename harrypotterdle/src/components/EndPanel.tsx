import { useEffect, useState } from "react";
import { formatCountdown, msUntilRollover } from "../game/daily";
import { MODE_ICONS } from "./Icons";
import { MODES, nextMode } from "../game/modes";
import type { ModeId } from "../game/types";
import type { PlayKind } from "../state/useGame";

interface Props {
  won: boolean;
  kind: PlayKind;
  mode: ModeId;
  answerName: string;
  guessCount: number;
  portrait?: string;
  onNextPuzzle: () => void;
  onGoToMode: (mode: ModeId) => void;
}

export function EndPanel({ won, kind, mode, answerName, guessCount, portrait, onNextPuzzle, onGoToMode }: Props) {
  const [left, setLeft] = useState(() => msUntilRollover());

  useEffect(() => {
    if (kind !== "daily") return;
    const t = window.setInterval(() => setLeft(msUntilRollover()), 1000);
    return () => window.clearInterval(t);
  }, [kind]);

  const upcoming = nextMode(mode);
  const NextIcon = MODE_ICONS[upcoming];
  const initials = answerName.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();

  return (
    <section className="end">
      <h2>{won ? "You win!" : "Out of luck"}</h2>

      <div className="end-portrait">
        {portrait ? <img src={portrait} alt="" /> : <span aria-hidden="true">{initials}</span>}
      </div>

      <p className="end-label">{kind === "daily" ? "Today's answer was:" : "The answer was:"}</p>
      <p className="end-answer">{answerName}</p>
      {won && <p className="end-label">Solved in {guessCount} {guessCount === 1 ? "guess" : "guesses"}.</p>}

      {kind === "daily" ? (
        <>
          <p className="end-label">Next puzzle in:</p>
          <p className="countdown">{formatCountdown(left)}</p>
          <p className="end-label">(00:00 UTC)</p>
          <div className="end-actions">
            <button className="btn" onClick={onNextPuzzle}>Keep playing — Unlimited</button>
          </div>
          <div className="next-mode">
            <p className="end-label">Next mode:</p>
            <button className="mode" onClick={() => onGoToMode(upcoming)}>
              <span className="mode-disc"><NextIcon /></span>
              <span className="mode-label">{MODES[upcoming].label}</span>
            </button>
          </div>
        </>
      ) : (
        <div className="end-actions">
          <button className="btn" onClick={onNextPuzzle}>Next puzzle →</button>
          <button className="btn ghost" onClick={() => onGoToMode(upcoming)}>Try {MODES[upcoming].label}</button>
        </div>
      )}
    </section>
  );
}
