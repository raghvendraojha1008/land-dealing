/**
 * Utility functions for geodesic calculations and length unit conversions.
 */

export type LengthUnit = "m" | "ft" | "yd" | "km" | "mi";

export interface LengthUnitOption {
  id: LengthUnit;
  label: string;
  symbol: string;
}

export const LENGTH_UNITS: LengthUnitOption[] = [
  { id: "m", label: "Meters (m)", symbol: "m" },
  { id: "ft", label: "Feet (ft)", symbol: "ft" },
  { id: "yd", label: "Yards (yd)", symbol: "yd" },
  { id: "km", label: "Kilometers (km)", symbol: "km" },
  { id: "mi", label: "Miles (mi)", symbol: "mi" },
];

/**
 * Minimum zoom level at which edge length labels are displayed on the map (~30 ft scale).
 * When zoomed out below this level, labels are hidden to keep the map clean.
 */
export const MIN_ZOOM_FOR_EDGE_LENGTHS = 18;

/**
 * Calculate geodesic distance between two points in meters using Haversine formula.
 */
export function calculateDistanceMeters(
  pt1: { lat: number; lng: number },
  pt2: { lat: number; lng: number }
): number {
  const R = 6371000; // Earth radius in meters
  const dLat = ((pt2.lat - pt1.lat) * Math.PI) / 180;
  const dLng = ((pt2.lng - pt1.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((pt1.lat * Math.PI) / 180) *
      Math.cos((pt2.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Formats a distance in meters to the specified length unit.
 */
export function formatEdgeLength(meters: number, unit: LengthUnit): string {
  if (meters <= 0) return `0 ${unit}`;
  switch (unit) {
    case "ft": {
      const feet = meters * 3.28084;
      if (feet >= 10000) return `${Math.round(feet).toLocaleString()} ft`;
      return `${feet.toFixed(1)} ft`;
    }
    case "yd": {
      const yards = meters * 1.09361;
      if (yards >= 10000) return `${Math.round(yards).toLocaleString()} yd`;
      return `${yards.toFixed(1)} yd`;
    }
    case "km": {
      const km = meters / 1000;
      return `${km.toFixed(2)} km`;
    }
    case "mi": {
      const miles = meters * 0.000621371;
      return `${miles.toFixed(2)} mi`;
    }
    case "m":
    default: {
      if (meters >= 10000) return `${Math.round(meters).toLocaleString()} m`;
      return `${meters.toFixed(1)} m`;
    }
  }
}

/**
 * Calculates segment midpoint coordinates.
 */
export function calculateEdgeMidpoint(
  pt1: { lat: number; lng: number },
  pt2: { lat: number; lng: number }
): { lat: number; lng: number } {
  return {
    lat: (pt1.lat + pt2.lat) / 2,
    lng: (pt1.lng + pt2.lng) / 2,
  };
}

/**
 * Calculates the orientation angle of a segment in degrees for parallel text alignment,
 * keeping text upright (readable left-to-right / bottom-to-top).
 */
export function calculateSegmentAngle(
  pt1: { lat: number; lng: number },
  pt2: { lat: number; lng: number }
): number {
  const midLat = (pt1.lat + pt2.lat) / 2;
  const rad = (midLat * Math.PI) / 180;
  const dx = (pt2.lng - pt1.lng) * Math.cos(rad);
  const dy = -(pt2.lat - pt1.lat); // Negate because Y grows downwards in screen space

  let angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;

  // Keep text upright so it's never upside down
  if (angleDeg > 90) angleDeg -= 180;
  else if (angleDeg < -90) angleDeg += 180;

  return angleDeg;
}

/**
 * Determines whether the perpendicular offset direction for an edge should be positive or negative
 * so that the length label is GUARANTEED to be positioned OUTSIDE of the polygon bounded area.
 */
export function calculateOutwardOffsetSign(
  pt1: { lat: number; lng: number },
  pt2: { lat: number; lng: number },
  polygonPoints?: { lat: number; lng: number }[]
): number {
  if (!polygonPoints || polygonPoints.length < 3) {
    return -1; // Default offset outside line
  }

  // Calculate polygon centroid C
  let sumLat = 0;
  let sumLng = 0;
  for (const p of polygonPoints) {
    sumLat += p.lat;
    sumLng += p.lng;
  }
  const avgLat = sumLat / polygonPoints.length;
  const avgLng = sumLng / polygonPoints.length;

  const midLat = (pt1.lat + pt2.lat) / 2;
  const midLng = (pt1.lng + pt2.lng) / 2;

  // Vector from centroid to midpoint (pointing outward)
  const vOutLat = midLat - avgLat;
  const vOutLng = midLng - avgLng;

  const angleDeg = calculateSegmentAngle(pt1, pt2);
  const angleRad = (angleDeg * Math.PI) / 180;

  // Perpendicular direction vector for translateY(-1) in lat/lng
  const dLat = Math.cos(angleRad);
  const dLng = Math.sin(angleRad);

  const dot = dLat * vOutLat + dLng * vOutLng;

  return dot >= 0 ? -1 : 1;
}

/**
 * Calculates dynamic font size, box padding, and offset distance based on map zoom level.
 * Starts small at ~30ft scale (zoom 18) and scales up to max size at ~20ft scale (zoom 20+).
 */
export function getDynamicBadgeStyles(zoom: number, isDrawing: boolean = false) {
  const minZoom = 18;
  const maxZoom = 20;

  let progress = (zoom - minZoom) / (maxZoom - minZoom);
  if (isDrawing) progress = Math.max(progress, 0.75);
  progress = Math.min(Math.max(progress, 0), 1);

  // Font size: 8.5px (small at 30ft) -> 11px (max at 20ft)
  const fontSize = (8.5 + progress * 2.5).toFixed(1);

  // Box padding: 1px 4px (small) -> 2.5px 7px (max)
  const py = (1.0 + progress * 1.5).toFixed(1);
  const px = (4.0 + progress * 3.0).toFixed(1);

  // Perpendicular offset distance from stroke line: 10px -> 16px
  const offsetDistance = (10.0 + progress * 6.0).toFixed(1);

  return { fontSize, py, px, offsetDistance };
}

/**
 * Calculates total perimeter length of a set of boundary points in meters.
 */
export function calculatePerimeterMeters(
  points: { lat: number; lng: number }[]
): number {
  if (!points || points.length < 2) return 0;
  let total = 0;
  for (let i = 0; i < points.length - 1; i++) {
    total += calculateDistanceMeters(points[i], points[i + 1]);
  }
  if (points.length >= 3) {
    total += calculateDistanceMeters(points[points.length - 1], points[0]);
  }
  return total;
}

/**
 * Calculates cumulative length of an open polyline (non-closed path) in meters.
 */
export function calculatePolylineLengthMeters(
  points: { lat: number; lng: number }[]
): number {
  if (!points || points.length < 2) return 0;
  let total = 0;
  for (let i = 0; i < points.length - 1; i++) {
    total += calculateDistanceMeters(points[i], points[i + 1]);
  }
  return total;
}
