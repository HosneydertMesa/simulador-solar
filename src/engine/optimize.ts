import { evaluateEconomics } from "./economics";
import { dcacRatio } from "./inverter";
import { arrayNameplateKw, suggestStringing } from "./pv";
import { simulateYear } from "./simulate";
import type {
  BatterySpec,
  DerateAssumptions,
  InverterKind,
  InverterSpec,
  Location,
  PanelSpec,
  Quote,
  Supplier,
  SystemConfig,
  Topology,
} from "./types";
import { formFactorOf } from "./types";

export type Catalog = {
  panels: PanelSpec[];
  inverters: InverterSpec[];
  batteries: BatterySpec[];
  suppliers: Supplier[];
};

export type OptimizeInput = {
  location: Location;
  topology: Topology;
  tiltDeg: number;
  azimuthDeg: number;
  dailyLoadKwh: number;
  loadProfile: number[];
  autonomyDays: number;
  derate: DerateAssumptions;
  catalog: Catalog;
  tariffCopPerKwh: number;
  exportCopPerKwh: number;
  usdCop: number;
  projectYears: number;
  discountRate: number;
};

function inverterFits(kind: InverterKind, topology: Topology): boolean {
  if (topology === "ongrid") return kind === "string" || kind === "hybrid";
  if (topology === "hybrid") return kind === "hybrid";
  if (topology === "portable") return kind === "portable";
  return kind === "hybrid" || kind === "offgrid";
}

function gearFitsPortable(
  topology: Topology,
  panel: PanelSpec,
  inverter: InverterSpec,
  battery: BatterySpec | null,
): boolean {
  const want = topology === "portable" ? "portable" : "rooftop";
  if (formFactorOf(panel) !== want) return false;
  if (formFactorOf(inverter) !== want) return false;
  if (battery && formFactorOf(battery) !== want) return false;
  if (want === "portable" && battery && battery.brand !== inverter.brand) return false;
  return true;
}

function voltageClass(volts: number): "lv" | "hv" {
  return volts >= 90 ? "hv" : "lv";
}

function batteryFits(inverter: InverterSpec, battery: BatterySpec | null): boolean {
  if (!battery) return true;
  if (inverter.kind === "string") return false;
  if (inverter.batteryVoltageV == null) return true;
  return voltageClass(inverter.batteryVoltageV) === voltageClass(battery.voltageV);
}

function priceOf(supplier: Supplier, productId: string): { unitUsd: number; shippingUsd: number } | null {
  const p = supplier.prices[productId];
  return p ?? null;
}

function sizePanelCount(
  dailyLoadKwh: number,
  location: Location,
  pmaxW: number,
  topology: Topology,
): number {
  const ghi = location.ghiKwhM2Day.reduce((a, b) => a + b, 0) / 12;
  const yieldKwhPerW = (ghi * 365 * 0.78) / 1000;
  const annualLoad = dailyLoadKwh * 365;
  const watts = annualLoad / Math.max(yieldKwhPerW, 0.8);
  if (topology === "portable") {
    return Math.min(8, Math.max(1, Math.ceil(watts / pmaxW)));
  }
  return Math.max(4, Math.ceil(watts / pmaxW));
}

function sizeBatteryCount(
  dailyLoadKwh: number,
  autonomyDays: number,
  spec: BatterySpec | null,
  topology: Topology,
): number {
  if (!spec || topology === "ongrid") return 0;
  if (topology === "portable") return 1;
  const need = dailyLoadKwh * autonomyDays;
  const usable = spec.nominalKwh * spec.dod * spec.roundTripEfficiency;
  return Math.max(1, Math.ceil(need / Math.max(usable, 0.5)));
}

