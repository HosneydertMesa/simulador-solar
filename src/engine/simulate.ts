import { daysInMonth, midMonthDayOfYear } from "./math";
import {
  chargeBattery,
  createBatteryState,
  dischargeBattery,
  installedKwh,
} from "./battery";
import { invert } from "./inverter";
import { planeOfArray } from "./irradiance";
import { arrayNameplateKw, cellTemperature, moduleDcW } from "./pv";
import type {
  AnnualResult,
  HourSample,
  LossBreakdown,
  SystemConfig,
} from "./types";
import { isIslanded } from "./types";

const DEFAULT_LOAD = [
  0.018, 0.018, 0.018, 0.018, 0.018, 0.018, 0.045, 0.055, 0.05, 0.035, 0.035,
  0.035, 0.04, 0.04, 0.04, 0.04, 0.05, 0.065, 0.085, 0.09, 0.075, 0.055, 0.035,
  0.022,
];

function loadKw(dailyKwh: number, profile: number[], hour: number): number {
  const frac = profile[hour] ?? 1 / 24;
  return dailyKwh * frac;
}

function emptyHour(month: number, hour: number): HourSample {
  return {
    month,
    hour,
    ghi: 0,
    poa: 0,
    tAmb: 0,
    tCell: 0,
    pvDcIdeal: 0,
    pvDc: 0,
    inverterAc: 0,
    inverterLoss: 0,
    clipped: 0,
    batteryCharge: 0,
    batteryDischarge: 0,
    soc: 0,
    load: 0,
    gridImport: 0,
    gridExport: 0,
    unmet: 0,
  };
}

function simulateHour(
  config: SystemConfig,
  month: number,
  hour: number,
  batteryState: ReturnType<typeof createBatteryState>,
): { sample: HourSample; batteryState: typeof batteryState } {
  const day = midMonthDayOfYear(month);
  const { ghi, poa, tAmb } = planeOfArray({
    location: config.location,
    month,
    dayOfYear: day,
    hour,
    tiltDeg: config.tiltDeg,
    azimuthDeg: config.azimuthDeg,
    albedo: config.derate.albedo,
  });

  const tCell = cellTemperature(tAmb, poa, config.panel.noctC);
  const moduleW = moduleDcW(config.panel, poa, tCell);
  const pvDcIdeal = (moduleW * config.panelCount) / 1000;
  const afterSoiling = pvDcIdeal * (1 - config.derate.soiling);
  const afterMismatch = afterSoiling * (1 - config.derate.mismatch);
  const afterLid = afterMismatch * (1 - config.derate.lid) * (1 - config.derate.nameplate);
  const dcWiringLoss = afterLid * config.derate.dcWiring;
  const pvDc = Math.max(afterLid - dcWiringLoss, 0);

  const load = loadKw(config.dailyLoadKwh, config.loadProfile, hour);
  const hasBattery =
    config.battery !== null &&
    config.batteryCount > 0 &&
    config.topology !== "ongrid";
  const canExport = !isIslanded(config.topology);
  const canImport = !isIslanded(config.topology);

  let sample = emptyHour(month, hour);
  sample = {
    ...sample,
    ghi,
    poa,
    tAmb,
    tCell,
    pvDcIdeal,
    pvDc,
    load,
    soc: batteryState.soc,
  };

  if (!hasBattery || !config.battery) {
    const inv = invert(pvDc, config.inverter);
    const ac = inv.pAc * (1 - config.derate.acWiring) * config.derate.availability;
    sample.inverterAc = ac;
    sample.inverterLoss = inv.loss;
    sample.clipped = inv.clipped;
    if (ac >= load) {
      sample.gridExport = canExport ? ac - load : 0;
      sample.unmet = canExport ? 0 : load > ac ? load - ac : 0;
    } else if (canImport) {
      sample.gridImport = load - ac;
    } else {
      sample.unmet = load - ac;
    }
    return { sample, batteryState };
  }

  const invForLoad = invert(Math.max(load / 0.97, load), config.inverter);
  const etaServe = Math.max(invForLoad.eta || config.inverter.euroEfficiency, 0.85);
  const dcForLoad = load / etaServe;

  let charge = 0;
  let discharge = 0;
  let next = batteryState;
  let dcToInverter = 0;

  if (pvDc >= dcForLoad) {
    const surplus = pvDc - dcForLoad;
    const charged = chargeBattery(config.battery, config.batteryCount, next, surplus);
    charge = charged.absorbedDc;
    next = charged.state;
    const leftover = surplus - charge;
    dcToInverter = dcForLoad + (canExport ? leftover : 0);
  } else {
    const deficit = dcForLoad - pvDc;
    const dis = dischargeBattery(config.battery, config.batteryCount, next, deficit);
    discharge = dis.deliveredDc;
    next = dis.state;
    dcToInverter = pvDc + discharge;
  }

  const inv = invert(dcToInverter, config.inverter);
  const ac = inv.pAc * (1 - config.derate.acWiring) * config.derate.availability;
  sample.inverterAc = ac;
  sample.inverterLoss = inv.loss;
  sample.clipped = inv.clipped;
  sample.batteryCharge = charge;
  sample.batteryDischarge = discharge;
  sample.soc = next.soc;

  if (ac >= load) {
    sample.gridExport = canExport ? ac - load : 0;
  } else if (canImport) {
    sample.gridImport = load - ac;
  } else {
    sample.unmet = load - ac;
  }

  return { sample, batteryState: next };
}

