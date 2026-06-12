import * as turf from "@turf/turf";
import type { BBox, Feature, FeatureCollection, MultiPolygon, Polygon, Point } from "geojson";
import type { AskedQuestion, DatasetName, LatLng, POICollection, PossibleArea } from "./types";
import { BOROUGHS, COASTLINE, HIDING_ZONE, getPOIs } from "../data/datasets";
import questions from "../data/questions.json";

const MILES_TO_KM = 1.609344;

// Bounding polygon used for half-plane construction (thermometer) and Voronoi clipping.
// Covers the playing area + buffer so we never run out of plane.
const BBOX_BUFFER_DEG = 0.6;
function playingBbox(): BBox {
  const [w, s, e, n] = turf.bbox(BOROUGHS);
  return [w - BBOX_BUFFER_DEG, s - BBOX_BUFFER_DEG, e + BBOX_BUFFER_DEG, n + BBOX_BUFFER_DEG];
}

type POIDataset = Exclude<DatasetName, "boroughs">;

// In the NYC playing zone (4 boroughs), each borough sits on exactly one
// landmass. Manhattan is its own island; Brooklyn + Queens are the NYC
// portion of Long Island; the Bronx is the only borough on the US mainland.
const BOROUGH_LANDMASS: Record<string, string> = {
  Manhattan: "Manhattan Island",
  Brooklyn: "Long Island",
  Queens: "Long Island",
  Bronx: "US Mainland",
};

export function buildHidingZone(): PossibleArea {
  // Precomputed at build time by scripts/simplify-data.mjs.
  return HIDING_ZONE as PossibleArea;
}

// Union many polygons in a single polyclip sweep instead of n incremental
// passes — the incremental version was the main source of multi-second hangs.
function unionAll(feats: Feature<Polygon | MultiPolygon>[]): Feature<Polygon | MultiPolygon> | null {
  const valid = feats.filter((f) => f != null);
  if (valid.length === 0) return null;
  if (valid.length === 1) return valid[0];
  return (turf.union(turf.featureCollection(valid)) as Feature<Polygon | MultiPolygon> | null) ?? valid[0];
}

// Geometry ops compound vertex count question after question; shaving ~10 m of
// detail after each one keeps the area renderable without visible change.
function tidy(area: PossibleArea): PossibleArea {
  try {
    const coords = JSON.stringify(area.geometry).length;
    if (coords < 20000) return area;
    return turf.simplify(area, { tolerance: 0.0001, highQuality: false, mutate: false }) as PossibleArea;
  } catch {
    return area;
  }
}

function safeIntersect(a: PossibleArea, b: Feature<Polygon | MultiPolygon>): PossibleArea {
  const result = turf.intersect(turf.featureCollection([a, b]));
  if (!result) {
    // No overlap → empty area (represented by an empty MultiPolygon)
    return turf.multiPolygon([]) as PossibleArea;
  }
  return result as PossibleArea;
}

function safeDifference(a: PossibleArea, b: Feature<Polygon | MultiPolygon>): PossibleArea {
  const result = turf.difference(turf.featureCollection([a, b]));
  if (!result) return turf.multiPolygon([]) as PossibleArea;
  return result as PossibleArea;
}

// ---------- Radar ----------
function eliminateRadar(area: PossibleArea, q: Extract<AskedQuestion, { type: "radar" }>): PossibleArea {
  const circle = turf.circle([q.center.lng, q.center.lat], q.radiusMi * MILES_TO_KM, {
    steps: 128,
    units: "kilometers",
  });
  return q.answer === "yes" ? safeIntersect(area, circle) : safeDifference(area, circle);
}

// ---------- Thermometer ----------
function eliminateThermometer(area: PossibleArea, q: Extract<AskedQuestion, { type: "thermometer" }>): PossibleArea {
  // Half-plane on the side of the END pin (closer to end = hotter).
  // Construct a large rectangle perpendicular to the segment, on the "closer-to-end" side.
  const start = [q.startPin.lng, q.startPin.lat];
  const end = [q.endPin.lng, q.endPin.lat];
  const mid = [(start[0] + end[0]) / 2, (start[1] + end[1]) / 2];

  // Bearing from start → end.
  const bearing = turf.bearing(turf.point(start), turf.point(end));
  // Half-plane extends in the direction of `bearing` from midpoint.
  // Build a big rectangle: from midpoint, go perpendicular ±LARGE, then forward LARGE.
  const LARGE_KM = 300;
  const perpLeft = turf.destination(turf.point(mid), LARGE_KM, bearing - 90, { units: "kilometers" });
  const perpRight = turf.destination(turf.point(mid), LARGE_KM, bearing + 90, { units: "kilometers" });
  const farLeft = turf.destination(perpLeft, LARGE_KM, bearing, { units: "kilometers" });
  const farRight = turf.destination(perpRight, LARGE_KM, bearing, { units: "kilometers" });

  const halfPlane = turf.polygon([
    [
      perpLeft.geometry.coordinates,
      farLeft.geometry.coordinates,
      farRight.geometry.coordinates,
      perpRight.geometry.coordinates,
      perpLeft.geometry.coordinates,
    ],
  ]);

  // "hotter" = hider is on the END side; "colder" = STARTside (kill the END side)
  return q.answer === "hotter" ? safeIntersect(area, halfPlane) : safeDifference(area, halfPlane);
}

