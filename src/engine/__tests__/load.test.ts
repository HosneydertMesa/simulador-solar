import { describe, expect, it } from "vitest";
import { APPLIANCES, CAMPING_PRESET, HOME_PRESET, applianceById } from "@/data/appliances";
import { buildHourlyLoad, dailyKwhOf } from "../load";

describe("carga por electrodomésticos", () => {
  it("una nevera típica gasta cerca de 1.2 kWh/día", () => {
    const fridge = applianceById("fridge");
    const kwh = dailyKwhOf(fridge, { count: 1, hours: fridge.defaultHours });
    expect(kwh).toBeGreaterThan(1.0);
    expect(kwh).toBeLessThan(1.5);
  });

  it("agregar un aire 12.000 BTU sube el consumo diario ~5 kWh", () => {
    const without = buildHourlyLoad(HOME_PRESET, 0);
    const withAc = buildHourlyLoad(
      { ...HOME_PRESET, ac12: { count: 1, hours: 6 } },
      0,
    );
    expect(withAc.dailyKwh - without.dailyKwh).toBeGreaterThan(4.5);
    expect(withAc.dailyKwh - without.dailyKwh).toBeLessThan(7);
  });

  it("el aire carga la tarde/noche, no la madrugada", () => {
    const load = buildHourlyLoad({ ac12: { count: 1, hours: 6 } }, 0);
    const night = load.hoursKw[3] + load.hoursKw[4];
    const evening = load.hoursKw[17] + load.hoursKw[18] + load.hoursKw[19];
    expect(evening).toBeGreaterThan(night * 4);
  });

  it("el perfil de 24 h suma 1 y las horas suman el diario", () => {
    const load = buildHourlyLoad(HOME_PRESET, 1.5);
    const frac = load.profile.reduce((a, b) => a + b, 0);
    const energy = load.hoursKw.reduce((a, b) => a + b, 0);
    expect(frac).toBeCloseTo(1, 6);
    expect(energy).toBeCloseTo(load.dailyKwh, 6);
    expect(load.hoursKw).toHaveLength(24);
  });

  it("el preset de campamento consume menos que la casa típica", () => {
    const home = buildHourlyLoad(HOME_PRESET, 1.5);
    const camp = buildHourlyLoad(CAMPING_PRESET, 0.3);
    expect(camp.dailyKwh).toBeLessThan(home.dailyKwh * 0.5);
    expect(camp.dailyKwh).toBeGreaterThan(1);
    expect(camp.dailyKwh).toBeLessThan(4);
  });

  it("el pico de la ducha eléctrica supera 3 kW", () => {
    const load = buildHourlyLoad({ shower: { count: 1, hours: 0.4 } }, 0);
    expect(load.peakKw).toBeGreaterThan(3);
  });

  it("el catálogo cubre nevera, aires y nevera de camping", () => {
    const ids = APPLIANCES.map((a) => a.id);
    expect(ids).toEqual(expect.arrayContaining(["fridge", "ac12", "ac18", "campingFridge"]));
  });
});