function quoteFor(args: {
  supplier: Supplier;
  panel: PanelSpec;
  inverter: InverterSpec;
  battery: BatterySpec | null;
  panelCount: number;
  batteryCount: number;
  input: OptimizeInput;
}): Quote | null {
  const { supplier, panel, inverter, battery, panelCount, batteryCount, input } = args;
  const panelPrice = priceOf(supplier, panel.id);
  const invPrice = priceOf(supplier, inverter.id);
  if (!panelPrice || !invPrice) return null;
  const batPrice = battery ? priceOf(supplier, battery.id) : { unitUsd: 0, shippingUsd: 0 };
  if (battery && !batPrice) return null;

  const config: SystemConfig = {
    topology: input.topology,
    location: input.location,
    tiltDeg: input.tiltDeg,
    azimuthDeg: input.azimuthDeg,
    panel,
    panelCount,
    inverter,
    battery,
    batteryCount,
    dailyLoadKwh: input.dailyLoadKwh,
    loadProfile: input.loadProfile,
    derate: input.derate,
  };
  const annual = simulateYear(config);
  const arrayKw = arrayNameplateKw(panel, panelCount);
  const shippingUsd =
      panelPrice.shippingUsd * panelCount +
      invPrice.shippingUsd +
      (batPrice?.shippingUsd ?? 0) * batteryCount;
  const portable = input.topology === "portable";
  const economics = evaluateEconomics(annual, {
    panelUnitUsd: panelPrice.unitUsd,
    inverterUnitUsd: invPrice.unitUsd,
    batteryUnitUsd: batPrice?.unitUsd ?? 0,
    panelCount,
    inverterCount: 1,
    batteryCount,
    shippingUsd,
    laborPerWpUsd: portable ? 0 : supplier.laborPerWpUsd,
    mountingPerWpUsd: portable ? 0 : supplier.mountingPerWpUsd,
    bosPerWpUsd: portable ? Math.min(supplier.bosPerWpUsd, 0.03) : supplier.bosPerWpUsd,
    arrayKw,
    tariffCopPerKwh: input.tariffCopPerKwh,
    exportCopPerKwh: portable ? 0 : input.exportCopPerKwh,
    usdCop: input.usdCop,
    projectYears: portable ? Math.min(input.projectYears, 10) : input.projectYears,
    discountRate: input.discountRate,
    opexPctCapex: portable ? 0.02 : 0.012,
    inverterReplaceYear: portable ? 8 : 12,
    inverterReplaceUsd: invPrice.unitUsd * (portable ? 0.5 : 0.7),
  });

  const stringing = suggestStringing(
    panel,
    inverter,
    panelCount,
    input.derate.tMinC,
    input.derate.tMaxC,
  );
  const warnings = [...stringing.warnings];
  const ratio = dcacRatio(arrayKw, inverter);
  if (ratio > 1.4) warnings.push(`Relación DC/AC alta (${ratio.toFixed(2)}). Habrá recorte en picos.`);
  if (ratio < 0.9) warnings.push(`Inversor sobredimensionado (DC/AC ${ratio.toFixed(2)}).`);
  if (annual.kwhUnmet > annual.kwhLoad * 0.05) {
    warnings.push(`Energía no cubierta: ${annual.kwhUnmet.toFixed(0)} kWh/año.`);
  }
  if (input.topology !== "ongrid" && batteryCount === 0) {
    warnings.push("Topología con almacenamiento pero sin baterías.");
  }

  const score =
    1 / Math.max(economics.lcoeUsdPerKwh, 0.01) +
    annual.selfSufficiency * 2 +
    (Number.isFinite(economics.simplePaybackYears)
      ? 8 / Math.max(economics.simplePaybackYears, 1)
      : 0) -
    warnings.length * 0.15;

  return {
    id: `${supplier.id}-${panel.id}-${inverter.id}-${battery?.id ?? "none"}-${panelCount}`,
    supplierId: supplier.id,
    supplierName: supplier.name,
    panel,
    panelCount,
    inverter,
    battery,
    batteryCount,
    topology: input.topology,
    annual,
    economics,
    warnings,
    score,
  };
}

export function compareQuotes(input: OptimizeInput): Quote[] {
  const quotes: Quote[] = [];
  for (const supplier of input.catalog.suppliers) {
    const panels = input.catalog.panels.filter((p) => priceOf(supplier, p.id));
    const inverters = input.catalog.inverters.filter(
      (inv) => inverterFits(inv.kind, input.topology) && priceOf(supplier, inv.id),
    );
    const batteries = input.catalog.batteries.filter((b) => priceOf(supplier, b.id));

    for (const panel of panels) {
      const sized = sizePanelCount(input.dailyLoadKwh, input.location, panel.pmaxW, input.topology);
      for (const inverter of inverters) {
        const maxByMppt = Math.max(1, Math.floor((inverter.pDcMaxKw * 1000) / Math.max(panel.pmaxW, 1)));
        const n = input.topology === "portable" ? Math.min(sized, maxByMppt) : sized;
        const arrayKw = arrayNameplateKw(panel, n);
        if (arrayKw > inverter.pDcMaxKw * 1.15) continue;
        if (input.topology !== "portable" && arrayKw < inverter.pAcKw * 0.45) continue;
        const batteryOptions =
          input.topology === "ongrid"
            ? [null]
            : batteries.length > 0
              ? batteries.filter((b) => batteryFits(inverter, b))
              : [null];
        if (batteryOptions.length === 0) continue;
        for (const battery of batteryOptions) {
          if (!gearFitsPortable(input.topology, panel, inverter, battery)) continue;
          const batteryCount = sizeBatteryCount(
            input.dailyLoadKwh,
            input.autonomyDays,
            battery,
            input.topology,
          );
          const q = quoteFor({
            supplier,
            panel,
            inverter,
            battery,
            panelCount: n,
            batteryCount,
            input,
          });
          if (q) quotes.push(q);
        }
      }
    }
  }

  return quotes.sort((a, b) => b.score - a.score).slice(0, 8);
}

export function quoteFromSelection(args: {
  supplier: Supplier;
  panel: PanelSpec;
  inverter: InverterSpec;
  battery: BatterySpec | null;
  panelCount: number;
  batteryCount: number;
  input: OptimizeInput;
}): Quote | null {
  return quoteFor({ ...args });
}
