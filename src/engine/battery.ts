import { clamp } from "./math";
import type { BatterySpec } from "./types";

export type BatteryState = {
  soc: number;
  energyKwh: number;
};

export function usableKwh(spec: BatterySpec, count: number): number {
  return spec.nominalKwh * count * spec.dod;
}

export function installedKwh(spec: BatterySpec, count: number): number {
  return spec.nominalKwh * count;
}

function splitRoundTrip(rte: number): { charge: number; discharge: number } {
  const eta = Math.sqrt(clamp(rte, 0.5, 0.99));
  return { charge: eta, discharge: eta };
}

export function createBatteryState(spec: BatterySpec, count: number, soc = 0.5): BatteryState {
  const energy = installedKwh(spec, count);
  return { soc: clamp(soc, 1 - spec.dod, 1), energyKwh: energy };
}

/**
 * Charge from available DC energy this hour.
 * Returns DC energy actually absorbed (before charge efficiency).
 */
export function chargeBattery(
  spec: BatterySpec,
  count: number,
  state: BatteryState,
  availableDcKwh: number,
  hours = 1,
): { absorbedDc: number; stored: number; state: BatteryState } {
  if (availableDcKwh <= 0 || count <= 0) {
    return { absorbedDc: 0, stored: 0, state };
  }
  const { charge } = splitRoundTrip(spec.roundTripEfficiency);
  const minSoc = 1 - spec.dod;
  const headroom = Math.max(state.energyKwh * (1 - state.soc), 0);
  const powerCap = spec.nominalKwh * count * spec.cCharge * hours;
  const stored = Math.min(headroom, availableDcKwh * charge, powerCap * charge);
  const absorbedDc = stored / charge;
  const nextEnergy = state.energyKwh * state.soc + stored;
  const soc = state.energyKwh > 0 ? clamp(nextEnergy / state.energyKwh, minSoc, 1) : 0;
  return { absorbedDc, stored, state: { ...state, soc } };
}

/**
 * Discharge to cover a DC-bus deficit.
 * Returns DC energy delivered to the bus (after discharge efficiency).
 */
export function dischargeBattery(
  spec: BatterySpec,
  count: number,
  state: BatteryState,
  neededDcKwh: number,
  hours = 1,
): { deliveredDc: number; withdrawn: number; state: BatteryState } {
  if (neededDcKwh <= 0 || count <= 0) {
    return { deliveredDc: 0, withdrawn: 0, state };
  }
  const { discharge } = splitRoundTrip(spec.roundTripEfficiency);
  const minSoc = 1 - spec.dod;
  const available = Math.max(state.energyKwh * (state.soc - minSoc), 0);
  const powerCap = spec.nominalKwh * count * spec.cDischarge * hours;
  const withdrawn = Math.min(available, neededDcKwh / discharge, powerCap);
  const deliveredDc = withdrawn * discharge;
  const nextEnergy = state.energyKwh * state.soc - withdrawn;
  const soc = state.energyKwh > 0 ? clamp(nextEnergy / state.energyKwh, minSoc, 1) : 0;
  return { deliveredDc, withdrawn, state: { ...state, soc } };
}
