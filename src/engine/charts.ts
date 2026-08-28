import { daysInMonth } from "./math";
import type { HourSample } from "./types";

export type DayPoint = {
  hour: number;
  solarKw: number;
  loadKw: number;
};

export function dayProfile(hours: HourSample[], month: number): DayPoint[] {
  const ofMonth = hours.filter((h) => h.month === month);
  return Array.from({ length: 24 }, (_, hour) => {
    const sample = ofMonth.find((h) => h.hour === hour);
    return {
      hour,
      solarKw: sample?.inverterAc ?? 0,
      loadKw: sample?.load ?? 0,
    };
  });
}

export function monthlyProductionKwh(hours: HourSample[]): number[] {
  return Array.from({ length: 12 }, (_, i) => {
    const month = i + 1;
    const dayKwh = hours
      .filter((h) => h.month === month)
      .reduce((sum, h) => sum + h.inverterAc, 0);
    return dayKwh * daysInMonth(month);
  });
}
