import { lookup } from "./math";
import type { EfficiencyPoint, InverterSpec } from "./types";

export type InvertResult = {
  pAc: number;
  loss: number;
  eta: number;
  clipped: number;
  pDcUsed: number;
};

export function inverterEfficiency(curve: EfficiencyPoint[], loadFrac: number): number {
  const points = curve.map((p) => ({ x: p.load, y: p.eta }));
  return lookup(points, loadFrac);
}

/**
 * DC→AC conversion with a measured efficiency curve, DC input limit,
 * AC rated clipping and standby consumption.
 *
 * Pac = η(load) · Pdc − Pstandby, then clipped to Pac,rated.
 */
export function invert(pDcKw: number, inverter: InverterSpec): InvertResult {
  if (pDcKw <= 0) {
    return {
      pAc: 0,
      loss: inverter.nightConsumptionKw,
      eta: 0,
      clipped: 0,
      pDcUsed: 0,
    };
  }

  const pDcUsed = Math.min(pDcKw, inverter.pDcMaxKw);
  const dcHeadroomClip = pDcKw - pDcUsed;

  // First guess: load fraction vs rated AC using DC power.
  let loadFrac = pDcUsed / inverter.pAcKw;
  let eta = inverterEfficiency(inverter.efficiencyCurve, loadFrac);
  let pAc = Math.max(pDcUsed * eta - inverter.standbyKw, 0);

  // Refine η with the resulting AC load fraction.
  loadFrac = pAc / inverter.pAcKw;
  eta = inverterEfficiency(inverter.efficiencyCurve, loadFrac);
  pAc = Math.max(pDcUsed * eta - inverter.standbyKw, 0);

  let clipped = dcHeadroomClip;
  if (pAc > inverter.pAcKw) {
    clipped += pAc - inverter.pAcKw;
    pAc = inverter.pAcKw;
  }

  const loss = Math.max(pDcUsed - pAc, 0);
  const trueEta = pDcUsed > 0 ? pAc / pDcUsed : 0;
  return { pAc, loss, eta: trueEta, clipped, pDcUsed };
}

export function dcacRatio(arrayKw: number, inverter: InverterSpec): number {
  return inverter.pAcKw > 0 ? arrayKw / inverter.pAcKw : 0;
}
