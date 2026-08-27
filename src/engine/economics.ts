import type { AnnualResult, EconomicsInput, EconomicsResult } from "./types";

function crf(rate: number, years: number): number {
  if (rate <= 0) return 1 / years;
  const g = (1 + rate) ** years;
  return (rate * g) / (g - 1);
}

export function evaluateEconomics(
  annual: AnnualResult,
  input: EconomicsInput,
): EconomicsResult {
  const panels = input.panelUnitUsd * input.panelCount;
  const inverter = input.inverterUnitUsd * input.inverterCount;
  const batteries = input.batteryUnitUsd * input.batteryCount;
  const wp = input.arrayKw * 1000;
  const labor = input.laborPerWpUsd * wp;
  const mounting = input.mountingPerWpUsd * wp;
  const bos = input.bosPerWpUsd * wp;
  const capexUsd = panels + inverter + batteries + labor + mounting + bos + input.shippingUsd;
  const fx = input.usdCop;
  const capexCop = capexUsd * fx;
  const breakdownCop = {
    panels: panels * fx,
    inverter: inverter * fx,
    batteries: batteries * fx,
    shipping: input.shippingUsd * fx,
    labor: labor * fx,
    mounting: mounting * fx,
    bos: bos * fx,
  };

  const avoided = Math.max(annual.kwhLoad - annual.kwhImport - annual.kwhUnmet, 0);
  const annualSavingsCop = avoided * input.tariffCopPerKwh;
  const annualExportCop = annual.kwhExport * input.exportCopPerKwh;
  const annualCashCop = annualSavingsCop + annualExportCop;
  const opexCop = capexCop * input.opexPctCapex;

  const netYear1 = annualCashCop - opexCop;
  const simplePaybackYears = netYear1 > 0 ? capexCop / netYear1 : Infinity;

  const annualAc = Math.max(annual.kwhAc, 0.001);
  const lcoeUsdPerKwh =
    (capexUsd * crf(input.discountRate, input.projectYears) +
      capexUsd * input.opexPctCapex) /
    annualAc;

  let npv = -capexCop;
  let fade = 1;
  for (let y = 1; y <= input.projectYears; y += 1) {
    fade *= 0.995;
    let cash = annualCashCop * fade - opexCop;
    if (y === input.inverterReplaceYear) {
      cash -= input.inverterReplaceUsd * input.usdCop;
    }
    npv += cash / (1 + input.discountRate) ** y;
  }

  const irrApprox =
    capexCop > 0 && netYear1 > 0
      ? Math.min(Math.max(netYear1 / capexCop, -0.5), 1.5)
      : 0;

  return {
    capexUsd,
    capexCop,
    annualSavingsCop,
    annualExportCop,
    simplePaybackYears,
    lcoeUsdPerKwh,
    lcoeCopPerKwh: lcoeUsdPerKwh * fx,
    npvCop: npv,
    irrApprox,
    breakdownCop,
  };
}
