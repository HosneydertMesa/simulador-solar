import {
  BATTERIES,
  CATALOG,
  DEFAULT_DERATE,
  INVERTERS,
  PANELS,
  batteryById,
  inverterById,
  panelById,
  supplierById,
} from "@/data/catalog";
import { locationById } from "@/data/locations";
import { evaluateEconomics } from "@/engine/economics";
import { compareQuotes, quoteFromSelection } from "@/engine/optimize";
import { arrayNameplateKw, suggestStringing } from "@/engine/pv";
import { dcacRatio } from "@/engine/inverter";
import { DEFAULT_LOAD, simulateYear } from "@/engine/simulate";
import type { AnnualResult, EconomicsResult, Quote, SystemConfig } from "@/engine/types";
import { formFactorOf } from "@/engine/types";
import type { SimulatorState } from "@/store/simulation";

export function priceFor(productId: string, supplierId: string) {
  const preferred = supplierById(supplierId);
  if (preferred.prices[productId]) return { supplier: preferred, price: preferred.prices[productId] };
  for (const s of CATALOG.suppliers) {
    if (s.prices[productId]) return { supplier: s, price: s.prices[productId] };
  }
  return { supplier: preferred, price: { unitUsd: 0, shippingUsd: 0 } };
}

export type RunResult = {
  config: SystemConfig;
  annual: AnnualResult;
  economics: EconomicsResult;
  quotes: Quote[];
  selection: Quote | null;
  arrayKw: number;
  dcac: number;
  warnings: string[];
  stockNotes: string[];
};

export function runSimulation(state: SimulatorState): RunResult {
  const location = locationById(state.locationId);
  const panel = panelById(state.panelId);
  const inverter = inverterById(state.inverterId);
  const battery = state.topology === "ongrid" ? null : batteryById(state.batteryId);
  const batteryCount = state.topology === "ongrid" ? 0 : state.batteryCount;
  const portable = state.topology === "portable";
  const derate = {
    ...DEFAULT_DERATE,
    soiling: portable ? Math.max(state.soiling, 0.05) : state.soiling,
  };
  const supplier = supplierById(state.supplierId);

  const config: SystemConfig = {
    topology: state.topology,
    location,
    tiltDeg: state.tiltDeg,
    azimuthDeg: state.azimuthDeg,
    panel,
    panelCount: state.panelCount,
    inverter,
    battery,
    batteryCount,
    dailyLoadKwh: state.dailyLoadKwh,
    loadProfile: DEFAULT_LOAD,
    derate,
  };

  const annual = simulateYear(config);
  const arrayKw = arrayNameplateKw(panel, state.panelCount);
  const panelQuote = priceFor(panel.id, supplier.id);
  const invQuote = priceFor(inverter.id, supplier.id);
  const batQuote = battery ? priceFor(battery.id, supplier.id) : null;

  const stockNotes: string[] = [];
  if (panelQuote.supplier.id !== supplier.id) {
    stockNotes.push(`Paneles ${panel.brand} se cotizan con ${panelQuote.supplier.name} (no los trae ${supplier.name}).`);
  }
  if (invQuote.supplier.id !== supplier.id) {
    stockNotes.push(`Inversor ${inverter.brand} se cotiza con ${invQuote.supplier.name}.`);
  }
  if (battery && batQuote && batQuote.supplier.id !== supplier.id) {
    stockNotes.push(`Baterías ${battery.brand} se cotizan con ${batQuote.supplier.name}.`);
  }

  const economics = evaluateEconomics(annual, {
    panelUnitUsd: panelQuote.price.unitUsd,
    inverterUnitUsd: invQuote.price.unitUsd,
    batteryUnitUsd: batQuote?.price.unitUsd ?? 0,
    panelCount: state.panelCount,
    inverterCount: 1,
    batteryCount,
    shippingUsd:
      panelQuote.price.shippingUsd * state.panelCount +
      invQuote.price.shippingUsd +
      (batQuote?.price.shippingUsd ?? 0) * batteryCount,
    laborPerWpUsd: portable ? 0 : supplier.laborPerWpUsd,
    mountingPerWpUsd: portable ? 0 : supplier.mountingPerWpUsd,
    bosPerWpUsd: portable ? Math.min(supplier.bosPerWpUsd, 0.03) : supplier.bosPerWpUsd,
    arrayKw,
    tariffCopPerKwh: state.tariffCopPerKwh,
    exportCopPerKwh: portable ? 0 : state.exportCopPerKwh,
    usdCop: state.usdCop,
    projectYears: state.projectYears,
    discountRate: state.discountRate,
    opexPctCapex: portable ? 0.02 : 0.012,
    inverterReplaceYear: portable ? 8 : 12,
    inverterReplaceUsd: invQuote.price.unitUsd * (portable ? 0.5 : 0.7),
  });

  const stringing = suggestStringing(panel, inverter, state.panelCount, derate.tMinC, derate.tMaxC);
  const warnings = [...stringing.warnings];
  const dcac = dcacRatio(arrayKw, inverter);
  if (dcac > 1.4) warnings.push(`DC/AC ${dcac.toFixed(2)}: esperable recorte en horas pico.`);
  if (state.topology !== "ongrid" && inverter.kind === "string") {
    warnings.push("Un inversor string no gestiona baterías. Cambia a híbrido u off-grid.");
  }
  if (state.topology === "hybrid" && inverter.kind !== "hybrid") {
    warnings.push("Para un sistema híbrido elige un inversor híbrido (Deye, Huawei o Victron).");
  }
  if (state.topology === "offgrid" && inverter.kind === "string") {
    warnings.push("Off-grid requiere inversor híbrido u off-grid, no un string on-grid.");
  }
  if (portable && inverter.kind !== "portable") {
    warnings.push("Modo portátil: elige una estación (EcoFlow, Jackery, Bluetti o Anker) y paneles plegables.");
  }
  if (portable && formFactorOf(panel) !== "portable") {
    warnings.push("Los módulos de techo no van con una estación portátil. Usa paneles plegables/maleta.");
  }
  if (!portable && formFactorOf(panel) === "portable") {
    warnings.push("Un panel plegable es para camping/campo. Para techo elige un módulo residencial.");
  }

  const optimizeInput = {
    location,
    topology: state.topology,
    tiltDeg: state.tiltDeg,
    azimuthDeg: state.azimuthDeg,
    dailyLoadKwh: state.dailyLoadKwh,
    loadProfile: DEFAULT_LOAD,
    autonomyDays: state.autonomyDays,
    derate,
    catalog: CATALOG,
    tariffCopPerKwh: state.tariffCopPerKwh,
    exportCopPerKwh: state.exportCopPerKwh,
    usdCop: state.usdCop,
    projectYears: state.projectYears,
    discountRate: state.discountRate,
  };

  const quotes = compareQuotes(optimizeInput);
  const selection = quoteFromSelection({
    supplier,
    panel,
    inverter,
    battery,
    panelCount: state.panelCount,
    batteryCount,
    input: optimizeInput,
  });

  return { config, annual, economics, quotes, selection, arrayKw, dcac, warnings, stockNotes };
}

export { PANELS, INVERTERS, BATTERIES, CATALOG };
