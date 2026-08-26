import { describe, expect, it } from "vitest";
import { invert } from "../inverter";
import { moduleDcW } from "../pv";
import { PANELS, INVERTERS } from "@/data/catalog";
import { chargeBattery, createBatteryState, dischargeBattery } from "../battery";
import { BATTERIES } from "@/data/catalog";
import { simulateYear } from "../simulate";
import { LOCATIONS } from "@/data/locations";
import { DEFAULT_DERATE } from "@/data/catalog";
import type { SystemConfig } from "../types";

const panel = PANELS[0];
const hybrid = INVERTERS.find((i) => i.id === "deye-sun-8k")!;
const battery = BATTERIES[0];

describe("módulo FV", () => {
  it("en STC entrega aproximadamente Pmax", () => {
    const w = moduleDcW(panel, 1000, 25);
    expect(w).toBeCloseTo(panel.pmaxW * (1 + panel.bifacialGain), 6);
  });

  it("a 1000 W/m² y 45 °C pierde potencia (coef. negativo)", () => {
    const hot = moduleDcW(panel, 1000, 45);
    const stc = moduleDcW(panel, 1000, 25);
    expect(hot).toBeLessThan(stc);
  });

  it("sin irradiancia no genera", () => {
    expect(moduleDcW(panel, 0, 25)).toBe(0);
  });
});

describe("inversor DC→AC", () => {
  it("en vacío no entrega AC", () => {
    const r = invert(0, hybrid);
    expect(r.pAc).toBe(0);
  });

  it("recorta cuando DC supera el límite AC", () => {
    const r = invert(20, hybrid);
    expect(r.pAc).toBeLessThanOrEqual(hybrid.pAcKw);
    expect(r.clipped).toBeGreaterThan(0);
  });

  it("la eficiencia en carga parcial está entre 0.7 y 1", () => {
    const r = invert(4, hybrid);
    expect(r.eta).toBeGreaterThan(0.7);
    expect(r.eta).toBeLessThanOrEqual(1);
    expect(r.pAc + r.loss).toBeCloseTo(r.pDcUsed, 5);
  });
});

describe("batería", () => {
  it("no carga por encima del 100% SoC", () => {
    const state = createBatteryState(battery, 2, 0.99);
    const r = chargeBattery(battery, 2, state, 50);
    expect(r.state.soc).toBeLessThanOrEqual(1);
  });

  it("respeta el DoD al descargar", () => {
    const state = createBatteryState(battery, 1, 0.5);
    const r = dischargeBattery(battery, 1, state, 100);
    expect(r.state.soc).toBeGreaterThanOrEqual(1 - battery.dod - 1e-9);
  });

  it("el round-trip pierde energía", () => {
    const state = createBatteryState(battery, 1, 0.4);
    const charged = chargeBattery(battery, 1, state, 1);
    const discharged = dischargeBattery(battery, 1, charged.state, charged.stored);
    expect(discharged.deliveredDc).toBeLessThan(charged.absorbedDc);
  });
});

describe("simulación anual", () => {
  const base = (): SystemConfig => ({
    topology: "ongrid",
    location: LOCATIONS[1],
    tiltDeg: 10,
    azimuthDeg: 180,
    panel,
    panelCount: 10,
    inverter: hybrid,
    battery: null,
    batteryCount: 0,
    dailyLoadKwh: 12,
    loadProfile: [],
    derate: DEFAULT_DERATE,
  });

  it("en on-grid sin carga exporta casi toda la generación AC", () => {
    const r = simulateYear({ ...base(), dailyLoadKwh: 0 });
    expect(r.kwhAc).toBeGreaterThan(1000);
    expect(r.kwhExport).toBeGreaterThan(r.kwhAc * 0.9);
    expect(r.kwhImport).toBe(0);
  });

  it("de noche on-grid importa la carga", () => {
    const r = simulateYear(base());
    expect(r.kwhImport).toBeGreaterThan(0);
    expect(r.kwhLoad).toBeCloseTo(12 * 365, 0);
  });

  it("off-grid con batería reduce energía no cubierta vs sin batería", () => {
    const none = simulateYear({
      ...base(),
      topology: "offgrid",
      battery: null,
      batteryCount: 0,
    });
    const withBat = simulateYear({
      ...base(),
      topology: "offgrid",
      battery,
      batteryCount: 6,
    });
    expect(withBat.kwhUnmet).toBeLessThan(none.kwhUnmet);
  });

  it("las pérdidas del inversor son positivas y menores que el DC", () => {
    const r = simulateYear(base());
    expect(r.kwhInverterLoss).toBeGreaterThan(0);
    expect(r.kwhInverterLoss).toBeLessThan(r.kwhPvDc);
  });
});
