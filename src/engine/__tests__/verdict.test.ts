import { describe, expect, it } from "vitest";
import { explainCoverage } from "../verdict";
import { dayProfile, monthlyProductionKwh } from "../charts";
import type { HourSample } from "../types";

function hour(partial: Partial<HourSample> & { month: number; hour: number }): HourSample {
  return {
    ghi: 0,
    poa: 0,
    tAmb: 25,
    tCell: 25,
    pvDcIdeal: 0,
    pvDc: 0,
    inverterAc: 0,
    inverterLoss: 0,
    clipped: 0,
    batteryCharge: 0,
    batteryDischarge: 0,
    soc: 0.5,
    load: 0,
    gridImport: 0,
    gridExport: 0,
    unmet: 0,
    ...partial,
  };
}

describe("veredicto en lenguaje claro", () => {
  it("con nevera y buen cubrimiento dice que sí alcanza", () => {
    const v = explainCoverage({
      topology: "hybrid",
      kwhLoad: 4000,
      kwhImport: 400,
      kwhUnmet: 0,
      peakKw: 3.5,
      inverterKw: 8,
      items: [
        { id: "fridge", name: "Nevera", dailyKwh: 1.2 },
        { id: "lights", name: "Luces LED", dailyKwh: 0.4 },
      ],
    });
    expect(v.tone).toBe("ok");
    expect(v.headline.toLowerCase()).toMatch(/sí|cubre|alcanza/);
    expect(v.solarShare).toBeGreaterThan(0.8);
  });

  it("un aire que supera la estación portátil habla de potencia, no de paneles", () => {
    const v = explainCoverage({
      topology: "portable",
      kwhLoad: 800,
      kwhImport: 0,
      kwhUnmet: 200,
      peakKw: 3.2,
      inverterKw: 1.8,
      items: [
        { id: "ac12", name: "Aire", dailyKwh: 5.6 },
        { id: "campingFridge", name: "Nevera camping 12V", dailyKwh: 0.7 },
      ],
    });
    expect(v.tone).toBe("short");
    expect(v.headline.toLowerCase()).toMatch(/potencia|kW|estación|aire/i);
    expect(v.topLoadName).toBe("Aire");
  });

  it("en techo con mucha red el tono es ajustado y nombra lo que más gasta", () => {
    const v = explainCoverage({
      topology: "ongrid",
      kwhLoad: 5000,
      kwhImport: 3200,
      kwhUnmet: 0,
      peakKw: 2,
      inverterKw: 6,
      items: [{ id: "ac12", name: "Aire", dailyKwh: 5.6 }],
    });
    expect(v.tone).toBe("tight");
    expect(v.detail.toLowerCase()).toContain("aire");
  });
});

describe("series para gráficas", () => {
  it("el perfil del día junta sol y casa por hora", () => {
    const hours = Array.from({ length: 24 }, (_, h) =>
      hour({
        month: 3,
        hour: h,
        inverterAc: h === 12 ? 4 : 0.2,
        load: h === 19 ? 2 : 0.4,
      }),
    );
    const profile = dayProfile(hours, 3);
    expect(profile).toHaveLength(24);
    expect(profile[12].solarKw).toBe(4);
    expect(profile[19].loadKw).toBe(2);
    expect(profile[12].hour).toBe(12);
  });

  it("la producción mensual suma las horas típicas al mes", () => {
    const hours = Array.from({ length: 24 }, (_, h) =>
      hour({ month: 1, hour: h, inverterAc: 1 }),
    );
    const months = monthlyProductionKwh(hours);
    expect(months).toHaveLength(12);
    // 24 h × 1 kW × 31 días de enero
    expect(months[0]).toBeCloseTo(24 * 31, 5);
    expect(months[1]).toBe(0);
  });
});
