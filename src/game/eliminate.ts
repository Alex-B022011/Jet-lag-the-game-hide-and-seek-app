import * as turf from "@turf/turf";
import type { BBox, Feature, FeatureCollection, MultiPolygon, Polygon, Point } from "geojson";
import type { AskedQuestion, DatasetName, LatLng, POICollection, PossibleArea } from "./types";
import { BOROUGHS, getPOIs } from "../data/datasets";
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
  // Union all 4 borough polygons into a single (multi)polygon.
  let acc: Feature<Polygon | MultiPolygon> | null = null;
  for (const f of BOROUGHS.features) {
    const feat = f as Feature<Polygon | MultiPolygon>;
    if (!acc) acc = feat;
    else acc = (turf.union(turf.featureCollection([acc, feat])) as PossibleArea) ?? acc;
  }
  if (!acc) throw new Error("No boroughs loaded");
  return acc as PossibleArea;
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

function voronoiClippedToZone(pois: POICollection): Feature<Polygon>[] {
  const [w, s, e, n] = playingBbox();
  const result = turf.voronoi(pois as FeatureCollection<Point>, { bbox: [w, s, e, n] });
  return (result?.features ?? []).filter((f) => f != null) as Feature<Polygon>[];
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
    let union: Feature<Polygon | MultiPolygon> | null = null;
    for (const f of BOROUGHS.features) {
      const borough = (f.properties as { name?: string })?.name ?? "";
      if (BOROUGH_LANDMASS[borough] !== q.seekerAnchorName) continue;
      union = union
        ? ((turf.union(turf.featureCollection([union, f as Feature<Polygon | MultiPolygon>])) as Feature<Polygon | MultiPolygon> | null) ?? union)
        : (f as Feature<Polygon | MultiPolygon>);
    }
    if (!union) return area;
    return q.answer === "yes" ? safeIntersect(area, union) : safeDifference(area, union);
  }

  if (cat.kind === "voronoi-point") {
    const pois = getPOIs(cat.dataset as POIDataset);
    if (!pois.features.length || q.seekerAnchorId == null) return area;
    const seekerIdx = pois.features.findIndex((f) => f.properties.id === q.seekerAnchorId);
    if (seekerIdx < 0) return area;
    const cells = voronoiClippedToZone(pois);
    const seekerCell = cells[seekerIdx];
    if (!seekerCell) return area;
    return q.answer === "yes" ? safeIntersect(area, seekerCell) : safeDifference(area, seekerCell);
  }

  if (cat.kind === "name-length") {
    // Stations matching by name length: group by name length, union Voronoi cells per group.
    const pois = getPOIs("rail-stations");
    const cells = voronoiClippedToZone(pois);
    const seekerLen = (() => {
      const f = pois.features.find((x) => x.properties.id === q.seekerAnchorId);
      return f?.properties.name?.length ?? null;
    })();
    if (seekerLen == null) return area;
    // Union cells whose station name length matches seekerLen
    let union: Feature<Polygon | MultiPolygon> | null = null;
    pois.features.forEach((f, i) => {
      if ((f.properties.name?.length ?? -1) === seekerLen && cells[i]) {
        if (!union) union = cells[i] as Feature<Polygon>;
        else union = (turf.union(turf.featureCollection([union, cells[i] as Feature<Polygon>])) as Feature<Polygon | MultiPolygon>) ?? union;
      }
    });
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
  const pois = getPOIs(cat.dataset as POIDataset);
  if (!pois.features.length) return area;

  // Union of circles of radius d_s around each POI = "points whose distance-to-nearest-POI ≤ d_s"
  const radiusKm = q.seekerNearestDistanceMi * MILES_TO_KM;
  if (radiusKm <= 0) return area;
  let union: Feature<Polygon | MultiPolygon> | null = null;
  for (const f of pois.features) {
    const c = turf.circle((f.geometry as Point).coordinates, radiusKm, { steps: 64, units: "kilometers" });
    if (!union) union = c as Feature<Polygon>;
    else union = (turf.union(turf.featureCollection([union, c])) as Feature<Polygon | MultiPolygon>) ?? union;
  }
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
    case "radar": return eliminateRadar(area, q);
    case "thermometer": return eliminateThermometer(area, q);
    case "matching": return eliminateMatching(area, q);
    case "measuring": return eliminateMeasuring(area, q);
    case "tentacle": return eliminateTentacle(area, q);
    case "photo": return eliminatePhoto(area, q);
  }
}

export function replayHistory(history: AskedQuestion[]): PossibleArea {
  let area = buildHidingZone();
  for (const q of history) area = applyQuestion(area, q);
  return area;
}

// Re-exports needed by store
export { pointInWhichPolygon, nearestPOI };
