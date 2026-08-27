"use client";

import { useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import {
  Battery,
  Box,
  Compass,
  SunMedium,
  Zap,
} from "lucide-react";
import { SceneCanvas } from "@/components/scene/SceneCanvas";
import { SUPPLIERS, batteriesFor, invertersFor, panelsFor } from "@/data/catalog";
import { LOCATIONS } from "@/data/locations";
import {
  formatCop,
  formatCopPerKwh,
  formatKwh,
  formatKw,
  formatPct,
  formatUsd,
  formatUsdPerKwh,
  formatYears,
} from "@/engine/format";
import { priceFor, runSimulation } from "@/lib/run";
import { useSimulator } from "@/store/simulation";
import type { SimulatorState } from "@/store/simulation";
import type { Topology } from "@/engine/types";

const MONTHS = [
  "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
];

const TOPOLOGIES: { id: Topology; label: string }[] = [
  { id: "ongrid", label: "On-grid" },
  { id: "hybrid", label: "Híbrido" },
  { id: "offgrid", label: "Off-grid" },
  { id: "portable", label: "Portátil" },
];

function applyTopology(t: Topology, state: SimulatorState) {
  if (t === "portable") {
    state.set({
      topology: t,
      panelId: "ecoflow-220-fold",
      panelCount: 2,
      inverterId: "ecoflow-delta2",
      batteryId: "ecoflow-delta2-pack",
      batteryCount: 1,
      supplierId: "ruta-solar",
      dailyLoadKwh: 2.5,
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
      dailyLoadKwh: 12,
      tiltDeg: 10,
      soiling: 0.03,
      projectYears: 25,
    });
    return;
  }
  state.set({ topology: t });
}

export function Simulator() {
  const state = useSimulator();
  const run = useMemo(() => runSimulation(state), [state]);
  const [tab, setTab] = useState<"resultados" | "perdidas" | "comparar">("resultados");
  const portable = state.topology === "portable";
  const panels = panelsFor(state.topology);
  const inverters = invertersFor(state.topology);
  const batteries = batteriesFor(state.topology);
  const fx = state.usdCop;

  return (
    <div className="flex min-h-screen flex-col bg-[#070b10] text-[#e8eef4]">
      <header className="z-20 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-[#0c121a]/90 px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-400/15 text-amber-300">
            <SunMedium size={20} />
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.22em] text-cyan-200/70">
              Simulador fotovoltaico
            </p>
            <h1 className="text-lg font-semibold tracking-tight">Solara</h1>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <Stat chip label="Campo" value={formatKw(run.arrayKw)} />
          <Stat chip label="PR" value={formatPct(run.annual.performanceRatio)} />
          <Stat chip label="LCOE" value={formatCopPerKwh(run.economics.lcoeCopPerKwh)} />
          <Stat chip label="CAPEX" value={formatCop(run.economics.capexCop)} />
        </div>
      </header>

      <div className="grid flex-1 grid-cols-1 lg:grid-cols-[320px_minmax(0,1fr)_360px]">
        <aside className="max-h-[calc(100vh-64px)] space-y-4 overflow-y-auto border-r border-white/10 bg-[#0c121a] p-4">
          <Section title="Sitio" icon={<Compass size={14} />}>
            <Label>Ciudad</Label>
            <select
              className="field"
              value={state.locationId}
              onChange={(e) => state.set({ locationId: e.target.value })}
            >
              {LOCATIONS.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name} · {l.region}
                </option>
              ))}
            </select>
            <div className="grid grid-cols-2 gap-2">
              <NumberField
                label="Inclinación °"
                value={state.tiltDeg}
                min={0}
                max={45}
                onChange={(tiltDeg) => state.set({ tiltDeg })}
              />
              <NumberField
                label="Azimut °"
                value={state.azimuthDeg}
                min={0}
                max={359}
                onChange={(azimuthDeg) => state.set({ azimuthDeg })}
              />
            </div>
            <p className="hint">0° azimut = norte, 180° = sur. En Colombia el sur suele ganar un poco.</p>
          </Section>

          <Section title="Demanda" icon={<Zap size={14} />}>
            <NumberField
              label="Consumo diario kWh"
              value={state.dailyLoadKwh}
              min={1}
              max={80}
              step={0.5}
              onChange={(dailyLoadKwh) => state.set({ dailyLoadKwh })}
            />
            <NumberField
              label="Autonomía días"
              value={state.autonomyDays}
              min={0}
              max={3}
              step={0.5}
              onChange={(autonomyDays) => state.set({ autonomyDays })}
            />
            <Label>Topología</Label>
            <div className="grid grid-cols-2 gap-1 sm:grid-cols-4">
              {TOPOLOGIES.map((t) => (
                <button
                  key={t.id}
                  className={`tab ${state.topology === t.id ? "tab-on" : ""}`}
                  onClick={() => applyTopology(t.id, state)}
                  type="button"
                >
                  {t.label}
                </button>
              ))}
            </div>
            {portable && (
              <p className="hint">
                Camping, finca o emergencia: paneles plegables + estación de batería. Sin obra de techo.
              </p>
            )}
          </Section>

          <Section title="Equipos" icon={<Box size={14} />}>
            <Label>Proveedor</Label>
            <select
              className="field"
              value={state.supplierId}
              onChange={(e) => state.set({ supplierId: e.target.value })}
            >
              {SUPPLIERS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} · {s.city}
                </option>
              ))}
            </select>
            <Label>{portable ? "Panel plegable" : "Panel"}</Label>
            <select
              className="field"
              value={state.panelId}
              onChange={(e) => state.set({ panelId: e.target.value })}
            >
              {panels.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.brand} {p.pmaxW} W · {formatCop(priceFor(p.id, state.supplierId).price.unitUsd * fx)}
                </option>
              ))}
            </select>
            <NumberField
              label={portable ? "Cantidad de maletas" : "Cantidad de módulos"}
              value={state.panelCount}
              min={portable ? 1 : 2}
              max={portable ? 8 : 40}
              onChange={(panelCount) => state.set({ panelCount })}
            />
            <Label>{portable ? "Estación portátil" : "Inversor"}</Label>
            <select
              className="field"
              value={state.inverterId}
              onChange={(e) => state.set({ inverterId: e.target.value })}
            >
              {inverters.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.brand} {i.model} · {formatCop(priceFor(i.id, state.supplierId).price.unitUsd * fx)}
                </option>
              ))}
            </select>
            {state.topology !== "ongrid" && (
              <>
                <Label>{portable ? "Pack / expansión" : "Batería"}</Label>
                <select
                  className="field"
                  value={state.batteryId}
                  onChange={(e) => state.set({ batteryId: e.target.value })}
                >
                  {batteries.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.brand} {b.nominalKwh} kWh · {formatCop(priceFor(b.id, state.supplierId).price.unitUsd * fx)}
                    </option>
                  ))}
                </select>
                <NumberField
                  label={portable ? "Unidades (1 = pack interno)" : "Módulos de batería"}
                  value={state.batteryCount}
                  min={1}
                  max={portable ? 4 : 12}
                  onChange={(batteryCount) => state.set({ batteryCount })}
                />
              </>
            )}
          </Section>

          <Section title="Tarifa y suciedad" icon={<Battery size={14} />}>
            <NumberField
              label="Tarifa COP/kWh"
              value={state.tariffCopPerKwh}
              min={200}
              max={2000}
              step={10}
              onChange={(tariffCopPerKwh) => state.set({ tariffCopPerKwh })}
            />
            {!portable && (
              <NumberField
                label="Excedentes COP/kWh"
                value={state.exportCopPerKwh}
                min={0}
                max={1000}
                step={10}
                onChange={(exportCopPerKwh) => state.set({ exportCopPerKwh })}
              />
            )}
            <NumberField
              label="TRM USD → COP"
              value={state.usdCop}
              min={2500}
              max={8000}
              step={50}
              onChange={(usdCop) => state.set({ usdCop })}
            />
            <NumberField
              label="Suciedad %"
              value={Math.round(state.soiling * 1000) / 10}
              min={0}
              max={15}
              step={0.5}
              onChange={(v) => state.set({ soiling: v / 100 })}
            />
          </Section>
        </aside>

        <main className="relative min-h-[420px]">
          <SceneCanvas />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col gap-2 p-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="pointer-events-auto rounded-xl border border-white/10 bg-[#0c121a]/80 p-3 backdrop-blur">
              <Label>Mes / hora solar</Label>
              <div className="mt-1 flex items-center gap-2">
                <select
                  className="field w-auto"
                  value={state.monthPreview}
                  onChange={(e) => state.set({ monthPreview: Number(e.target.value) })}
                >
                  {MONTHS.map((m, i) => (
                    <option key={m} value={i + 1}>
                      {m}
                    </option>
                  ))}
                </select>
                <input
                  type="range"
                  min={0}
                  max={23}
                  value={state.hourPreview}
                  onChange={(e) => state.set({ hourPreview: Number(e.target.value) })}
                />
                <span className="w-10 font-mono text-xs text-amber-200">
                  {String(state.hourPreview).padStart(2, "0")}:00
                </span>
              </div>
            </div>
            <HourPeek annualHours={run.annual.hours} month={state.monthPreview} hour={state.hourPreview} />
          </div>
        </main>

        <aside className="max-h-[calc(100vh-64px)] overflow-y-auto border-l border-white/10 bg-[#0c121a] p-4">
          <div className="mb-3 grid grid-cols-3 gap-1">
            {(["resultados", "perdidas", "comparar"] as const).map((t) => (
              <button
                key={t}
                type="button"
                className={`tab ${tab === t ? "tab-on" : ""}`}
                onClick={() => setTab(t)}
              >
                {t === "resultados" ? "Resultados" : t === "perdidas" ? "Pérdidas" : "Comparar"}
              </button>
            ))}
          </div>

          {tab === "resultados" && (
            <div className="space-y-3">
              <Metric label="Producción AC anual" value={formatKwh(run.annual.kwhAc)} />
              <Metric label="Consumo anual" value={formatKwh(run.annual.kwhLoad)} />
              {!portable && <Metric label="Importación red" value={formatKwh(run.annual.kwhImport)} />}
              {!portable && <Metric label="Excedentes" value={formatKwh(run.annual.kwhExport)} />}
              <Metric label="No cubierto" value={formatKwh(run.annual.kwhUnmet)} />
              <Metric label="Autoconsumo" value={formatPct(run.annual.selfConsumption)} />
              <Metric label="Autosuficiencia" value={formatPct(run.annual.selfSufficiency)} />
              <Metric label="Factor de planta" value={formatPct(run.annual.capacityFactor)} />
              <Metric label="Pérdida inversor" value={formatKwh(run.annual.kwhInverterLoss)} />
              <Metric label="Recorte (clipping)" value={formatKwh(run.annual.kwhClipping)} />
              <hr className="border-white/10" />
              <Metric
                label="LCOE"
                value={formatCopPerKwh(run.economics.lcoeCopPerKwh)}
                hint={formatUsdPerKwh(run.economics.lcoeUsdPerKwh)}
              />
              <Metric label="Inversión" value={formatCop(run.economics.capexCop)} hint={formatUsd(run.economics.capexUsd)} />
              <Metric label="Paneles" value={formatCop(run.economics.breakdownCop.panels)} />
              <Metric label={portable ? "Estación" : "Inversor"} value={formatCop(run.economics.breakdownCop.inverter)} />
              {run.economics.breakdownCop.batteries > 0 && (
                <Metric label="Baterías extra" value={formatCop(run.economics.breakdownCop.batteries)} />
              )}
              <Metric
                label={portable ? "Envío + cables" : "Obra + BOS + envío"}
                value={formatCop(
                  run.economics.breakdownCop.labor +
                    run.economics.breakdownCop.mounting +
                    run.economics.breakdownCop.bos +
                    run.economics.breakdownCop.shipping,
                )}
              />
              <Metric
                label={portable ? "Ahorro vs planta / año" : "Ahorro anual"}
                value={formatCop(run.economics.annualSavingsCop)}
              />
              <Metric label="Payback" value={formatYears(run.economics.simplePaybackYears)} />
              <Metric
                label={`VPN ${state.projectYears} años`}
                value={formatCop(run.economics.npvCop)}
              />
              <HourlyChart
                hours={run.annual.hours.filter((h) => h.month === state.monthPreview)}
              />
              {run.warnings.map((w) => (
                <p key={w} className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-2 py-1.5 text-xs text-amber-100">
                  {w}
                </p>
              ))}
              {run.stockNotes.map((w) => (
                <p key={w} className="rounded-lg border border-cyan-400/20 bg-cyan-400/10 px-2 py-1.5 text-xs text-cyan-100">
                  {w}
                </p>
              ))}
            </div>
          )}

          {tab === "perdidas" && (
            <LossList annual={run.annual} />
          )}

          {tab === "comparar" && (
            <CompareList
              quotes={run.quotes}
              onApply={(q) =>
                state.set({
                  topology: q.topology,
                  supplierId: q.supplierId,
                  panelId: q.panel.id,
                  panelCount: q.panelCount,
                  inverterId: q.inverter.id,
                  batteryId: q.battery?.id ?? state.batteryId,
                  batteryCount: q.batteryCount,
                })
              }
            />
          )}
        </aside>
      </div>
    </div>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="space-y-2 rounded-xl border border-white/8 bg-white/3 p-3">
      <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-cyan-100/80">
        {icon}
        {title}
      </h2>
      {children}
    </section>
  );
}