// ---------- Matching ----------
function matchingCategory(key: string) {
  return questions.matching.categories.find((c) => c.key === key);
}

function pointInWhichPolygon(p: LatLng, fc: FeatureCollection<Polygon | MultiPolygon, { name?: string }>): string | null {
  for (const f of fc.features) {
    if (turf.booleanPointInPolygon([p.lng, p.lat], f as Feature<Polygon | MultiPolygon>)) {
      return f.properties?.name ?? "unknown";
    }
  }
  return null;
}

function findPolygonByName(name: string, fc: FeatureCollection<Polygon | MultiPolygon, { name?: string }>): Feature<Polygon | MultiPolygon> | null {
  const f = fc.features.find((feat) => feat.properties?.name === name);
  return (f as Feature<Polygon | MultiPolygon>) ?? null;
}

function nearestPOI(p: LatLng, pois: POICollection): { feature: Feature<Point> | null; index: number; distanceKm: number } {
  let best: Feature<Point> | null = null;
  let bestIdx = -1;
  let bestD = Infinity;
  const target = turf.point([p.lng, p.lat]);
  pois.features.forEach((f, i) => {
    const d = turf.distance(target, f as Feature<Point>, { units: "kilometers" });
    if (d < bestD) {
      bestD = d;
      best = f as Feature<Point>;
      bestIdx = i;
    }
  });
  return { feature: best, index: bestIdx, distanceKm: bestD };
}

const voronoiCache = new Map<string, Feature<Polygon>[]>();

function voronoiClippedToZone(pois: POICollection, cacheKey?: string): Feature<Polygon>[] {
  if (cacheKey && voronoiCache.has(cacheKey)) return voronoiCache.get(cacheKey)!;
  const [w, s, e, n] = playingBbox();
  const result = turf.voronoi(pois as FeatureCollection<Point>, { bbox: [w, s, e, n] });
  const cells = (result?.features ?? []) as Feature<Polygon>[];
  if (cacheKey) voronoiCache.set(cacheKey, cells);
  return cells;
}

function eliminateMatching(area: PossibleArea, q: Extract<AskedQuestion, { type: "matching" }>): PossibleArea {
  const cat = matchingCategory(q.categoryKey);
  if (!cat) return area;

  if (cat.kind === "polygon") {
    // borough/county matching — find the seeker's polygon by name
    if (!q.seekerAnchorName) return area;
    const seekerPoly = findPolygonByName(q.seekerAnchorName, BOROUGHS);
    if (!seekerPoly) return area;
    return q.answer === "yes" ? safeIntersect(area, seekerPoly) : safeDifference(area, seekerPoly);
  }

  if (cat.kind === "landmass") {
    // seekerAnchorName carries the landmass name (e.g. "Long Island").
    // Union every borough that sits on that landmass.
    if (!q.seekerAnchorName) return area;
    const union = unionAll(
      BOROUGHS.features.filter(
        (f) => BOROUGH_LANDMASS[(f.properties as { name?: string })?.name ?? ""] === q.seekerAnchorName,
      ) as Feature<Polygon | MultiPolygon>[],
    );
    if (!union) return area;
    return q.answer === "yes" ? safeIntersect(area, union) : safeDifference(area, union);
  }

  if (cat.kind === "voronoi-point") {
    const pois = getPOIs(cat.dataset as POIDataset);
    if (!pois.features.length || q.seekerAnchorId == null) return area;
    const seekerIdx = pois.features.findIndex((f) => f.properties.id === q.seekerAnchorId);
    if (seekerIdx < 0) return area;
    const cells = voronoiClippedToZone(pois, cat.dataset);
    const seekerCell = cells[seekerIdx];
    if (!seekerCell) return area;
    return q.answer === "yes" ? safeIntersect(area, seekerCell) : safeDifference(area, seekerCell);
  }

  if (cat.kind === "name-length") {
    // Stations matching by name length: group by name length, union Voronoi cells per group.
    const pois = getPOIs("rail-stations");
    const cells = voronoiClippedToZone(pois, "rail-stations");
    const seekerLen = (() => {
      const f = pois.features.find((x) => x.properties.id === q.seekerAnchorId);
      return f?.properties.name?.length ?? null;
    })();
    if (seekerLen == null) return area;
    // Union cells whose station name length matches seekerLen
    const union = unionAll(
      pois.features
        .map((f, i) => ((f.properties.name?.length ?? -1) === seekerLen ? cells[i] : null))
        .filter((c): c is Feature<Polygon> => c != null),
    );
    if (!union) return area;
    return q.answer === "yes" ? safeIntersect(area, union) : safeDifference(area, union);
  }

  return area;
}

