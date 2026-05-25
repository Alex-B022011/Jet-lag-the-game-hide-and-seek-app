import { useState } from "react";
import Map, { type ComposingPreview } from "./components/Map";
import QuestionForm, { type PendingPhotoCallback } from "./components/QuestionForm";
import QuestionHistory from "./components/QuestionHistory";
import StatsBar from "./components/StatsBar";
import SeekerLocation from "./components/SeekerLocation";
import GameSizeToggle from "./components/GameSizeToggle";
import { useGame } from "./state/gameStore";
import "./styles.css";
import type { LatLng } from "./game/types";

type Panel = "ask" | "history" | "stats";

export default function App() {
  const [preview, setPreview] = useState<ComposingPreview>(null);
  const [panel, setPanel] = useState<Panel>("ask");
  const [sheetOpen, setSheetOpen] = useState(true);
  const [lassoCb, setLassoCb] = useState<PendingPhotoCallback | null>(null);
  const setPickMode = useGame((s) => s.setPickMode);
  const reset = useGame((s) => s.reset);

  const startLasso = (cb: PendingPhotoCallback) => {
    setLassoCb(() => cb);
    setPickMode("lasso");
    setSheetOpen(false);
  };
  const cancelLasso = () => {
    setLassoCb(null);
    setPickMode("seeker");
  };
  const completeLasso = (verts: LatLng[]) => {
    if (lassoCb) lassoCb(verts);
    setLassoCb(null);
    setPickMode("seeker");
  };

  return (
    <div className="app">
      <div className="app__map">
        <Map
          preview={preview}
          lassoActive={lassoCb !== null}
          onLassoComplete={completeLasso}
          onLassoCancel={cancelLasso}
        />
      </div>

      <div className="app__topbar">
        <GameSizeToggle />
        <SeekerLocation />
      </div>

      <div className={`sheet ${sheetOpen ? "is-open" : "is-peek"}`}>
        <button
          className="sheet__handle"
          onClick={() => setSheetOpen((v) => !v)}
          aria-label={sheetOpen ? "Collapse panel" : "Expand panel"}
        >
          <span className="sheet__grip" />
        </button>

        <div className="sheet__tabs">
          {(["ask", "history", "stats"] as const).map((p) => (
            <button
              key={p}
              className={`sheet__tab ${panel === p ? "is-active" : ""}`}
              onClick={() => {
                setPanel(p);
                setSheetOpen(true);
              }}
            >
              {p === "ask" ? "Ask" : p === "history" ? "History" : "Stats"}
            </button>
          ))}
          <button
            className="sheet__reset"
            onClick={() => {
              if (confirm("Reset the round? This clears all questions.")) reset();
            }}
          >
            Reset
          </button>
        </div>

        <div className="sheet__body">
          {panel === "ask" && <QuestionForm onPreviewChange={setPreview} onStartLasso={startLasso} />}
          {panel === "history" && <QuestionHistory />}
          {panel === "stats" && <StatsBar />}
        </div>
      </div>
    </div>
  );
}
