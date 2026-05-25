import type { Feature, FeatureCollection, MultiPolygon, Polygon, Point } from "geojson";

export type GameSize = "S" | "M" | "L";

export type LatLng = { lat: number; lng: number };

export type DatasetName =
  | "boroughs"
  | "airports"
  | "hospitals"
  | "libraries"
  | "museums"
  | "movie-theaters"
  | "zoos"
  | "aquariums"
  | "amusement-parks"
  | "golf-courses"
  | "foreign-consulates"
  | "rail-stations"
  | "parks";

export type AskedQuestion =
  | {
      id: string;
      type: "matching";
      categoryKey: string;
      seekerAnchorId: string | null;
      seekerAnchorName: string | null;
      answer: "yes" | "no";
      ts: number;
    }
  | {
      id: string;
      type: "radar";
      center: LatLng;
      radiusMi: number;
      answer: "yes" | "no";
      ts: number;
    }
  | {
      id: string;
      type: "thermometer";
      startPin: LatLng;
      endPin: LatLng;
      answer: "hotter" | "colder";
      ts: number;
    }
  | {
      id: string;
      type: "measuring";
      categoryKey: string;
      seekerNearestDistanceMi: number;
      answer: "closer" | "further";
      ts: number;
    }
  | {
      id: string;
      type: "tentacle";
      promptKey: string;
      radiusMi: number;
      seekerCenter: LatLng;
      nearestPoiId: string | "out-of-range";
      nearestPoiName: string | null;
      ts: number;
    }
  | {
      id: string;
      type: "photo";
      promptKey: string;
      promptLabel: string;
      polygon: Polygon | MultiPolygon | null;
      ts: number;
    };

export type PossibleArea = Feature<Polygon | MultiPolygon>;

export type POIFeature = Feature<Point, { id: string; name: string | null; tags: Record<string, string> }>;
export type POICollection = FeatureCollection<Point, POIFeature["properties"]>;
