import { APPLIANCES, type Appliance, type ApplianceUsage } from "@/data/appliances";
import { DEFAULT_LOAD } from "./simulate";

export type LoadItem = {
  id: string;
  name: string;
  count: number;
  hours: number;
  dailyKwh: number;
  watts: number;
  surgeW: number;
};

export type HourlyLoad = {
  dailyKwh: number;
  peakKw: number;
  peakHour: number;
  surgeKw: number;
  hoursKw: number[];
  profile: number[];
  items: LoadItem[];
};

export function dailyKwhOf(appliance: Appliance, usage: ApplianceUsage): number {
  const count = Math.max(0, usage.count);
  const hours = Math.max(0, usage.hours);
  return (count * appliance.watts * hours * appliance.duty) / 1000;
}

export function buildHourlyLoad(
  usages: Record<string, ApplianceUsage>,
  extraDailyKwh = 0,
): HourlyLoad {
  const hoursKw = Array.from({ length: 24 }, () => 0);
  const instantKw = Array.from({ length: 24 }, () => 0);
  const items: LoadItem[] = [];
  let surgeKw = 0;

  for (const appliance of APPLIANCES) {
    const usage = usages[appliance.id];
    if (!usage || usage.count <= 0) continue;
    const daily = dailyKwhOf(appliance, usage);
    if (daily <= 0) continue;
    items.push({
      id: appliance.id,
      name: appliance.name,
      count: usage.count,
      hours: usage.hours,
      dailyKwh: daily,
      watts: appliance.watts,
      surgeW: appliance.surgeW,
    });
    surgeKw = Math.max(surgeKw, (usage.count * appliance.surgeW) / 1000);
    const runningKw = (usage.count * appliance.watts * appliance.duty) / 1000;
    for (let h = 0; h < 24; h += 1) {
      const share = appliance.hourlyShare[h] ?? 0;
      hoursKw[h] += daily * share;
      if (share > 0.02) instantKw[h] += runningKw;
    }
  }

  const extra = Math.max(0, extraDailyKwh);
  if (extra > 0) {
    items.push({
      id: "extra",
      name: "Otros",
      count: 1,
      hours: 24,
      dailyKwh: extra,
      watts: 0,
      surgeW: 0,
    });
    for (let h = 0; h < 24; h += 1) {
      hoursKw[h] += extra * (DEFAULT_LOAD[h] ?? 1 / 24);
    }
  }

  const dailyKwh = hoursKw.reduce((a, b) => a + b, 0);
  const profile =
    dailyKwh > 0 ? hoursKw.map((kw) => kw / dailyKwh) : Array.from({ length: 24 }, () => 1 / 24);

  let peakKw = 0;
  let peakHour = 0;
  for (let h = 0; h < 24; h += 1) {
    const peak = Math.max(hoursKw[h], instantKw[h]);
    if (peak > peakKw) {
      peakKw = peak;
      peakHour = h;
    }
  }

  items.sort((a, b) => b.dailyKwh - a.dailyKwh);
  return { dailyKwh, peakKw, peakHour, surgeKw, hoursKw, profile, items };
}
