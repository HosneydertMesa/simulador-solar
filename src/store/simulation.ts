"use client";

import { create } from "zustand";
import type { Topology } from "@/engine/types";

export type SimulatorState = {
  locationId: string;
  tiltDeg: number;
  azimuthDeg: number;
  topology: Topology;
  dailyLoadKwh: number;
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
  set: (patch: Partial<SimulatorState>) => void;
};

export const useSimulator = create<SimulatorState>((set) => ({
  locationId: "medellin",
  tiltDeg: 10,
  azimuthDeg: 180,
  topology: "hybrid",
  dailyLoadKwh: 12,
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
  set: (patch) => set(patch),
}));
