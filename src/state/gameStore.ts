import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AskedQuestion, GameSize, LatLng, PossibleArea } from "../game/types";
import { applyQuestion, buildHidingZone, replayHistory } from "../game/eliminate";

export type PickMode = "seeker" | "thermometer-end" | "lasso";

type GameState = {
  size: GameSize;
  seekerPin: LatLng | null;
  thermometerEnd: LatLng | null;
  pickMode: PickMode;
  history: AskedQuestion[];
  possibleArea: PossibleArea;

  setSize: (s: GameSize) => void;
  setSeeker: (p: LatLng | null) => void;
  setThermometerEnd: (p: LatLng | null) => void;
  setPickMode: (m: PickMode) => void;
  handleMapClick: (p: LatLng) => void;
  askQuestion: (q: AskedQuestion) => void;
  undoLast: () => void;
  reset: () => void;
};

const initialArea = buildHidingZone();

// Pre-question area snapshots (parallel to history, in-memory only) so undo
// is a pop instead of replaying every question. After a page reload the stack
// is empty and undo falls back to replayHistory.
const areaSnapshots: PossibleArea[] = [];

export const useGame = create<GameState>()(
  persist(
    (set, get) => ({
      size: "M",
      seekerPin: null,
      thermometerEnd: null,
      pickMode: "seeker",
      history: [],
      possibleArea: initialArea,

      setSize: (s) => set({ size: s }),
      setSeeker: (p) => set({ seekerPin: p }),
      setThermometerEnd: (p) => set({ thermometerEnd: p }),
      setPickMode: (m) => set({ pickMode: m }),
      handleMapClick: (p) => {
        const mode = get().pickMode;
        if (mode === "thermometer-end") {
          set({ thermometerEnd: p, pickMode: "seeker" });
        } else if (mode === "lasso") {
          // The LassoTool owns its own click stream; ignore.
        } else {
          set({ seekerPin: p });
        }
      },
      askQuestion: (q) => {
        const prev = get().possibleArea;
        const next = applyQuestion(prev, q);
        areaSnapshots.push(prev);
        set({ history: [...get().history, q], possibleArea: next });
      },
      undoLast: () => {
        const history = get().history.slice(0, -1);
        const prev = areaSnapshots.pop();
        set({ history, possibleArea: prev ?? replayHistory(history) });
      },
      reset: () => {
        areaSnapshots.length = 0;
        set({ history: [], possibleArea: buildHidingZone() });
      },
    }),
    {
      name: "jetlag-nyc-seeker-v1",
      partialize: (s) => ({
        size: s.size,
        seekerPin: s.seekerPin,
        thermometerEnd: s.thermometerEnd,
        history: s.history,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.possibleArea = replayHistory(state.history);
        }
      },
    },
  ),
);
