import { useGame } from "../state/gameStore";

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

  return (
    <button className="locate" onClick={locate} title="Use my current location">
      📍 {seeker ? `${seeker.lat.toFixed(4)}, ${seeker.lng.toFixed(4)}` : "Locate me"}
    </button>
  );
}
