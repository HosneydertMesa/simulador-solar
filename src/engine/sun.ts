import { clamp, DEG, RAD } from "./math";

/** Solar declination in degrees (approximate Cooper formula). */
export function declination(dayOfYear: number): number {
  return 23.45 * Math.sin(((360 / 365) * (284 + dayOfYear)) * RAD);
}

export function hourAngle(hour: number): number {
  return 15 * (hour - 12);
}

export function sunsetHourAngle(latDeg: number, declDeg: number): number {
  const arg = clamp(-Math.tan(latDeg * RAD) * Math.tan(declDeg * RAD), -1, 1);
  return Math.acos(arg) * DEG;
}

export function solarAltitude(
  latDeg: number,
  declDeg: number,
  hourAngleDeg: number,
): number {
  const phi = latDeg * RAD;
  const delta = declDeg * RAD;
  const omega = hourAngleDeg * RAD;
  const sinAlt =
    Math.sin(phi) * Math.sin(delta) +
    Math.cos(phi) * Math.cos(delta) * Math.cos(omega);
  return Math.asin(clamp(sinAlt, -1, 1)) * DEG;
}

/**
 * Compass azimuth, degrees clockwise from north.
 * 0 = north, 90 = east, 180 = south.
 */
export function solarAzimuth(
  latDeg: number,
  declDeg: number,
  hourAngleDeg: number,
  altitudeDeg: number,
): number {
  const phi = latDeg * RAD;
  const delta = declDeg * RAD;
  const omega = hourAngleDeg * RAD;
  const alt = altitudeDeg * RAD;
  const cosAz =
    (Math.sin(delta) * Math.cos(phi) -
      Math.cos(delta) * Math.sin(phi) * Math.cos(omega)) /
    Math.max(Math.cos(alt), 1e-6);
  const azSouth = Math.acos(clamp(cosAz, -1, 1)) * DEG;
  const fromSouth = omega > 0 ? azSouth : -azSouth;
  return (fromSouth + 180 + 360) % 360;
}

/**
 * Incidence angle on a tilted plane.
 * azimuthDeg is compass degrees from north.
 */
export function incidenceAngle(
  latDeg: number,
  declDeg: number,
  hourAngleDeg: number,
  tiltDeg: number,
  azimuthDeg: number,
): number {
  const phi = latDeg * RAD;
  const delta = declDeg * RAD;
  const omega = hourAngleDeg * RAD;
  const beta = tiltDeg * RAD;
  const gamma = (azimuthDeg - 180) * RAD;
  const cosTheta =
    Math.sin(delta) * Math.sin(phi) * Math.cos(beta) -
    Math.sin(delta) * Math.cos(phi) * Math.sin(beta) * Math.cos(gamma) +
    Math.cos(delta) * Math.cos(phi) * Math.cos(beta) * Math.cos(omega) +
    Math.cos(delta) * Math.sin(phi) * Math.sin(beta) * Math.cos(gamma) * Math.cos(omega) +
    Math.cos(delta) * Math.sin(beta) * Math.sin(gamma) * Math.sin(omega);
  return Math.acos(clamp(cosTheta, -1, 1)) * DEG;
}

/** ASHRAE incidence-angle modifier. */
export function iam(incidenceDeg: number, b0 = 0.05): number {
  if (incidenceDeg >= 85) return 0;
  const inv = 1 / Math.cos(incidenceDeg * RAD) - 1;
  return clamp(1 - b0 * inv, 0, 1);
}

export function sunVector(altitudeDeg: number, azimuthDeg: number): [number, number, number] {
  const alt = altitudeDeg * RAD;
  const az = azimuthDeg * RAD;
  return [
    Math.cos(alt) * Math.sin(az),
    Math.sin(alt),
    Math.cos(alt) * Math.cos(az),
  ];
}
