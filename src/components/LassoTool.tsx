import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useMap, useMapEvents, Polygon as LeafletPolygon } from "react-leaflet";
import L from "leaflet";
import type { LatLng } from "../game/types";

type Props = {
  active: boolean;
  onComplete: (vertices: LatLng[]) => void;
  onCancel: () => void;
};

/**
 * A simple click-to-add-vertex lasso. Tap each corner of the area you want to
 * eliminate; tap the "Finish" button (rendered by the parent) when done. Tap
 * the first vertex again to close. Designed for fingers, not mice.
 */
export default function LassoTool({ active, onComplete, onCancel }: Props) {
  const map = useMap();
  const [verts, setVerts] = useState<LatLng[]>([]);
  const finishRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!active) setVerts([]);
  }, [active]);

  // Suppress the global map click handler while lasso is active.
  useEffect(() => {
    if (active) {
      const container = map.getContainer();
      container.style.cursor = "crosshair";
      return () => {
        container.style.cursor = "";
      };
    }
  }, [active, map]);

  useMapEvents({
    click(e) {
      if (!active) return;
      // Stop the seeker-pin handler from firing.
      L.DomEvent.stopPropagation(e as unknown as Event);
      L.DomEvent.preventDefault(e as unknown as Event);
      setVerts((v) => [...v, { lat: e.latlng.lat, lng: e.latlng.lng }]);
    },
  });

  if (!active) return null;

  return (
    <>
      {verts.length > 0 && (
        <LeafletPolygon
          positions={verts.map((v) => [v.lat, v.lng])}
          pathOptions={{ color: "#d2691e", weight: 2, fillColor: "#d2691e", fillOpacity: 0.2, dashArray: "4 4" }}
        />
      )}
      {createPortal(
        <div className="lasso-bar">
          <span className="lasso-bar__count">{verts.length} pts</span>
          <button
            className="lasso-bar__btn"
            onClick={(e) => {
              e.preventDefault();
              setVerts((v) => v.slice(0, -1));
            }}
            disabled={verts.length === 0}
          >
            Undo pt
          </button>
          <button
            className="lasso-bar__btn lasso-bar__btn--primary"
            ref={finishRef}
            onClick={(e) => {
              e.preventDefault();
              if (verts.length >= 3) onComplete(verts);
            }}
            disabled={verts.length < 3}
          >
            Eliminate area
          </button>
          <button
            className="lasso-bar__btn"
            onClick={(e) => {
              e.preventDefault();
              onCancel();
            }}
          >
            Cancel
          </button>
        </div>,
        document.body,
      )}
    </>
  );
}
