"use client";

import { usagesFor } from "@/data/appliances";
import { LOCATIONS } from "@/data/locations";
import { ApplianceShare } from "@/components/charts/ApplianceShare";
import { DayCompareChart } from "@/components/charts/DayCompareChart";
import { EnergyFlow } from "@/components/charts/EnergyFlow";
import { AppliancePad } from "@/components/simple/AppliancePad";
import { SceneCanvas } from "@/components/scene/SceneCanvas";
import { dayProfile } from "@/engine/charts";
import { formatCop, formatPct, formatYears } from "@/engine/format";
import { isIslanded } from "@/engine/types";
import { explainCoverage } from "@/engine/verdict";
import { applyTopology } from "@/lib/topology";
import type { RunResult } from "@/lib/run";
import { useSimulator } from "@/store/simulation";

const TONE = {
  ok: {
    ring: "border-cyan-300/40 bg-cyan-400/10",
    label: "Sí te alcanza",
    emoji: "✅",
  },
  tight: {
    ring: "border-amber-300/40 bg-amber-400/10",
    label: "Justo",
    emoji: "⚠️",
  },
  short: {
    ring: "border-rose-400/40 bg-rose-500/10",
    label: "Se queda corto",
    emoji: "⛔",
  },
} as const;

export function SimpleView({ run }: { run: RunResult }) {
  const state = useSimulator();
  const portable = state.topology === "portable";
  const usages = usagesFor(state.topology, state.homeAppliances, state.campingAppliances);
  const verdict = explainCoverage({
    topology: state.topology,
    kwhLoad: run.annual.kwhLoad,
    kwhImport: run.annual.kwhImport,
    kwhUnmet: run.annual.kwhUnmet,
    peakKw: run.load.peakKw,
    inverterKw: run.config.inverter.pAcKw,
    items: run.load.items,
  });
  const tone = TONE[verdict.tone];
  const profile = dayProfile(run.annual.hours, state.monthPreview);
  const acOff = (usages.ac12?.count ?? 0) === 0;

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 lg:p-5">
      <section className={`rounded-2xl border px-4 py-4 sm:px-5 ${tone.ring}`}>
        <p className="text-[11px] uppercase tracking-[0.18em] text-white/50">{tone.emoji} {tone.label}</p>
        <h2 className="mt-1 max-w-3xl text-xl font-semibold tracking-tight text-white sm:text-2xl">
          {verdict.headline}
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/65">{verdict.detail}</p>
        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
          <Kpi label="El sol cubre" value={formatPct(verdict.solarShare)} hint="de tu consumo del año" />
          <Kpi label="Te cuesta" value={formatCop(run.economics.capexCop)} hint="inversión ilustrativa" />
          <Kpi
            label={portable ? "Años de uso" : "Se paga en"}
            value={portable ? `${state.projectYears} años` : formatYears(run.economics.simplePaybackYears)}
            hint={portable ? "vida útil del kit" : "con la tarifa actual"}
          />
        </div>
      </section>

      <div className="grid flex-1 gap-4 lg:grid-cols-[minmax(280px,380px)_minmax(0,1fr)]">
        <div className="space-y-3">
          <div className="rounded-2xl border border-white/8 bg-[#0c121a] p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-cyan-100/80">Dónde lo usas</p>
            <div className="grid grid-cols-2 gap-2">
              <PlaceButton
                active={!portable}
                title="Casa / techo"
                subtitle="Paneles fijos, red o batería"
                onClick={() => applyTopology("hybrid", state)}
              />
              <PlaceButton
                active={portable}
                title="Campamento"
                subtitle="Maletas + estación"
                onClick={() => applyTopology("portable", state)}
              />
            </div>
            <label className="mt-3 block">
              <span className="text-[11px] text-white/55">Ciudad</span>
              <select
                className="field"
                value={state.locationId}
                onChange={(e) => state.set({ locationId: e.target.value })}
              >
                {LOCATIONS.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="mt-3 flex flex-wrap gap-1">
              {acOff && (
                <button
                  type="button"
                  className="tab tab-on"
                  onClick={() => state.setAppliance("ac12", { count: 1, hours: 6 })}
                >
                  ¿Y si pongo el aire?
                </button>
              )}
            </div>
            <p className="mt-3 font-mono text-sm text-amber-100">
              Hoy usas {run.load.dailyKwh.toFixed(1)} kWh
            </p>
          </div>
          <div className="rounded-2xl border border-white/8 bg-[#0c121a] p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-cyan-100/80">Qué enchufas</p>
            <AppliancePad
              portable={portable}
              usages={usages}
              items={run.load.items}
              dailyKwh={run.load.dailyKwh}
              topLoadName={verdict.topLoadName}
              onChange={(id, patch) => state.setAppliance(id, patch)}
              onFill={(preset) => state.applyLoadPreset(preset)}
            />
          </div>
        </div>

        <div className="space-y-3">
          <div className="rounded-2xl border border-white/8 bg-[#0c121a] p-3 sm:p-4">
            <DayCompareChart
              points={profile}
              selectedHour={state.hourPreview}
              onSelectHour={(hourPreview) => state.set({ hourPreview })}
            />
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-[11px] text-white/50">
                Mes
                <select
                  className="field w-auto"
                  value={state.monthPreview}
                  onChange={(e) => state.set({ monthPreview: Number(e.target.value) })}
                >
                  {["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"].map((m, i) => (
                    <option key={m} value={i + 1}>
                      {m}
                    </option>
                  ))}
                </select>
              </label>
              <input
                type="range"
                min={0}
                max={23}
                value={state.hourPreview}
                onChange={(e) => state.set({ hourPreview: Number(e.target.value) })}
                className="min-w-[8rem] flex-1"
                aria-label="Hora del día"
              />
            </div>
          </div>

          <details className="rounded-2xl border border-white/8 bg-[#0c121a] p-3">
            <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wider text-cyan-100/80">
              Más gráficas y la casa 3D
            </summary>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <div>
                <p className="mb-2 text-xs text-white/55">Quién se come el sol</p>
                <ApplianceShare items={run.load.items} />
              </div>
              <div>
                <p className="mb-2 text-xs text-white/55">El año en tres barras</p>
                <EnergyFlow
                  solarKwh={run.annual.kwhAc}
                  loadKwh={run.annual.kwhLoad}
                  gridKwh={run.annual.kwhImport}
                  unmetKwh={run.annual.kwhUnmet}
                  islanded={isIslanded(state.topology)}
                />
              </div>
            </div>
            <div className="mt-3 overflow-hidden rounded-xl bg-[#081018]">
              <p className="px-3 py-2 text-[11px] text-white/40">Gira y toca los equipos</p>
              <div className="h-[240px] sm:h-[300px]">
                <SceneCanvas />
              </div>
            </div>
          </details>
        </div>
      </div>
    </div>
  );
}

function Kpi({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2.5">
      <p className="text-[10px] uppercase tracking-wider text-white/40">{label}</p>
      <p className="font-mono text-lg text-amber-100">{value}</p>
      <p className="text-[11px] text-white/40">{hint}</p>
    </div>
  );
}

function PlaceButton({
  active,
  title,
  subtitle,
  onClick,
}: {
  active: boolean;
  title: string;
  subtitle: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border px-3 py-2.5 text-left ${
        active ? "tab-on border-amber-300/40" : "border-white/8 bg-white/3 text-white/70"
      }`}
    >
      <p className="text-sm font-medium">{title}</p>
      <p className="text-[11px] text-white/45">{subtitle}</p>
    </button>
  );
}
