"use client";

import { useState, useSyncExternalStore } from "react";
import { Battery, Box, Compass, Zap } from "lucide-react";
import { SceneCanvas } from "@/components/scene/SceneCanvas";
import { MonthlyBars } from "@/components/charts/MonthlyBars";
import { Label, Metric, NumberField, Section } from "@/components/ui/Fields";
import { SUPPLIERS, batteriesFor, invertersFor, panelsFor } from "@/data/catalog";
import { APPLIANCES, usagesFor, type Appliance, type ApplianceUsage } from "@/data/appliances";
import { LOCATIONS } from "@/data/locations";
import { monthlyProductionKwh } from "@/engine/charts";
import {
  formatCop,
  formatCopPerKwh,
  formatKwh,
  formatPct,
  formatUsd,
  formatUsdPerKwh,
  formatYears,
} from "@/engine/format";
import { priceFor, type RunResult } from "@/lib/run";
import { applyTopology } from "@/lib/topology";
import { useSimulator } from "@/store/simulation";
import type { Topology } from "@/engine/types";

const MONTHS = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
const TOPOLOGIES: { id: Topology; label: string }[] = [
  { id: "ongrid", label: "On-grid" },
  { id: "hybrid", label: "Híbrido" },
  { id: "offgrid", label: "Off-grid" },
  { id: "portable", label: "Portátil" },
];

