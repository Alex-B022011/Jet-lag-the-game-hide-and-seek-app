import * as turf from "@turf/turf";
import { useMemo } from "react";
import { useGame } from "../state/gameStore";
import { buildHidingZone } from "../game/eliminate";

const KM2_PER_MI2 = 1 / 2.589988;

export default function StatsBar() {
  const possibleArea = useGame((s) => s.possibleArea);
  const history = useGame((s) => s.history);

  const { remainingMi2, totalMi2 } = useMemo(() => {
    const zone = buildHidingZone();
    const total = turf.area(zone) / 1e6; // km²
    let remaining = 0;
    try {
      remaining = turf.area(possibleArea) / 1e6;
    } catch {
      remaining = 0;
    }
    return {
      totalMi2: total * KM2_PER_MI2,
      remainingMi2: remaining * KM2_PER_MI2,
    };
  }, [possibleArea]);

  const pct = totalMi2 > 0 ? (1 - remainingMi2 / totalMi2) * 100 : 0;

  return (
    <div className="stats">
      <div className="stats__row">
        <span>Possible</span>
        <strong>{remainingMi2.toFixed(2)} mi²</strong>
      </div>
      <div className="stats__row">
        <span>Eliminated</span>
        <strong>{pct.toFixed(1)}%</strong>
      </div>
      <div className="stats__row">
        <span>Questions asked</span>
        <strong>{history.length}</strong>
      </div>
    </div>
  );
}