// ---------- Measuring ----------
function measuringCategory(key: string) {
  return questions.measuring.categories.find((c) => c.key === key);
}

function eliminateMeasuring(area: PossibleArea, q: Extract<AskedQuestion, { type: "measuring" }>): PossibleArea {
  const cat = measuringCategory(q.categoryKey);
  if (!cat) return area;
  const radiusKm = q.seekerNearestDistanceMi * MILES_TO_KM;
  if (radiusKm <= 0) return area;

  // Coastline = line buffer instead of circle-union (lines, not points).
  if (cat.kind === "line" && cat.dataset === "coastline") {
    if (!COASTLINE.features.length) return area;
    const buffered = turf.buffer(COASTLINE, radiusKm, { units: "kilometers" });
    if (!buffered) return area;
    // turf.buffer returns FeatureCollection when given one — union the parts.
    const parts = ("features" in buffered ? buffered.features : [buffered]) as Feature<Polygon | MultiPolygon>[];
    const union = unionAll(parts);
    if (!union) return area;
    return q.answer === "closer" ? safeIntersect(area, union) : safeDifference(area, union);
  }

  const pois = getPOIs(cat.dataset as POIDataset);
  if (!pois.features.length) return area;

  // Union of circles of radius d_s around each POI = "points whose distance-to-nearest-POI ≤ d_s".
  // With thousands of overlapping circles the arc detail is invisible — drop it.
  const steps = pois.features.length > 500 ? 12 : 32;
  const circles = pois.features.map(
    (f) => turf.circle((f.geometry as Point).coordinates, radiusKm, { steps, units: "kilometers" }) as Feature<Polygon>,
  );
  const union = unionAll(circles);
  if (!union) return area;
  return q.answer === "closer" ? safeIntersect(area, union) : safeDifference(area, union);
}

// ---------- Tentacle ----------
function tentaclePrompt(key: string) {
  return questions.tentacle.prompts.find((p) => p.key === key);
}

function eliminateTentacle(area: PossibleArea, q: Extract<AskedQuestion, { type: "tentacle" }>): PossibleArea {
  const prompt = tentaclePrompt(q.promptKey);
  if (!prompt) return area;
  const pois = getPOIs(prompt.dataset as POIDataset);
  const radiusKm = q.radiusMi * MILES_TO_KM;
  const seeker = turf.point([q.seekerCenter.lng, q.seekerCenter.lat]);
  const radiusCircle = turf.circle(seeker.geometry.coordinates, radiusKm, { steps: 128, units: "kilometers" });

  // POIs within radius (these are the tentacles)
  const inRange = pois.features.filter((f) =>
    turf.distance(seeker, f as Feature<Point>, { units: "kilometers" }) <= radiusKm,
  );

  if (q.nearestPoiId === "out-of-range") {
    // Hider is outside the tentacle radius — kill the radius circle
    return safeDifference(area, radiusCircle);
  }

  if (inRange.length === 0) {
    // Edge case: no POIs in range. Treat as no-op.
    return area;
  }

  // Build Voronoi over the in-range POIs only, clipped to the radius circle.
  const inRangeFC = turf.featureCollection(inRange) as POICollection;
  const cells = voronoiClippedToZone(inRangeFC);
  const idx = inRange.findIndex((f) => f.properties.id === q.nearestPoiId);
  if (idx < 0 || !cells[idx]) return area;
  // Intersect the matching POI's Voronoi cell with the radius circle to get the hider's possible region
  const region = turf.intersect(turf.featureCollection([cells[idx] as Feature<Polygon>, radiusCircle]));
  if (!region) return area;
  return safeIntersect(area, region as Feature<Polygon | MultiPolygon>);
}

// ---------- Photo ----------
function eliminatePhoto(area: PossibleArea, q: Extract<AskedQuestion, { type: "photo" }>): PossibleArea {
  if (!q.polygon) return area;
  return safeDifference(area, { type: "Feature", geometry: q.polygon, properties: {} } as Feature<Polygon | MultiPolygon>);
}

// ---------- Public API ----------
export function applyQuestion(area: PossibleArea, q: AskedQuestion): PossibleArea {
  switch (q.type) {
    case "radar": return tidy(eliminateRadar(area, q));
    case "thermometer": return tidy(eliminateThermometer(area, q));
    case "matching": return tidy(eliminateMatching(area, q));
    case "measuring": return tidy(eliminateMeasuring(area, q));
    case "tentacle": return tidy(eliminateTentacle(area, q));
    case "photo": return tidy(eliminatePhoto(area, q));
  }
}

export function replayHistory(history: AskedQuestion[]): PossibleArea {
  let area = buildHidingZone();
  for (const q of history) area = applyQuestion(area, q);
  return area;
}

// Re-exports needed by store
export { pointInWhichPolygon, nearestPOI };