export function simulateYear(config: SystemConfig): AnnualResult {
  const profile =
    config.loadProfile.length === 24 ? config.loadProfile : DEFAULT_LOAD;
  const cfg = { ...config, loadProfile: profile };
  let batteryState = cfg.battery
    ? createBatteryState(cfg.battery, cfg.batteryCount, 0.5)
    : createBatteryState(
        {
          id: "none",
          brand: "",
          model: "",
          chemistry: "lfp",
          nominalKwh: 0,
          voltageV: 48,
          dod: 0.9,
          roundTripEfficiency: 0.95,
          cCharge: 0.5,
          cDischarge: 0.5,
          cyclesTo80: 1,
          calendarFadePctPerYear: 0,
        },
        0,
        0.5,
      );

  const hours: HourSample[] = [];
  const totals = {
    kwhPvDcIdeal: 0,
    kwhPvDc: 0,
    kwhAc: 0,
    kwhLoad: 0,
    kwhImport: 0,
    kwhExport: 0,
    kwhUnmet: 0,
    kwhCharge: 0,
    kwhDischarge: 0,
    kwhInverterLoss: 0,
    kwhClipping: 0,
    kwhDcLosses: 0,
    kwhAcWiring: 0,
    poaKwhM2: 0,
    peakAcKw: 0,
  };

  for (let month = 1; month <= 12; month += 1) {
    const weight = daysInMonth(month);
    for (let hour = 0; hour < 24; hour += 1) {
      const step = simulateHour(cfg, month, hour, batteryState);
      batteryState = step.batteryState;
      hours.push(step.sample);
      const s = step.sample;
      totals.kwhPvDcIdeal += s.pvDcIdeal * weight;
      totals.kwhPvDc += s.pvDc * weight;
      totals.kwhAc += s.inverterAc * weight;
      totals.kwhLoad += s.load * weight;
      totals.kwhImport += s.gridImport * weight;
      totals.kwhExport += s.gridExport * weight;
      totals.kwhUnmet += s.unmet * weight;
      totals.kwhCharge += s.batteryCharge * weight;
      totals.kwhDischarge += s.batteryDischarge * weight;
      totals.kwhInverterLoss += s.inverterLoss * weight;
      totals.kwhClipping += s.clipped * weight;
      totals.kwhDcLosses += Math.max(s.pvDcIdeal - s.pvDc, 0) * weight;
      totals.kwhAcWiring += s.inverterAc * cfg.derate.acWiring * weight;
      totals.poaKwhM2 += (s.poa / 1000) * weight;
      totals.peakAcKw = Math.max(totals.peakAcKw, s.inverterAc);
    }
  }

  const kwhBatteryRteLoss = Math.max(totals.kwhCharge - totals.kwhDischarge, 0);
  const losses: LossBreakdown = {
    irradianceTemp: Math.max(totals.kwhPvDcIdeal, 0),
    soiling: totals.kwhPvDcIdeal * cfg.derate.soiling,
    mismatch: totals.kwhPvDcIdeal * (1 - cfg.derate.soiling) * cfg.derate.mismatch,
    lid: totals.kwhPvDcIdeal * cfg.derate.lid,
    dcWiring: totals.kwhDcLosses,
    inverter: totals.kwhInverterLoss,
    clipping: totals.kwhClipping,
    acWiring: totals.kwhAcWiring,
    batteryRte: kwhBatteryRteLoss,
  };

  const arrayKw = arrayNameplateKw(cfg.panel, cfg.panelCount);
  const fromPvToLoad = Math.max(totals.kwhAc - totals.kwhExport, 0);
  const performanceRatio =
    totals.poaKwhM2 > 0 && arrayKw > 0
      ? totals.kwhAc / (totals.poaKwhM2 * arrayKw)
      : 0;
  const selfConsumption =
    totals.kwhAc > 0 ? clamp01(fromPvToLoad / totals.kwhAc) : 0;
  const selfSufficiency =
    totals.kwhLoad > 0 ? clamp01(1 - totals.kwhImport / totals.kwhLoad) : 0;
  const capacityFactor =
    arrayKw > 0 ? totals.kwhAc / (arrayKw * 8760) : 0;

  const bank = cfg.battery ? installedKwh(cfg.battery, cfg.batteryCount) : 0;
  const avgLoad = totals.kwhLoad / 8760;
  const autonomyHoursAvg = avgLoad > 0 ? (bank * (cfg.battery?.dod ?? 0)) / avgLoad : 0;

  return {
    hours,
    ...totals,
    kwhBatteryRteLoss,
    losses,
    performanceRatio,
    selfConsumption,
    selfSufficiency,
    capacityFactor,
    autonomyHoursAvg,
  };
}

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v));
}

export { DEFAULT_LOAD };
