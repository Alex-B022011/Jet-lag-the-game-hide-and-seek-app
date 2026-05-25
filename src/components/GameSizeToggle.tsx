import { useGame } from "../state/gameStore";
import type { GameSize } from "../game/types";

const SIZES: GameSize[] = ["S", "M", "L"];
const LABELS: Record<GameSize, string> = { S: "Small", M: "Medium", L: "Large" };

export default function GameSizeToggle() {
  const size = useGame((s) => s.size);
  const setSize = useGame((s) => s.setSize);

  return (
    <div className="sizes" role="radiogroup" aria-label="Game size">
      {SIZES.map((s) => (
        <button
          key={s}
          className={`sizes__btn ${size === s ? "is-active" : ""}`}
          onClick={() => setSize(s)}
          aria-checked={size === s}
          role="radio"
          title={LABELS[s]}
        >
          {s}
        </button>
      ))}
    </div>
  );
}
