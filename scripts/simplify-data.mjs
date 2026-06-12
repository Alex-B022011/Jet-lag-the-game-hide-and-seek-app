// One-off: simplify heavy geometry datasets so runtime turf ops and the JS
// bundle stay small. ~20m tolerance is invisible at city scale but cuts the
// borough polygons from ~60k vertices to a few thousand.
// Usage: node scripts/simplify-data.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { simplify, truncate, union, featureCollection } from "@turf/turf";

const TOLERANCE = 0.0002; // degrees, ≈ 20 m

function load(path) {
  return JSON.parse(readFileSync(new URL(`../src/data/${path}`, import.meta.url)));
}
function save(path, data) {
  writeFileSync(new URL(`../src/data/${path}`, import.meta.url), JSON.stringify(data));
}
function vertexCount(fc) {
  return JSON.stringify(fc).match(/\d+\.\d+,/g)?.length ?? 0;
}

// Boroughs: simplify each polygon, then precompute the unioned hiding zone so
// the app never has to union full polygons at runtime.
const boroughs = load("boroughs.json");
const before = vertexCount(boroughs);
boroughs.features = boroughs.features.map((f) =>
  truncate(simplify(f, { tolerance: TOLERANCE, highQuality: true }), { precision: 6, mutate: true }),
);
save("boroughs.json", boroughs);

let zone = union(featureCollection(boroughs.features));
zone = truncate(simplify(zone, { tolerance: TOLERANCE, highQuality: true }), { precision: 6, mutate: true });
zone.properties = { name: "NYC hiding zone" };
save("hidingZone.json", { type: "FeatureCollection", features: [zone] });
console.log(`boroughs: ${before} → ${vertexCount(boroughs)} vertices; zone: ${vertexCount(zone)}`);

// Coastline: simplify the linestrings.
const coast = load("pois/coastline.json");
const cBefore = vertexCount(coast);
coast.features = coast.features.map((f) =>
  truncate(simplify(f, { tolerance: TOLERANCE, highQuality: false }), { precision: 6, mutate: true }),
);
save("pois/coastline.json", coast);
console.log(`coastline: ${cBefore} → ${vertexCount(coast)} vertices`);

// Point datasets: just truncate coordinate precision (1e-6 deg ≈ 0.1 m).
for (const name of [
  "airports", "hospitals", "libraries", "museums", "movie-theaters", "zoos",
  "aquariums", "amusement-parks", "golf-courses", "foreign-consulates",
  "rail-stations", "parks", "water-bodies",
]) {
  const fc = load(`pois/${name}.json`);
  fc.features = fc.features.map((f) => {
    // Full OSM tag dumps are never read by the app — keep only id + name.
    f.properties = { id: f.properties.id, name: f.properties.name ?? null };
    return truncate(f, { precision: 6, mutate: true });
  });
  save(`pois/${name}.json`, fc);
}
console.log("POI tags stripped + precision truncated");
