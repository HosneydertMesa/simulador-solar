import type { Topology } from "@/engine/types";
import type { SimulatorState } from "@/store/simulation";

export function applyTopology(t: Topology, state: SimulatorState) {
  if (t === "portable") {
    state.set({
      topology: t,
      panelId: "ecoflow-220-fold",
      panelCount: 2,
      inverterId: "ecoflow-delta2",
      batteryId: "ecoflow-delta2-pack",
      batteryCount: 1,
      supplierId: "ruta-solar",
      autonomyDays: 1,
      tiltDeg: 25,
      soiling: 0.06,
      projectYears: 10,
    });
    return;
  }
  if (state.topology === "portable") {
    state.set({
      topology: t,
      panelId: "jinko-tiger-neo-580",
      panelCount: 10,
      inverterId: t === "ongrid" ? "growatt-min-6000" : "deye-sun-8k",
      batteryId: "pylontech-us3000c",
      batteryCount: 4,
      supplierId: "andes-solar",
      tiltDeg: 10,
      soiling: 0.03,
      projectYears: 25,
    });
    return;
  }
  state.set({ topology: t });
}
