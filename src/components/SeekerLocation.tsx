import * as turf from "@turf/turf";
import type { Feature, MultiPolygon, Polygon } from "geojson";
import { useGame } from "../state/gameStore";
import { BOROUGHS } from "../data/datasets";

function boroughAt(lat: number, lng: number): string | null {
  for (const f of BOROUGHS.features) {
    if (turf.booleanPointInPolygon([lng, lat], f as Feature<Polygon | MultiPolygon>)) {
      return (f.properties as { name?: string })?.name ?? null;
    }
  }
  return null;
}

export default function SeekerLocation() {
  const seeker = useGame((s) => s.seekerPin);
  const setSeeker = useGame((s) => s.setSeeker);

  const locate = () => {
    if (!("geolocation" in navigator)) {
      alert("Geolocation not available. Tap the map to drop a pin.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setSeeker({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => {
        console.warn(err);
        alert(`Couldn't get location (${err.message}). Tap the map to drop a pin.`);
      },
      { enableHighAccuracy: true, timeout: 8000 },
    );
  };

  const borough = seeker ? boroughAt(seeker.lat, seeker.lng) : null;
  const label = !seeker
    ? "Locate me"
    : borough
      ? borough
      : "Out of zone";

  return (
    <button className="locate" onClick={locate} title="Use my current location">
      📍 {label}
    </button>
  );
}