export function TechnicalView({ run }: { run: RunResult }) {
  const state = useSimulator();
  const [tab, setTab] = useState<"energia" | "dinero" | "comparar">("energia");
  const portable = state.topology === "portable";
  const panels = panelsFor(state.topology);
  const inverters = invertersFor(state.topology);
  const batteries = batteriesFor(state.topology);
  const fx = state.usdCop;
  const monthly = monthlyProductionKwh(run.annual.hours);

  return (
    <div className="grid flex-1 grid-cols-1 lg:grid-cols-[300px_minmax(0,1fr)_340px]">
      <aside className="max-h-[calc(100vh-64px)] space-y-3 overflow-y-auto border-r border-white/10 bg-[#0c121a] p-3">
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
          <details>
            <summary className="cursor-pointer text-[11px] text-white/45">Inclinación y azimut</summary>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <NumberField label="Inclinación °" value={state.tiltDeg} min={0} max={45} onChange={(tiltDeg) => state.set({ tiltDeg })} />
              <NumberField label="Azimut °" value={state.azimuthDeg} min={0} max={359} onChange={(azimuthDeg) => state.set({ azimuthDeg })} />
            </div>
          </details>
          <Label>Topología</Label>
          <div className="grid grid-cols-2 gap-1">
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
        </Section>

        <Section title="Demanda" icon={<Zap size={14} />}>
          <p className="font-mono text-xs text-amber-100">
            {run.load.dailyKwh.toFixed(1)} kWh/día · pico {run.load.peakKw.toFixed(1)} kW
          </p>
          <div className="flex gap-1">
            <button type="button" className="tab" onClick={() => state.applyLoadPreset("home")}>Casa</button>
            <button type="button" className="tab" onClick={() => state.applyLoadPreset("camping")}>Campo</button>
          </div>
          <details>
            <summary className="cursor-pointer text-[11px] text-white/45">Aparatos y horas</summary>
            <div className="mt-2">
              <CompactAppliances
                portable={portable}
                usages={usagesFor(state.topology, state.homeAppliances, state.campingAppliances)}
                items={run.load.items}
                onChange={(id, patch) => state.setAppliance(id, patch)}
              />
            </div>
          </details>
          <NumberField
            label="Autonomía días"
            value={state.autonomyDays}
            min={0}
            max={3}
            step={0.5}
            onChange={(autonomyDays) => state.set({ autonomyDays })}
          />
        </Section>

        <Section title="Equipos" icon={<Box size={14} />}>
          <Label>Proveedor</Label>
          <select className="field" value={state.supplierId} onChange={(e) => state.set({ supplierId: e.target.value })}>
            {SUPPLIERS.map((s) => (
              <option key={s.id} value={s.id}>{s.name} · {s.city}</option>
            ))}
          </select>
          <Label>{portable ? "Panel plegable" : "Panel"}</Label>
          <select className="field" value={state.panelId} onChange={(e) => state.set({ panelId: e.target.value })}>
            {panels.map((p) => (
              <option key={p.id} value={p.id}>
                {p.brand} {p.pmaxW} W · {formatCop(priceFor(p.id, state.supplierId).price.unitUsd * fx)}
              </option>
            ))}
          </select>
          <NumberField
            label={portable ? "Maletas" : "Módulos"}
            value={state.panelCount}
            min={portable ? 1 : 2}
            max={portable ? 8 : 40}
            onChange={(panelCount) => state.set({ panelCount })}
          />
          <Label>{portable ? "Estación" : "Inversor"}</Label>
          <select className="field" value={state.inverterId} onChange={(e) => state.set({ inverterId: e.target.value })}>
            {inverters.map((i) => (
              <option key={i.id} value={i.id}>
                {i.brand} {i.model} · {formatCop(priceFor(i.id, state.supplierId).price.unitUsd * fx)}
              </option>
            ))}
          </select>
          {state.topology !== "ongrid" && (
            <>
              <Label>{portable ? "Pack" : "Batería"}</Label>
              <select className="field" value={state.batteryId} onChange={(e) => state.set({ batteryId: e.target.value })}>
                {batteries.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.brand} {b.nominalKwh} kWh · {formatCop(priceFor(b.id, state.supplierId).price.unitUsd * fx)}
                  </option>
                ))}
              </select>
              <NumberField
                label="Unidades"
                value={state.batteryCount}
                min={1}
                max={portable ? 4 : 12}
                onChange={(batteryCount) => state.set({ batteryCount })}
              />
            </>
          )}
        </Section>

        <details className="rounded-xl border border-white/8 bg-white/3 p-3">
          <summary className="flex cursor-pointer items-center gap-2 text-xs font-semibold uppercase tracking-wider text-cyan-100/80">
            <Battery size={14} /> Tarifa y suciedad
          </summary>
          <div className="mt-2 space-y-2">
            <NumberField label="Tarifa COP/kWh" value={state.tariffCopPerKwh} min={200} max={2000} step={10} onChange={(tariffCopPerKwh) => state.set({ tariffCopPerKwh })} />
            {!portable && (
              <NumberField label="Excedentes COP/kWh" value={state.exportCopPerKwh} min={0} max={1000} step={10} onChange={(exportCopPerKwh) => state.set({ exportCopPerKwh })} />
            )}
            <NumberField label="TRM USD → COP" value={state.usdCop} min={2500} max={8000} step={50} onChange={(usdCop) => state.set({ usdCop })} />
            <NumberField
              label="Suciedad %"
              value={Math.round(state.soiling * 1000) / 10}
              min={0}
              max={15}
              step={0.5}
              onChange={(v) => state.set({ soiling: v / 100 })}
            />
          </div>
        </details>
      </aside>

      <main className="relative min-h-[360px]">
        <SceneCanvas />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-between gap-2 p-3">
          <div className="pointer-events-auto rounded-xl border border-white/10 bg-[#0c121a]/80 p-3 backdrop-blur">
            <Label>Mes / hora</Label>
            <div className="mt-1 flex items-center gap-2">
              <select className="field w-auto" value={state.monthPreview} onChange={(e) => state.set({ monthPreview: Number(e.target.value) })}>
                {MONTHS.map((m, i) => (
                  <option key={m} value={i + 1}>{m}</option>
                ))}
              </select>
              <input type="range" min={0} max={23} value={state.hourPreview} onChange={(e) => state.set({ hourPreview: Number(e.target.value) })} />
              <span className="w-10 font-mono text-xs text-amber-200">{String(state.hourPreview).padStart(2, "0")}:00</span>
            </div>
          </div>
        </div>
      </main>

      <aside className="max-h-[calc(100vh-64px)] overflow-y-auto border-l border-white/10 bg-[#0c121a] p-4">
        <div className="mb-3 grid grid-cols-3 gap-1">
          {(["energia", "dinero", "comparar"] as const).map((t) => (
            <button key={t} type="button" className={`tab ${tab === t ? "tab-on" : ""}`} onClick={() => setTab(t)}>
              {t === "energia" ? "Energía" : t === "dinero" ? "Dinero" : "Comparar"}
            </button>
          ))}
        </div>

        {tab === "energia" && (
          <div className="space-y-3">
            <Metric label="Produce al año" value={formatKwh(run.annual.kwhAc)} />
            <Metric label="Consume al año" value={formatKwh(run.annual.kwhLoad)} />
            <Metric label="El sol cubre" value={formatPct(run.annual.selfSufficiency)} />
            {!portable && <Metric label="Compras a la red" value={formatKwh(run.annual.kwhImport)} />}
            {!portable && <Metric label="Excedentes" value={formatKwh(run.annual.kwhExport)} />}
            <Metric label="No cubierto" value={formatKwh(run.annual.kwhUnmet)} />
            <MonthlyBars values={monthly} selected={state.monthPreview} onSelect={(monthPreview) => state.set({ monthPreview })} />
            <HourlyChart hours={run.annual.hours.filter((h) => h.month === state.monthPreview)} />
            <details>
              <summary className="cursor-pointer text-[11px] text-white/45">Pérdidas y recortes</summary>
              <div className="mt-2 space-y-1">
                <Metric label="PR" value={formatPct(run.annual.performanceRatio)} />
                <Metric label="Pérdida inversor" value={formatKwh(run.annual.kwhInverterLoss)} />
                <Metric label="Clipping" value={formatKwh(run.annual.kwhClipping)} />
              </div>
            </details>
            {run.warnings.map((w) => (
              <p key={w} className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-2 py-1.5 text-xs text-amber-100">{w}</p>
            ))}
          </div>
        )}

        {tab === "dinero" && (
          <div className="space-y-3">
            <Metric label="LCOE" value={formatCopPerKwh(run.economics.lcoeCopPerKwh)} hint={formatUsdPerKwh(run.economics.lcoeUsdPerKwh)} />
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
            <Metric label={portable ? "Ahorro vs planta / año" : "Ahorro anual"} value={formatCop(run.economics.annualSavingsCop)} />
            <Metric label="Payback" value={formatYears(run.economics.simplePaybackYears)} />
            <Metric label={`VPN ${state.projectYears} años`} value={formatCop(run.economics.npvCop)} />
          </div>
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
  );
}

