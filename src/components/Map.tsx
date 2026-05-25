import { useEffect, useMemo, useRef } from "react";
import { MapContainer, TileLayer, GeoJSON, Marker, useMap, useMapEvents, Circle, Polyline } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import * as turf from "@turf/turf";
import type { Feature, MultiPolygon, Polygon } from "geojson";
import { useGame } from "../state/gameStore";
import { BOROUGHS } from "../data/datasets";
import { buildHidingZone } from "../game/eliminate";
import type { LatLng } from "../game/types";

// Fix default marker icons in Leaflet when bundled by Vite
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const NYC_CENTER: [number, number] = [40.72, -73.95];

export type ComposingPreview =
  | { kind: "radar"; center: LatLng; radiusMi: number }
  | { kind: "thermometer"; start: LatLng; end: LatLng }
  | { kind: "tentacle"; center: LatLng; radiusMi: number }
  | null;

type Props = {
  preview: ComposingPreview;
};

function SeekerClickHandler() {
  const setSeeker = useGame((s) => s.setSeeker);
  useMapEvents({
    click(e) {
      setSeeker({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

function FitOnce() {
  const map = useMap();
  const did = useRef(false);
  useEffect(() => {
    if (did.current) return;
    did.current = true;
    const [w, s, e, n] = turf.bbox(BOROUGHS);
    map.fitBounds([
      [s, w],
      [n, e],
    ]);
  }, [map]);
  return null;
}

export default function Map({ preview }: Props) {
  const possibleArea = useGame((s) => s.possibleArea);
  const seekerPin = useGame((s) => s.seekerPin);

  // Compute the eliminated area = hidingZone − possibleArea
  const eliminatedArea = useMemo<Feature<Polygon | MultiPolygon> | null>(() => {
    const zone = buildHidingZone();
    const diff = turf.difference(turf.featureCollection([zone, possibleArea]));
    return diff as Feature<Polygon | MultiPolygon> | null;
  }, [possibleArea]);

  // Use keys so GeoJSON layers rerender on geometry change
  const possibleKey = useMemo(() => JSON.stringify(turf.bbox(possibleArea)), [possibleArea]);
  const eliminatedKey = useMemo(() => (eliminatedArea ? JSON.stringify(turf.bbox(eliminatedArea)) : "none"), [eliminatedArea]);

  return (
    <MapContainer center={NYC_CENTER} zoom={11} style={{ height: "100%", width: "100%" }} zoomControl={false}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitOnce />
      <SeekerClickHandler />

      {/* Hiding zone outline */}
      <GeoJSON
        data={BOROUGHS}
        style={{ color: "#0b3d2e", weight: 2, fillOpacity: 0, dashArray: "4 4" }}
      />

      {/* Possible area (green) */}
      <GeoJSON
        key={`p-${possibleKey}`}
        data={possibleArea as any}
        style={{ color: "#1b7a3e", weight: 1, fillColor: "#3fb96a", fillOpacity: 0.18 }}
      />

      {/* Eliminated area (gray) */}
      {eliminatedArea && (
        <GeoJSON
          key={`e-${eliminatedKey}`}
          data={eliminatedArea as any}
          style={{ color: "#222", weight: 0, fillColor: "#222", fillOpacity: 0.55 }}
        />
      )}

      {/* Seeker pin */}
      {seekerPin && (
        <Marker
          position={[seekerPin.lat, seekerPin.lng]}
          draggable
          eventHandlers={{
            dragend: (e) => {
              const p = (e.target as L.Marker).getLatLng();
              useGame.getState().setSeeker({ lat: p.lat, lng: p.lng });
            },
          }}
        />
      )}

      {/* Composing-question previews */}
      {preview?.kind === "radar" && (
        <Circle
          center={[preview.center.lat, preview.center.lng]}
          radius={preview.radiusMi * 1609.344}
          pathOptions={{ color: "#1d6cf5", weight: 2, fillOpacity: 0.05, dashArray: "5 5" }}
        />
      )}
      {preview?.kind === "thermometer" && (
        <>
          <Marker position={[preview.start.lat, preview.start.lng]} />
          <Marker position={[preview.end.lat, preview.end.lng]} />
          <Polyline
            positions={[
              [preview.start.lat, preview.start.lng],
              [preview.end.lat, preview.end.lng],
            ]}
            pathOptions={{ color: "#d2691e", weight: 3 }}
          />
        </>
      )}
      {preview?.kind === "tentacle" && (
        <Circle
          center={[preview.center.lat, preview.center.lng]}
          radius={preview.radiusMi * 1609.344}
          pathOptions={{ color: "#9b2fbc", weight: 2, fillOpacity: 0.05, dashArray: "5 5" }}
        />
      )}
    </MapContainer>
  );
}
