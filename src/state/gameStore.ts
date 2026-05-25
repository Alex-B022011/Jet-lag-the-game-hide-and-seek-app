import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AskedQuestion, GameSize, LatLng, PossibleArea } from "../game/types";
import { applyQuestion, buildHidingZone, replayHistory } from "../game/eliminate";

type GameState = {
  size: GameSize;
  seekerPin: LatLng | null;
  history: AskedQuestion[];
  possibleArea: PossibleArea;

  setSize: (s: GameSize) => void;
  setSeeker: (p: LatLng | null) => void;
  askQuestion: (q: AskedQuestion) => void;
  undoLast: () => void;
  reset: () => void;
};

const initialArea = buildHidingZone();

export const useGame = create<GameState>()(
  persist(
    (set, get) => ({
      size: "M",
      seekerPin: null,
      history: [],
      possibleArea: initialArea,

      setSize: (s) => set({ size: s }),
      setSeeker: (p) => set({ seekerPin: p }),
      askQuestion: (q) => {
        const next = applyQuestion(get().possibleArea, q);
        set({ history: [...get().history, q], possibleArea: next });
      },
      undoLast: () => {
        const history = get().history.slice(0, -1);
        set({ history, possibleArea: replayHistory(history) });
      },
      reset: () => set({ history: [], possibleArea: buildHidingZone() }),
    }),
    {
      name: "jetlag-nyc-seeker-v1",
      partialize: (s) => ({ size: s.size, seekerPin: s.seekerPin, history: s.history }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.possibleArea = replayHistory(state.history);
        }
      },
    },
  ),
);
