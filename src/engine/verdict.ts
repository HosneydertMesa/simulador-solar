import { isIslanded, type Topology } from "./types";

export type CoverageTone = "ok" | "tight" | "short";

export type CoverageInput = {
  topology: Topology;
  kwhLoad: number;
  kwhImport: number;
  kwhUnmet: number;
  peakKw: number;
  inverterKw: number;
  items: { id: string; name: string; dailyKwh: number }[];
};

export type CoverageVerdict = {
  tone: CoverageTone;
  headline: string;
  detail: string;
  solarShare: number;
  uncoveredShare: number;
  topLoadName: string | null;
  topLoadShare: number;
};

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

export function explainCoverage(input: CoverageInput): CoverageVerdict {
  const load = Math.max(input.kwhLoad, 0);
  const islanded = isIslanded(input.topology);
  const gap = islanded ? input.kwhUnmet : input.kwhImport;
  const uncoveredShare = load > 0 ? clamp01(gap / load) : 0;
  const solarShare = 1 - uncoveredShare;

  const realItems = input.items.filter((i) => i.id !== "extra" && i.dailyKwh > 0);
  const top = [...realItems].sort((a, b) => b.dailyKwh - a.dailyKwh)[0] ?? null;
  const dailyTotal = realItems.reduce((s, i) => s + i.dailyKwh, 0);
  const topLoadShare = top && dailyTotal > 0 ? top.dailyKwh / dailyTotal : 0;
  const topLoadName = top?.name ?? null;
  const topIsAc = top?.id === "ac12" || top?.id === "ac18";
  const topIsShower = top?.id === "shower";
  const overload = input.peakKw > input.inverterKw * 1.02;

  let tone: CoverageTone;
  let headline: string;
  let detail: string;

  if (overload) {
    tone = "short";
    const who = topIsAc || topIsShower ? topLoadName : "El aparato más pesado";
    headline = islanded
      ? `${who} pide más potencia de la que da la estación.`
      : `${who} pide un pico que el inversor no da.`;
    detail =
      "Aquí no faltan paneles: faltan kW en el momento. Baja horas, quita ese aparato, o elige un equipo más grande.";
  } else if (islanded && uncoveredShare > 0.2) {
    tone = "short";
    headline = "Con lo enchufado, el kit se queda corto varios días.";
    detail = top
      ? `${top.name} se lleva buena parte de la batería. Quita carga o suma maletas.`
      : "Reduce consumo o aumenta paneles y batería.";
  } else if (solarShare >= 0.75) {
    tone = "ok";
    headline = top
      ? `Sí cubre lo esencial. ${top.name} es lo que más gasta.`
      : "Sí: el sol cubre casi todo lo que enchufaste.";
    detail = islanded
      ? "Nevera chica y luces entran. Si agregas aire o ducha, mira el pico de kW."
      : "De día el techo trabaja. De noche usas red o batería, según el sistema.";
  } else if (solarShare >= 0.4) {
    tone = "tight";
    headline = islanded
      ? "Alcanza justito. Un aparato de más y se apaga."
      : `El sol cubre parte. ${topLoadName ?? "Lo que más gasta"} te sigue atando a la red.`;
    detail = topIsAc
      ? "El aire es el que más pide. Prueba menos horas, o un ventilador."
      : "Suma paneles, o baja horas de lo que más consume.";
  } else {
    tone = islanded ? "short" : "tight";
    headline = islanded
      ? "Esto no alimenta esa casa. Es un kit de camping, no un aire."
      : "Con este consumo el sol cubre poco. Quita el aire o suma campo.";
    detail = top
      ? `${top.name} concentra el gasto. Quítalo y vas a ver el salto.`
      : "Empieza por nevera y luces; el clima es lo caro.";
  }

  return {
    tone,
    headline,
    detail,
    solarShare,
    uncoveredShare,
    topLoadName,
    topLoadShare,
  };
}
