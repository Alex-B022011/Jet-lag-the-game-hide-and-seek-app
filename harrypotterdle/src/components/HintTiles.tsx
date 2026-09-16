import type { Hint } from "../game/modes";

interface Props {
  hints: Hint[];
  guessCount: number;
  answerId: string;
  /** Once the game is over there is nothing left to hide. */
  revealAll: boolean;
}

export function HintTiles({ hints, guessCount, answerId, revealAll }: Props) {
  if (!hints.length) return null;
  return (
    <div className="hints">
      {hints.map((hint) => {
        const unlocked = revealAll || guessCount >= hint.after;
        const remaining = hint.after - guessCount;
        return (
          <div key={hint.label} className={`hint${unlocked ? " unlocked" : ""}`}>
            <span className="hint-glyph">{hint.glyph}</span>
            {unlocked ? (
              <>
                <span>{hint.label}</span>
                <span className="hint-value">{hint.reveal(answerId)}</span>
              </>
            ) : (
              <span>
                {hint.label} in {remaining} {remaining === 1 ? "guess" : "guesses"}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
