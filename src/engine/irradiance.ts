import { clamp, RAD } from "./math";
import {
  declination,
  hourAngle,
  iam,
  incidenceAngle,
  solarAltitude,
  sunsetHourAngle,
} from "./sun";
import type { Location } from "./types";

const SOLAR_CONSTANT = 1367;

function extraterrestrial(dayOfYear: number): number {
  return SOLAR_CONSTANT * (1 + 0.033 * Math.cos((360 * dayOfYear * RAD) / 365));
}

/** Erbs correlation: diffuse fraction of GHI from clearness index. */
export function diffuseFraction(kt: number): number {
  if (kt <= 0.22) return 1 - 0.09 * kt;
  if (kt <= 0.8) {
    return (
      0.9511 -
      0.1604 * kt +
      4.388 * kt ** 2 -
      16.638 * kt ** 3 +
      12.336 * kt ** 4
    );
  }
  return 0.165;
}

/**
 * Hourly GHI (W/m²) from monthly-mean daily irradiation using a sine-shaped
 * diurnal profile that conserves the daily integral.
 */
export function hourlyGhi(
  location: Location,
  month: number,
  dayOfYear: number,
  hour: number,
): number {
  const dailyKwh = location.ghiKwhM2Day[month - 1] ?? 4.5;
  const delta = declination(dayOfYear);
  const ws = sunsetHourAngle(location.lat, delta) * RAD;
  const dayLengthH = Math.max((2 * (ws * (180 / Math.PI))) / 15, 0.5);
  const sunrise = 12 - dayLengthH / 2;
  const sunset = 12 + dayLengthH / 2;
  if (hour < sunrise || hour >= sunset) return 0;

  const t = (hour + 0.5 - sunrise) / dayLengthH;
  const shape = Math.sin(Math.PI * clamp(t, 0, 1));
  const meanShape = 2 / Math.PI;
  return (dailyKwh * 1000 * shape) / (dayLengthH * meanShape);
}

export function planeOfArray(args: {
  location: Location;
  month: number;
  dayOfYear: number;
  hour: number;
  tiltDeg: number;
  azimuthDeg: number;
  albedo: number;
}): { ghi: number; poa: number; tAmb: number; altitude: number } {
  const { location, month, dayOfYear, hour, tiltDeg, azimuthDeg, albedo } = args;
  const ghi = hourlyGhi(location, month, dayOfYear, hour);
  const tAmb = location.tempC[month - 1] ?? 22;
  const delta = declination(dayOfYear);
  const omega = hourAngle(hour + 0.5);
  const altitude = solarAltitude(location.lat, delta, omega);
  if (ghi <= 0 || altitude <= 0) {
    return { ghi: 0, poa: 0, tAmb, altitude };
  }

  const zenithCos = Math.max(Math.sin(altitude * RAD), 0.017);
  const gon = extraterrestrial(dayOfYear);
  const kt = clamp(ghi / (gon * zenithCos), 0, 1);
  const kd = diffuseFraction(kt);
  const gd = ghi * kd;
  const gbHoriz = Math.max(ghi - gd, 0);
  const dni = gbHoriz / zenithCos;

  const theta = incidenceAngle(location.lat, delta, omega, tiltDeg, azimuthDeg);
  const beam = dni * Math.max(Math.cos(theta * RAD), 0) * iam(theta);
  const sky = gd * (1 + Math.cos(tiltDeg * RAD)) / 2;
  const ground = ghi * albedo * (1 - Math.cos(tiltDeg * RAD)) / 2;
  const poa = Math.max(beam + sky + ground, 0);

  return { ghi, poa, tAmb, altitude };
}
