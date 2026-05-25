#!/usr/bin/env node
// Fetches NYC boundary data + OSM POIs and writes GeoJSON files into src/data/.
// Run once at setup: `node scripts/fetch-data.mjs`

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA = path.join(__dirname, "..", "src", "data");
const POIS = path.join(DATA, "pois");
fs.mkdirSync(POIS, { recursive: true });

const BOROUGHS_URL =
  "https://raw.githubusercontent.com/codeforgermany/click_that_hood/main/public/data/new-york-city-boroughs.geojson";

// NYC bounding box for Overpass queries (covers the 4 boroughs we play in plus a buffer)
const BBOX = { s: 40.49, w: -74.06, n: 40.92, e: -73.7 };
const OVERPASS = "https://overpass-api.de/api/interpreter";

// "Commercial Airport" per the rulebook (page 24) — NYC plays JFK and LGA only.
// EWR is across the river and outside the hiding zone, so it's excluded by bbox.
const POI_QUERIES = [
  { name: "airports", filter: '["aeroway"="aerodrome"]["iata"~"^(JFK|LGA)$"]' },
  { name: "hospitals", filter: '["amenity"="hospital"]' },
  { name: "libraries", filter: '["amenity"="library"]' },
  { name: "museums", filter: '["tourism"="museum"]' },
  { name: "movie-theaters", filter: '["amenity"="cinema"]' },
  { name: "zoos", filter: '["tourism"="zoo"]' },
  { name: "aquariums", filter: '["tourism"="aquarium"]' },
  { name: "amusement-parks", filter: '["tourism"="theme_park"]' },
  { name: "golf-courses", filter: '["leisure"="golf_course"]' },
  { name: "foreign-consulates", filter: '["diplomatic"="consulate"]' },
  { name: "rail-stations", filter: '["railway"="station"]' },
  { name: "parks", filter: '["leisure"="park"]' },
];

function overpassQuery(filter) {
  const { s, w, n, e } = BBOX;
  return `[out:json][timeout:60];
(
  node${filter}(${s},${w},${n},${e});
  way${filter}(${s},${w},${n},${e});
  relation${filter}(${s},${w},${n},${e});
);
out center tags;`;
}

function osmToGeoJSON(elements) {
  const features = [];
  for (const el of elements) {
    let coord;
    if (el.type === "node") coord = [el.lon, el.lat];
    else if (el.center) coord = [el.center.lon, el.center.lat];
    else continue;
    features.push({
      type: "Feature",
      properties: {
        id: `${el.type}/${el.id}`,
        name: el.tags?.name ?? null,
        tags: el.tags ?? {},
      },
      geometry: { type: "Point", coordinates: coord },
    });
  }
  return { type: "FeatureCollection", features };
}

async function fetchJSON(url, opts) {
  const res = await fetch(url, opts);
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  return res.json();
}

async function fetchBoroughs() {
  console.log("Fetching boroughs...");
  const all = await fetchJSON(BOROUGHS_URL);
  // Exclude Staten Island per user spec
  const playing = {
    type: "FeatureCollection",
    features: all.features.filter(
      (f) => f.properties?.name !== "Staten Island",
    ),
  };
  fs.writeFileSync(
    path.join(DATA, "boroughs.geojson"),
    JSON.stringify(playing),
  );

  // Build hidingZone as union (simple approach: just keep MultiPolygon of all borough rings).
  // Turf.union is heavier; the renderer can treat the feature collection as the zone.
  fs.writeFileSync(
    path.join(DATA, "hidingZone.geojson"),
    JSON.stringify(playing),
  );

  console.log(`  → ${playing.features.length} boroughs saved`);
}

async function fetchPOI(name, filter) {
  console.log(`Fetching ${name}...`);
  try {
    const body = `data=${encodeURIComponent(overpassQuery(filter))}`;
    const res = await fetch(OVERPASS, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "jet-lag-nyc-seeker-app/0.1 (educational)",
        "Accept": "application/json,*/*",
      },
      body,
    });
    if (!res.ok) {
      console.error(`  → ${name} failed: HTTP ${res.status}`);
      return;
    }
    const data = await res.json();
    const gj = osmToGeoJSON(data.elements || []);
    fs.writeFileSync(
      path.join(POIS, `${name}.geojson`),
      JSON.stringify(gj),
    );
    console.log(`  → ${gj.features.length} ${name}`);
  } catch (err) {
    console.error(`  → ${name} error:`, err.message);
  }
}

async function main() {
  await fetchBoroughs();
  for (const q of POI_QUERIES) {
    await fetchPOI(q.name, q.filter);
    // Be polite to Overpass — small delay between queries
    await new Promise((r) => setTimeout(r, 1500));
  }
  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
