export const RAD = Math.PI / 180;
export const DEG = 180 / Math.PI;

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function sum(values: number[]): number {
  return values.reduce((acc, v) => acc + v, 0);
}

/** Linear interpolation on a sorted lookup table. */
export function lookup(
  points: ReadonlyArray<{ x: number; y: number }>,
  x: number,
): number {
  if (points.length === 0) return 0;
  if (x <= points[0].x) return points[0].y;
  for (let i = 1; i < points.length; i += 1) {
    if (x <= points[i].x) {
      const span = points[i].x - points[i - 1].x;
      const t = span === 0 ? 0 : (x - points[i - 1].x) / span;
      return lerp(points[i - 1].y, points[i].y, t);
    }
  }
  return points[points.length - 1].y;
}

export function daysInMonth(month: number): number {
  return [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1] ?? 30;
}

/** Representative day-of-year for the 15th of each month (non-leap). */
export function midMonthDayOfYear(month: number): number {
  return [15, 46, 74, 105, 135, 166, 196, 227, 258, 288, 319, 349][month - 1] ?? 180;
}