function Label({ children }: { children: ReactNode }) {
  return <p className="text-[11px] text-white/55">{children}</p>;
}

function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
}) {
  return (
    <label className="block">
      <span className="text-[11px] text-white/55">{label}</span>
      <input
        className="field"
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}

function Stat({ label, value, chip }: { label: string; value: string; chip?: boolean }) {
  return (
    <div className={chip ? "rounded-lg border border-white/10 bg-white/5 px-3 py-1.5" : ""}>
      <p className="text-[10px] uppercase tracking-wider text-white/45">{label}</p>
      <p className="font-mono text-sm text-amber-100">{value}</p>
    </div>
  );
}

function Metric({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-white/5 py-1.5">
      <span className="text-xs text-white/55">{label}</span>
      <span className="text-right">
        <span className="font-mono text-sm">{value}</span>
        {hint && <span className="ml-2 text-[10px] text-white/35">{hint}</span>}
      </span>
    </div>
  );
}

function HourPeek({
  annualHours,
  month,
  hour,
}: {
  annualHours: { month: number; hour: number; poa: number; pvDc: number; inverterAc: number; load: number }[];
  month: number;
  hour: number;
}) {
  const s = annualHours.find((h) => h.month === month && h.hour === hour);
  if (!s) return null;
  return (
    <div className="pointer-events-auto rounded-xl border border-white/10 bg-[#0c121a]/80 px-3 py-2 font-mono text-[11px] text-cyan-100 backdrop-blur">
      POA {s.poa.toFixed(0)} W/m² · DC {s.pvDc.toFixed(2)} kW · AC {s.inverterAc.toFixed(2)} kW · carga {s.load.toFixed(2)} kW
    </div>
  );
}

const emptySubscribe = () => () => {};

function HourlyChart({
  hours,
}: {
  hours: { hour: number; pvDc: number; inverterAc: number; load: number }[];
}) {
  const w = 320;
  const h = 90;
  const ready = useSyncExternalStore(emptySubscribe, () => true, () => false);
  const max = Math.max(0.2, ...hours.flatMap((x) => [x.pvDc, x.inverterAc, x.load]));
  const path = (key: "pvDc" | "inverterAc" | "load") =>
    hours
      .map((pt, i) => {
        const x = ((i / 23) * (w - 8) + 4).toFixed(2);
        const y = (h - 8 - (pt[key] / max) * (h - 16)).toFixed(2);
        return `${i === 0 ? "M" : "L"}${x} ${y}`;
      })
      .join(" ");
  return (
    <div className="mt-3">
      <p className="mb-1 text-[11px] text-white/55">Perfil del mes (DC / AC / carga)</p>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full rounded-lg bg-black/30">
        {ready ? (
          <>
            <path d={path("pvDc")} fill="none" stroke="#f5a524" strokeWidth="1.6" />
            <path d={path("inverterAc")} fill="none" stroke="#3ee0c2" strokeWidth="1.6" />
            <path d={path("load")} fill="none" stroke="#8b9bb0" strokeWidth="1.2" />
          </>
        ) : null}
      </svg>
      <p className="mt-1 text-[10px] text-white/40">Ámbar DC · Cian AC · Gris carga</p>
    </div>
  );
}

function LossList({
  annual,
}: {
  annual: ReturnType<typeof runSimulation>["annual"];
}) {
  const rows = [
    ["DC ideal (temp. + POA)", annual.kwhPvDcIdeal],
    ["Suciedad + mismatch + LID", annual.kwhDcLosses],
    ["Pérdida inversor DC→AC", annual.kwhInverterLoss],
    ["Clipping (límite AC/DC)", annual.kwhClipping],
    ["Cableado AC", annual.kwhAcWiring],
    ["RTE batería", annual.kwhBatteryRteLoss],
    ["AC neto usable", annual.kwhAc],
  ] as const;
  const max = Math.max(...rows.map(([, v]) => v), 1);
  return (
    <div className="space-y-2">
      <p className="text-xs text-white/55">
        Cadena energética anual. El inversor convierte DC a AC con su curva de eficiencia
        (no un η fijo) y recorta cuando el campo supera su potencia.
      </p>
      {rows.map(([label, v]) => (
        <div key={label}>
          <div className="mb-0.5 flex justify-between text-[11px]">
            <span className="text-white/60">{label}</span>
            <span className="font-mono">{formatKwh(v)}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded bg-white/10">
            <div
              className="h-full rounded bg-gradient-to-r from-amber-400 to-cyan-300"
              style={{ width: `${(v / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function CompareList({
  quotes,
  onApply,
}: {
  quotes: ReturnType<typeof runSimulation>["quotes"];
  onApply: (q: ReturnType<typeof runSimulation>["quotes"][number]) => void;
}) {
  if (quotes.length === 0) {
    return <p className="text-sm text-white/50">No hay combinaciones compatibles con este proveedor/topología.</p>;
  }
  return (
    <div className="space-y-2">
      <p className="text-xs text-white/55">
        Mejores cotizaciones del catálogo, ordenadas por LCOE, payback y autosuficiencia.
        Precios de lista ilustrativos (USD) con conversión a COP.
      </p>
      {quotes.map((q, i) => (
        <button
          key={q.id}
          type="button"
          onClick={() => onApply(q)}
          className="w-full rounded-xl border border-white/10 bg-white/4 p-3 text-left hover:border-amber-300/40"
        >
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium">
              #{i + 1} {q.supplierName}
            </p>
            <p className="font-mono text-xs text-amber-200">{formatCop(q.economics.capexCop)}</p>
          </div>
          <p className="mt-1 text-[11px] text-white/55">
            {q.panelCount}× {q.panel.brand} {q.panel.pmaxW}W · {q.inverter.brand} {q.inverter.pAcKw} kW
            {q.battery ? ` · ${q.batteryCount}× ${q.battery.brand}` : ""}
          </p>
          <p className="mt-1 font-mono text-[11px] text-cyan-100/80">
            LCOE {formatCopPerKwh(q.economics.lcoeCopPerKwh)} · payback {formatYears(q.economics.simplePaybackYears)} · {formatKwh(q.annual.kwhAc)}
          </p>
        </button>
      ))}
    </div>
  );
}
