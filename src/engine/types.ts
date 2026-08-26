export type Topology = "ongrid" | "hybrid" | "offgrid";
export type InverterKind = "string" | "hybrid" | "offgrid";
export type Chemistry = "lfp" | "nmc" | "lead_acid";

export type EfficiencyPoint = {
  /** AC load as a fraction of rated AC power (0–1.2). */
  load: number;
  /** Conversion efficiency 0–1. */
  eta: number;
};

export type PanelSpec = {
  id: string;
  brand: string;
  model: string;
  pmaxW: number;
  vocV: number;
  vmpV: number;
  iscA: number;
  impA: number;
  efficiency: number;
  /** Power temperature coefficient, %/°C (negative). */
  gammaPctPerC: number;
  /** Voc temperature coefficient, %/°C (negative). */
  betaVocPctPerC: number;
  noctC: number;
  widthM: number;
  heightM: number;
  bifacialGain: number;
  warrantyYears: number;
};

export type InverterSpec = {
  id: string;
  brand: string;
  model: string;
  kind: InverterKind;
  pAcKw: number;
  pDcMaxKw: number;
  vMpptMin: number;
  vMpptMax: number;
  vDcMax: number;
  mpptCount: number;
  efficiencyCurve: EfficiencyPoint[];
  euroEfficiency: number;
  nightConsumptionKw: number;
  standbyKw: number;
  batteryVoltageV: number | null;
};

export type BatterySpec = {
  id: string;
  brand: string;
  model: string;
  chemistry: Chemistry;
  nominalKwh: number;
  voltageV: number;
  dod: number;
  roundTripEfficiency: number;
  cCharge: number;
  cDischarge: number;
  cyclesTo80: number;
  calendarFadePctPerYear: number;
};

export type SupplierPrice = {
  unitUsd: number;
  shippingUsd: number;
};

export type Supplier = {
  id: string;
  name: string;
  city: string;
  leadDays: number;
  rating: number;
  laborPerWpUsd: number;
  mountingPerWpUsd: number;
  bosPerWpUsd: number;
  prices: Record<string, SupplierPrice>;
};

export type Location = {
  id: string;
  name: string;
  region: string;
  lat: number;
  lon: number;
  altitudeM: number;
  /** Monthly mean daily GHI, kWh/m²/day, Jan–Dec. */
  ghiKwhM2Day: number[];
  /** Monthly mean ambient temperature, °C. */
  tempC: number[];
};

export type DerateAssumptions = {
  soiling: number;
  mismatch: number;
  lid: number;
  nameplate: number;
  dcWiring: number;
  acWiring: number;
  availability: number;
  albedo: number;
  tMinC: number;
  tMaxC: number;
};

export type SystemConfig = {
  topology: Topology;
  location: Location;
  tiltDeg: number;
  azimuthDeg: number;
  panel: PanelSpec;
  panelCount: number;
  inverter: InverterSpec;
  battery: BatterySpec | null;
  batteryCount: number;
  dailyLoadKwh: number;
  loadProfile: number[];
  derate: DerateAssumptions;
};

export type HourSample = {
  month: number;
  hour: number;
  ghi: number;
  poa: number;
  tAmb: number;
  tCell: number;
  pvDcIdeal: number;
  pvDc: number;
  inverterAc: number;
  inverterLoss: number;
  clipped: number;
  batteryCharge: number;
  batteryDischarge: number;
  soc: number;
  load: number;
  gridImport: number;
  gridExport: number;
  unmet: number;
};

export type LossBreakdown = {
  irradianceTemp: number;
  soiling: number;
  mismatch: number;
  lid: number;
  dcWiring: number;
  inverter: number;
  clipping: number;
  acWiring: number;
  batteryRte: number;
};

export type AnnualResult = {
  hours: HourSample[];
  kwhPvDcIdeal: number;
  kwhPvDc: number;
  kwhAc: number;
  kwhLoad: number;
  kwhImport: number;
  kwhExport: number;
  kwhUnmet: number;
  kwhCharge: number;
  kwhDischarge: number;
  kwhInverterLoss: number;
  kwhClipping: number;
  kwhDcLosses: number;
  kwhAcWiring: number;
  kwhBatteryRteLoss: number;
  losses: LossBreakdown;
  performanceRatio: number;
  selfConsumption: number;
  selfSufficiency: number;
  capacityFactor: number;
  peakAcKw: number;
  poaKwhM2: number;
  autonomyHoursAvg: number;
};

export type EconomicsInput = {
  panelUnitUsd: number;
  inverterUnitUsd: number;
  batteryUnitUsd: number;
  panelCount: number;
  inverterCount: number;
  batteryCount: number;
  shippingUsd: number;
  laborPerWpUsd: number;
  mountingPerWpUsd: number;
  bosPerWpUsd: number;
  arrayKw: number;
  tariffCopPerKwh: number;
  exportCopPerKwh: number;
  usdCop: number;
  projectYears: number;
  discountRate: number;
  opexPctCapex: number;
  inverterReplaceYear: number;
  inverterReplaceUsd: number;
};

export type EconomicsResult = {
  capexUsd: number;
  capexCop: number;
  annualSavingsCop: number;
  annualExportCop: number;
  simplePaybackYears: number;
  lcoeUsdPerKwh: number;
  npvCop: number;
  irrApprox: number;
};

export type Quote = {
  id: string;
  supplierId: string;
  supplierName: string;
  panel: PanelSpec;
  panelCount: number;
  inverter: InverterSpec;
  battery: BatterySpec | null;
  batteryCount: number;
  topology: Topology;
  annual: AnnualResult;
  economics: EconomicsResult;
  warnings: string[];
  score: number;
};
