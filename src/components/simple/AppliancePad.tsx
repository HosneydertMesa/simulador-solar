"use client";

import { APPLIANCES } from "@/data/appliances";
import type { ApplianceUsage } from "@/data/appliances";

const HOME_FEATURED = ["fridge", "ac12", "lights", "tv", "shower", "washer"];
const CAMP_FEATURED = ["campingFridge", "lights", "fan", "laptop", "phones", "ac12"];

export function AppliancePad({
  portable,
  usages,
  items,
  dailyKwh,
  topLoadName,
  onChange,
  onFill,
}: {
  portable: boolean;
  usages: Record<string, ApplianceUsage>;
  items: { id: string; dailyKwh: number }[];
  dailyKwh: number;
  topLoadName: string | null;
  onChange: (id: string, patch: Partial<ApplianceUsage>) => void;
  onFill: (preset: "home" | "camping") => void;
}) {
  const kwhById = new Map(items.map((i) => [i.id, i.dailyKwh]));
  const featured = portable ? CAMP_FEATURED : HOME_FEATURED;
  const rest = APPLIANCES.filter((a) => !featured.includes(a.id));

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        {featured.map((id) => {
          const a = APPLIANCES.find((x) => x.id === id);
          if (!a) return null;
          const usage = usages[a.id] ?? { count: 0, hours: a.defaultHours };
          return (
            <ApplianceCard
              key={a.id}
              icon={a.icon}
              name={a.name}
              hint={a.hint}
              kwh={kwhById.get(a.id) ?? 0}
              dailyKwh={dailyKwh}
              isTop={topLoadName === a.name}
              usage={usage}
              onChange={(patch) => onChange(a.id, patch)}
            />
          );
        })}
      </div>
      <details className="rounded-xl border border-white/8 bg-black/20 px-3 py-2">
        <summary className="cursor-pointer text-xs text-white/55">Más aparatos</summary>
        <div className="mt-2 flex flex-wrap gap-1">
          <button type="button" className="tab" onClick={() => onFill("home")}>
            Lista de casa
          </button>
          <button type="button" className="tab" onClick={() => onFill("camping")}>
            Lista de camping
          </button>
        </div>
        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {rest.map((a) => {
            const usage = usages[a.id] ?? { count: 0, hours: a.defaultHours };
            return (
              <ApplianceCard
                key={a.id}
                icon={a.icon}
                name={a.name}
                hint={a.hint}
                kwh={kwhById.get(a.id) ?? 0}
                dailyKwh={dailyKwh}
                isTop={topLoadName === a.name}
                usage={usage}
                onChange={(patch) => onChange(a.id, patch)}
              />
            );
          })}
        </div>
      </details>
    </div>
  );
}

function ApplianceCard({
  icon,
  name,
  hint,
  kwh,
  dailyKwh,
  isTop,
  usage,
  onChange,
}: {
  icon: string;
  name: string;
  hint: string;
  kwh: number;
  dailyKwh: number;
  isTop: boolean;
  usage: ApplianceUsage;
  onChange: (patch: Partial<ApplianceUsage>) => void;
}) {
  const on = usage.count > 0;
  const share = on && dailyKwh > 0 ? Math.round((kwh / dailyKwh) * 100) : 0;
  return (
    <div
      className={`rounded-xl border p-2.5 ${
        on ? "border-amber-300/35 bg-amber-400/8" : "border-white/8 bg-white/3"
      }`}
      title={hint}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm">
            <span className="mr-1" aria-hidden>
              {icon}
            </span>
            {name}
          </p>
          <p className="font-mono text-[11px] text-white/45">
            {on ? `${kwh.toFixed(1)} kWh · ${share}% de tu día` : "apagado"}
          </p>
          {isTop && on && (
            <p className="mt-0.5 text-[10px] text-amber-200">Esto es lo que más pide</p>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="tab px-2"
            onClick={() => onChange({ count: Math.max(0, usage.count - 1) })}
            aria-label={`Quitar ${name}`}
          >
            −
          </button>
          <span className="w-4 text-center font-mono text-xs">{usage.count}</span>
          <button
            type="button"
            className="tab px-2"
            onClick={() => onChange({ count: Math.min(6, usage.count + 1) })}
            aria-label={`Agregar ${name}`}
          >
            +
          </button>
        </div>
      </div>
      {on && (
        <label className="mt-2 flex items-center justify-between gap-2 text-[10px] text-white/45">
          Horas/día
          <input
            className="field w-16 py-0.5 text-right"
            type="number"
            min={0}
            max={24}
            step={0.25}
            value={usage.hours}
            onChange={(e) => onChange({ hours: Math.min(24, Math.max(0, Number(e.target.value))) })}
          />
        </label>
      )}
    </div>
  );
}