function CompactAppliances({
  portable,
  usages,
  items,
  onChange,
}: {
  portable: boolean;
  usages: Record<string, ApplianceUsage>;
  items: { id: string; dailyKwh: number }[];
  onChange: (id: string, patch: Partial<ApplianceUsage>) => void;
}) {
  const kwhById = new Map(items.map((i) => [i.id, i.dailyKwh]));
  const cats: Appliance["category"][] = portable
    ? ["camping", "climate", "living", "kitchen", "laundry"]
    : ["climate", "kitchen", "living", "laundry", "camping"];
  return (
    <div className="space-y-2">
      {cats.map((cat) => (
        <div key={cat}>
          {APPLIANCES.filter((a) => a.category === cat).map((a) => {
            const usage = usages[a.id] ?? { count: 0, hours: a.defaultHours };
            return (
              <div key={a.id} className="flex items-center gap-2 py-0.5">
                <span className="w-4 text-xs">{a.icon}</span>
                <span className="min-w-0 flex-1 truncate text-[11px]">{a.name}</span>
                <span className="w-10 font-mono text-[10px] text-white/40">
                  {usage.count > 0 ? `${(kwhById.get(a.id) ?? 0).toFixed(1)}` : ""}
                </span>
                <button type="button" className="tab px-1.5" onClick={() => onChange(a.id, { count: Math.max(0, usage.count - 1) })}>−</button>
                <span className="w-3 text-center font-mono text-[11px]">{usage.count}</span>
                <button type="button" className="tab px-1.5" onClick={() => onChange(a.id, { count: Math.min(6, usage.count + 1) })}>+</button>
              </div>
            );
          })}
        </div>
      ))}
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
    <div>
      <p className="mb-1 text-[11px] text-white/55">Día típico del mes (DC / AC / carga)</p>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full rounded-lg bg-black/30">
        {ready ? (
          <>
            <path d={path("pvDc")} fill="none" stroke="#f5a524" strokeWidth="1.6" />
            <path d={path("inverterAc")} fill="none" stroke="#3ee0c2" strokeWidth="1.6" />
            <path d={path("load")} fill="none" stroke="#8b9bb0" strokeWidth="1.2" />
          </>
        ) : null}
      </svg>
    </div>
  );
}

function CompareList({
  quotes,
  onApply,
}: {
  quotes: RunResult["quotes"];
  onApply: (q: RunResult["quotes"][number]) => void;
}) {
  if (quotes.length === 0) {
    return <p className="text-sm text-white/50">No hay combinaciones compatibles.</p>;
  }
  return (
    <div className="space-y-2">
      <p className="text-xs text-white/55">Cotizaciones ilustrativas, ordenadas por LCOE y payback.</p>
      {quotes.map((q, i) => (
        <button
          key={q.id}
          type="button"
          onClick={() => onApply(q)}
          className="w-full rounded-xl border border-white/10 bg-white/4 p-3 text-left hover:border-amber-300/40"
        >
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium">#{i + 1} {q.supplierName}</p>
            <p className="font-mono text-xs text-amber-200">{formatCop(q.economics.capexCop)}</p>
          </div>
          <p className="mt-1 text-[11px] text-white/55">
            {q.panelCount}× {q.panel.brand} {q.panel.pmaxW}W · {q.inverter.brand} {q.inverter.pAcKw} kW
          </p>
          <p className="mt-1 font-mono text-[11px] text-cyan-100/80">
            LCOE {formatCopPerKwh(q.economics.lcoeCopPerKwh)} · {formatYears(q.economics.simplePaybackYears)}
          </p>
        </button>
      ))}
    </div>
  );
}
