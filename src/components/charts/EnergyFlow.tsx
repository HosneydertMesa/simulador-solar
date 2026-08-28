"use client";

export function EnergyFlow({
  solarKwh,
  loadKwh,
  gridKwh,
  unmetKwh,
  islanded,
}: {
  solarKwh: number;
  loadKwh: number;
  gridKwh: number;
  unmetKwh: number;
  islanded: boolean;
}) {
  const max = Math.max(solarKwh, loadKwh, gridKwh, unmetKwh, 1);
  const rows = [
    { label: "Lo que genera el sol", value: solarKwh, color: "from-amber-400 to-amber-200" },
    { label: "Lo que pide la casa", value: loadKwh, color: "from-slate-400 to-slate-200" },
    islanded
      ? { label: "Se apaga / no cubierto", value: unmetKwh, color: "from-rose-500 to-orange-300" }
      : { label: "Lo compras a la red", value: gridKwh, color: "from-cyan-500 to-cyan-200" },
  ];
  return (
    <div className="space-y-2">
      {rows.map((row) => (
        <div key={row.label}>
          <div className="mb-0.5 flex justify-between text-[11px]">
            <span className="text-white/60">{row.label}</span>
            <span className="font-mono text-white/80">{row.value.toFixed(0)} kWh/año</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/10">
            <div
              className={`h-full rounded-full bg-gradient-to-r ${row.color}`}
              style={{ width: `${Math.min(100, (row.value / max) * 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
