"use client";

import { useMemo } from "react";
import { SunMedium } from "lucide-react";
import { SimpleView } from "@/components/simple/SimpleView";
import { TechnicalView } from "@/components/technical/TechnicalView";
import { Stat } from "@/components/ui/Fields";
import { formatCop, formatCopPerKwh, formatKw, formatPct } from "@/engine/format";
import { runSimulation } from "@/lib/run";
import { useSimulator } from "@/store/simulation";

export function Simulator() {
  const state = useSimulator();
  const run = useMemo(() => runSimulation(state), [state]);
  const simple = state.viewMode === "simple";

  return (
    <div className="flex min-h-screen flex-col bg-[#070b10] text-[#e8eef4]">
      <header className="z-20 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-[#0c121a]/90 px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-400/15 text-amber-300">
            <SunMedium size={20} />
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.22em] text-cyan-200/70">
              {simple ? "¿Me alcanza el sol?" : "Simulador fotovoltaico"}
            </p>
            <h1 className="text-lg font-semibold tracking-tight">Solara</h1>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {simple ? null : (
            <>
              <Stat chip label="Campo" value={formatKw(run.arrayKw)} />
              <Stat chip label="PR" value={formatPct(run.annual.performanceRatio)} />
              <Stat chip label="LCOE" value={formatCopPerKwh(run.economics.lcoeCopPerKwh)} />
              <Stat chip label="CAPEX" value={formatCop(run.economics.capexCop)} />
            </>
          )}
          <div className="flex rounded-lg border border-white/10 p-0.5">
            <button
              type="button"
              className={`tab ${simple ? "tab-on" : ""}`}
              onClick={() => state.set({ viewMode: "simple" })}
            >
              Para mí
            </button>
            <button
              type="button"
              className={`tab ${!simple ? "tab-on" : ""}`}
              onClick={() => state.set({ viewMode: "technical" })}
            >
              Técnico
            </button>
          </div>
        </div>
      </header>
      {simple ? <SimpleView run={run} /> : <TechnicalView run={run} />}
    </div>
  );
}
