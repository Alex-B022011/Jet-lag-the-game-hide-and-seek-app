import type { DatasetName, POICollection } from "../game/types";
import type { FeatureCollection, MultiPolygon, Polygon } from "geojson";

import boroughs from "./boroughs.json";
import airports from "./pois/airports.json";
import hospitals from "./pois/hospitals.json";
import libraries from "./pois/libraries.json";
import museums from "./pois/museums.json";
import movieTheaters from "./pois/movie-theaters.json";
import zoos from "./pois/zoos.json";
import aquariums from "./pois/aquariums.json";
import amusementParks from "./pois/amusement-parks.json";
import golfCourses from "./pois/golf-courses.json";
import foreignConsulates from "./pois/foreign-consulates.json";
import railStations from "./pois/rail-stations.json";
import parks from "./pois/parks.json";

export const BOROUGHS = boroughs as unknown as FeatureCollection<MultiPolygon | Polygon, { name: string }>;

const POIS: Record<Exclude<DatasetName, "boroughs">, POICollection> = {
  airports: airports as unknown as POICollection,
  hospitals: hospitals as unknown as POICollection,
  libraries: libraries as unknown as POICollection,
  museums: museums as unknown as POICollection,
  "movie-theaters": movieTheaters as unknown as POICollection,
  zoos: zoos as unknown as POICollection,
  aquariums: aquariums as unknown as POICollection,
  "amusement-parks": amusementParks as unknown as POICollection,
  "golf-courses": golfCourses as unknown as POICollection,
  "foreign-consulates": foreignConsulates as unknown as POICollection,
  "rail-stations": railStations as unknown as POICollection,
  parks: parks as unknown as POICollection,
};

export function getPOIs(name: Exclude<DatasetName, "boroughs">): POICollection {
  return POIS[name];
}
