import { useEffect, useMemo, useRef } from "react";
import { MapContainer, TileLayer, GeoJSON, Marker, useMap, useMapEvents, Circle, Polyline } from "react-leaflet";
import LassoTool from "./LassoTool";
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
  | { kind: "thermometer" }
  | { kind: "tentacle"; center: LatLng; radiusMi: number }
  | null;

type Props = {
  preview: ComposingPreview;
  lassoActive: boolean;
  onLassoComplete: (vertices: LatLng[]) => void;
  onLassoCancel: () => void;
};

function MapClickHandler() {
  const handleMapClick = useGame((s) => s.handleMapClick);
  useMapEvents({
    click(e) {
      handleMapClick({ lat: e.latlng.lat, lng: e.latlng.lng });
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

export default function Map({ preview, lassoActive, onLassoComplete, onLassoCancel }: Props) {
  const possibleArea = useGame((s) => s.possibleArea);
  const seekerPin = useGame((s) => s.seekerPin);
  const thermometerEnd = useGame((s) => s.thermometerEnd);
  const pickMode = useGame((s) => s.pickMode);
  const historyLen = useGame((s) => s.history.length);

  // Compute the eliminated area = hidingZone − possibleArea
  const eliminatedArea = useMemo<Feature<Polygon | MultiPolygon> | null>(() => {
    const zone = buildHidingZone();
    const diff = turf.difference(turf.featureCollection([zone, possibleArea]));
    return diff as Feature<Polygon | MultiPolygon> | null;
  }, [possibleArea]);

  // Key layers by question count: a bbox-based key missed interior
  // eliminations (bbox unchanged → layer never redrew).
  const areaKey = historyLen;

  return (
    <>
    {pickMode === "thermometer-end" && (
      <div className="pickmode-hint">Tap the map to set the END pin</div>
    )}
    <MapContainer
      center={NYC_CENTER}
      zoom={11}
      style={{ height: "100%", width: "100%" }}
      zoomControl={false}
      preferCanvas
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
      />
      <FitOnce />
      <MapClickHandler />

      {/* Hiding zone outline */}
      <GeoJSON
        data={BOROUGHS}
        style={{ color: "#0f766e", weight: 1.5, fillOpacity: 0, dashArray: "4 4", opacity: 0.7 }}
      />

      {/* Possible area (green) */}
      <GeoJSON
        key={`p-${areaKey}`}
        data={possibleArea as any}
        style={{ color: "#34d399", weight: 1.5, fillColor: "#10b981", fillOpacity: 0.22 }}
      />

      {/* Eliminated area (dark overlay) */}
      {eliminatedArea && (
        <GeoJSON
          key={`e-${areaKey}`}
          data={eliminatedArea as any}
          style={{ color: "#0f172a", weight: 0, fillColor: "#0f172a", fillOpacity: 0.55 }}
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
      {preview?.kind === "thermometer" && thermometerEnd && seekerPin && (
        <>
          <Marker position={[thermometerEnd.lat, thermometerEnd.lng]} />
          <Polyline
            positions={[
              [seekerPin.lat, seekerPin.lng],
              [thermometerEnd.lat, thermometerEnd.lng],
            ]}
            pathOptions={{ color: "#d2691e", weight: 3, dashArray: "6 4" }}
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

      <LassoTool active={lassoActive} onComplete={onLassoComplete} onCancel={onLassoCancel} />
    </MapContainer>
    </>
  );
}
