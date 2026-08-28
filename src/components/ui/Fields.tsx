"use client";

import type { ReactNode } from "react";

export function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: ReactNode;
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

export function Label({ children }: { children: ReactNode }) {
  return <p className="text-[11px] text-white/55">{children}</p>;
}

export function NumberField({
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

export function Stat({ label, value, chip }: { label: string; value: string; chip?: boolean }) {
  return (
    <div className={chip ? "rounded-lg border border-white/10 bg-white/5 px-3 py-1.5" : ""}>
      <p className="text-[10px] uppercase tracking-wider text-white/45">{label}</p>
      <p className="font-mono text-sm text-amber-100">{value}</p>
    </div>
  );
}

export function Metric({ label, value, hint }: { label: string; value: string; hint?: string }) {
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
