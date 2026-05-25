import { useGame } from "../state/gameStore";
import type { AskedQuestion } from "../game/types";

function summarize(q: AskedQuestion): string {
  switch (q.type) {
    case "matching":
      return `Match — ${q.categoryKey} = ${q.seekerAnchorName ?? "?"} → ${q.answer.toUpperCase()}`;
    case "radar":
      return `Radar — within ${q.radiusMi} mi? → ${q.answer.toUpperCase()}`;
    case "thermometer":
      return `Thermometer — ${q.answer === "hotter" ? "🔥 hotter" : "❄️ colder"} at end pin`;
    case "measuring":
      return `Measure — ${q.categoryKey} → ${q.answer.toUpperCase()} (${q.seekerNearestDistanceMi.toFixed(2)} mi)`;
    case "tentacle":
      return `Tentacle — ${q.promptKey} → ${q.nearestPoiName ?? q.nearestPoiId}`;
    case "photo":
      return `Photo — ${q.promptLabel}`;
  }
}

export default function QuestionHistory() {
  const history = useGame((s) => s.history);
  const undoLast = useGame((s) => s.undoLast);

  if (history.length === 0) return <div className="qhist__empty">No questions yet.</div>;

  return (
    <ul className="qhist">
      {[...history].reverse().map((q, idx) => {
        const isLast = idx === 0;
        return (
          <li key={q.id} className="qhist__item">
            <span className="qhist__text">{summarize(q)}</span>
            {isLast && (
              <button className="qhist__undo" onClick={undoLast} aria-label="Undo last">
                Undo
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}
