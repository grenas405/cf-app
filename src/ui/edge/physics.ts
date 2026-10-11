/**
 * The physics of latency, as pure functions. Light in optical fiber covers
 * roughly 200 km per millisecond, so distance sets a hard floor on response
 * time that no amount of server tuning can lower.
 *
 * @module
 */

/** A place on Earth. */
export interface City {
  readonly id: string;
  readonly name: string;
  readonly lat: number;
  readonly lon: number;
}

/** Light in fiber: about two thirds of c, i.e. ~200 km per ms. */
export const FIBER_KM_PER_MS = 200;
const EARTH_RADIUS_KM = 6371;

/** Where customers might be. */
export const CUSTOMERS: readonly City[] = [
  { id: "okc", name: "Oklahoma City, OK", lat: 35.4676, lon: -97.5164 },
  { id: "tul", name: "Tulsa, OK", lat: 36.154, lon: -95.9928 },
  { id: "dfw", name: "Dallas, TX", lat: 32.7767, lon: -96.797 },
  { id: "den", name: "Denver, CO", lat: 39.7392, lon: -104.9903 },
  { id: "chi", name: "Chicago, IL", lat: 41.8781, lon: -87.6298 },
  { id: "lax", name: "Los Angeles, CA", lat: 34.0522, lon: -118.2437 },
  { id: "nyc", name: "New York, NY", lat: 40.7128, lon: -74.006 },
  { id: "mex", name: "Mexico City, MX", lat: 19.4326, lon: -99.1332 },
  { id: "lon", name: "London, UK", lat: 51.5074, lon: -0.1278 },
  { id: "sgn", name: "Ho Chi Minh City, VN", lat: 10.8231, lon: 106.6297 },
];

/** Where a single, traditional server might live. */
export const ORIGINS: readonly City[] = [
  {
    id: "iad",
    name: "Northern Virginia (a common cloud region)",
    lat: 39.0438,
    lon: -77.4874,
  },
  {
    id: "okc",
    name: "A server closet in Oklahoma City",
    lat: 35.4676,
    lon: -97.5164,
  },
  { id: "sjc", name: "Silicon Valley, CA", lat: 37.3382, lon: -121.8863 },
];

/** A sample of cities where Cloudflare lists data centers. */
export const EDGE_CITIES: readonly City[] = [
  { id: "okc", name: "Oklahoma City", lat: 35.4676, lon: -97.5164 },
  { id: "dfw", name: "Dallas", lat: 32.7767, lon: -96.797 },
  { id: "den", name: "Denver", lat: 39.7392, lon: -104.9903 },
  { id: "ord", name: "Chicago", lat: 41.8781, lon: -87.6298 },
  { id: "lax", name: "Los Angeles", lat: 34.0522, lon: -118.2437 },
  { id: "ewr", name: "Newark", lat: 40.7357, lon: -74.1724 },
  { id: "mex", name: "Mexico City", lat: 19.4326, lon: -99.1332 },
  { id: "lhr", name: "London", lat: 51.5074, lon: -0.1278 },
  { id: "sgn", name: "Ho Chi Minh City", lat: 10.8231, lon: 106.6297 },
];

/** Great-circle distance in km (haversine). */
export function greatCircleKm(a: City, b: City): number {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLon = (b.lon - a.lon) * rad;
  const h = Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** The physical minimum for a round trip over `km` of fiber. */
export function minRoundTripMs(km: number): number {
  return (2 * km) / FIBER_KM_PER_MS;
}

/** The closest city in a list, with its distance. */
export function nearest(
  from: City,
  candidates: readonly City[],
): { city: City; km: number } {
  return candidates
    .map((city) => ({ city, km: greatCircleKm(from, city) }))
    .reduce((best, next) => next.km < best.km ? next : best);
}

/** Origin-vs-edge comparison for one customer. */
export interface LatencyComparison {
  readonly originKm: number;
  readonly originMs: number;
  readonly edge: City;
  readonly edgeKm: number;
  readonly edgeMs: number;
}

/** Compare a single origin server with the nearest edge location. */
export function compareLatency(
  customer: City,
  origin: City,
): LatencyComparison {
  const originKm = greatCircleKm(customer, origin);
  const { city, km } = nearest(customer, EDGE_CITIES);
  return {
    originKm,
    originMs: minRoundTripMs(originKm),
    edge: city,
    edgeKm: km,
    edgeMs: minRoundTripMs(km),
  };
}
