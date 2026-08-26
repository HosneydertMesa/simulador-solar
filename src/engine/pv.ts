import { clamp } from "./math";
import type { InverterSpec, PanelSpec } from "./types";

/** Cell temperature from the NOCT model, °C. */
export function cellTemperature(tAmbC: number, poaWm2: number, noctC: number): number {
  return tAmbC + (poaWm2 / 800) * (noctC - 20);
}

/**
 * DC power of one module at the given POA and cell temperature.
 * STC reference: 1000 W/m², 25 °C.
 */
export function moduleDcW(
  panel: PanelSpec,
  poaWm2: number,
  tCellC: number,
): number {
  if (poaWm2 <= 0) return 0;
  const irr = poaWm2 / 1000;
  const temp = 1 + (panel.gammaPctPerC / 100) * (tCellC - 25);
  return Math.max(panel.pmaxW * irr * temp * (1 + panel.bifacialGain), 0);
}

export function arrayNameplateKw(panel: PanelSpec, count: number): number {
  return (panel.pmaxW * count) / 1000;
}

export type StringingResult = {
  modulesPerString: number;
  strings: number;
  vocCold: number;
  vmpHot: number;
  ok: boolean;
  warnings: string[];
};

/**
 * Series/parallel stringing so Voc at tMin stays under the inverter DC max
 * and Vmp at tMax stays inside the MPPT window.
 */
export function suggestStringing(
  panel: PanelSpec,
  inverter: InverterSpec,
  count: number,
  tMinC: number,
  tMaxC: number,
): StringingResult {
  const vocCold =
    panel.vocV * (1 + (panel.betaVocPctPerC / 100) * (tMinC - 25));
  const vmpHot =
    panel.vmpV * (1 + (panel.betaVocPctPerC / 100) * (tMaxC - 25));

  const maxSeries = Math.max(1, Math.floor(inverter.vDcMax / Math.max(vocCold, 0.1)));
  const minSeries = Math.max(1, Math.ceil(inverter.vMpptMin / Math.max(vmpHot, 0.1)));
  let modulesPerString = clamp(Math.round((minSeries + maxSeries) / 2), minSeries, maxSeries);
  if (modulesPerString > count) modulesPerString = Math.max(1, count);

  const strings = Math.max(1, Math.ceil(count / modulesPerString));
  const warnings: string[] = [];
  if (minSeries > maxSeries) {
    warnings.push(
      "No hay un string válido: Voc en frío supera Vdc máx. o Vmp en calor queda bajo el MPPT.",
    );
  }
  if (strings > inverter.mpptCount * 2) {
    warnings.push(
      `Se necesitan ${strings} strings y el inversor solo tiene ${inverter.mpptCount} MPPT (máx. ~${inverter.mpptCount * 2} strings).`,
    );
  }
  const vocString = vocCold * modulesPerString;
  const vmpString = vmpHot * modulesPerString;
  if (vocString > inverter.vDcMax) {
    warnings.push(
      `Voc en frío del string (${vocString.toFixed(0)} V) supera el máximo del inversor (${inverter.vDcMax} V).`,
    );
  }
  if (vmpString < inverter.vMpptMin || vmpString > inverter.vMpptMax) {
    warnings.push(
      `Vmp en calor (${vmpString.toFixed(0)} V) queda fuera de la ventana MPPT ${inverter.vMpptMin}–${inverter.vMpptMax} V.`,
    );
  }

  return {
    modulesPerString,
    strings,
    vocCold: vocString,
    vmpHot: vmpString,
    ok: warnings.length === 0,
    warnings,
  };
}
