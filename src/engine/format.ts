const copFmt = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

const usdFmt = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export function formatCop(value: number): string {
  if (!Number.isFinite(value)) return "—";
  return copFmt.format(Math.round(value));
}

export function formatUsd(value: number): string {
  if (!Number.isFinite(value)) return "—";
  return usdFmt.format(value);
}

export function formatKwh(value: number): string {
  if (!Number.isFinite(value)) return "—";
  if (Math.abs(value) >= 1000) return `${(value / 1000).toFixed(2)} MWh`;
  return `${value.toFixed(0)} kWh`;
}

export function formatKw(value: number): string {
  if (!Number.isFinite(value)) return "—";
  return `${value.toFixed(2)} kW`;
}

export function formatPct(value: number): string {
  if (!Number.isFinite(value)) return "—";
  return `${(value * 100).toFixed(1)} %`;
}

export function formatYears(value: number): string {
  if (!Number.isFinite(value)) return "No recupera";
  return `${value.toFixed(1)} años`;
}
