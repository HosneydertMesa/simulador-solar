"use client";

import { create } from "zustand";
import {
  CAMPING_PRESET,
  HOME_PRESET,
  applianceById,
  type ApplianceUsage,
} from "@/data/appliances";
import type { Topology } from "@/engine/types";

export type SimulatorState = {
  locationId: string;
  tiltDeg: number;
  azimuthDeg: number;
  topology: Topology;
  autonomyDays: number;
  panelId: string;
  panelCount: number;
  inverterId: string;
  batteryId: string;
  batteryCount: number;
  supplierId: string;
  monthPreview: number;
  hourPreview: number;
  soiling: number;
  tariffCopPerKwh: number;
  exportCopPerKwh: number;
  usdCop: number;
  projectYears: number;
  discountRate: number;
  selectedObject: "panels" | "inverter" | "battery" | "house" | null;
  homeAppliances: Record<string, ApplianceUsage>;
  campingAppliances: Record<string, ApplianceUsage>;
  homeExtraKwh: number;
  campingExtraKwh: number;
  viewMode: "simple" | "technical";
  set: (patch: Partial<SimulatorState>) => void;
  setAppliance: (id: string, patch: Partial<ApplianceUsage>) => void;
  applyLoadPreset: (preset: "home" | "camping") => void;
};

export const useSimulator = create<SimulatorState>((set) => ({
  locationId: "medellin",
  tiltDeg: 10,
  azimuthDeg: 180,
  topology: "hybrid",
  autonomyDays: 1,
  panelId: "jinko-tiger-neo-580",
  panelCount: 10,
  inverterId: "deye-sun-8k",
  batteryId: "pylontech-us3000c",
  batteryCount: 4,
  supplierId: "andes-solar",
  monthPreview: 3,
  hourPreview: 12,
  soiling: 0.03,
  tariffCopPerKwh: 850,
  exportCopPerKwh: 180,
  usdCop: 4100,
  projectYears: 25,
  discountRate: 0.08,
  selectedObject: null,
  homeAppliances: { ...HOME_PRESET },
  campingAppliances: { ...CAMPING_PRESET },
  homeExtraKwh: 1.5,
  campingExtraKwh: 0.3,
  viewMode: "simple",
  set: (patch) => set(patch),
  setAppliance: (id, patch) =>
    set((state) => {
      const portable = state.topology === "portable";
      const map = portable ? state.campingAppliances : state.homeAppliances;
      const catalog = applianceById(id);
      const current = map[id] ?? { count: 0, hours: catalog.defaultHours };
      const next = { ...map, [id]: { ...current, ...patch } };
      return portable ? { campingAppliances: next } : { homeAppliances: next };
    }),
  applyLoadPreset: (preset) =>
    set((state) => {
      const appliances = { ...(preset === "home" ? HOME_PRESET : CAMPING_PRESET) };
      const extra = preset === "home" ? 1.5 : 0.3;
      if (state.topology === "portable") {
        return { campingAppliances: appliances, campingExtraKwh: extra };
      }
      return { homeAppliances: appliances, homeExtraKwh: extra };
    }),
}));
