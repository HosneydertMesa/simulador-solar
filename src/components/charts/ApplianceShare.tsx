"use client";

const COLORS = ["#f5a524", "#3ee0c2", "#7eb6ff", "#e8899a", "#c4b5fd", "#94a3b8"];

export function ApplianceShare({
  items,
}: {
  items: { id: string; name: string; dailyKwh: number }[];
}) {
  const slices = items.filter((i) => i.dailyKwh > 0.05).slice(0, 6);
  const total = slices.reduce((s, i) => s + i.dailyKwh, 0);
  if (total <= 0) return null;
  const r = 36;
  const c = 42;
  const circ = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="flex items-center gap-3">
      <svg viewBox="0 0 84 84" className="h-24 w-24 shrink-0" aria-hidden>
        {slices.map((slice, i) => {
          const frac = slice.dailyKwh / total;
          const dash = frac * circ;
          const el = (
            <circle
              key={slice.id}
              cx={c}
              cy={c}
              r={r}
              fill="none"
              stroke={COLORS[i % COLORS.length]}
              strokeWidth="10"
              strokeDasharray={`${dash} ${circ - dash}`}
              strokeDashoffset={-offset}
              transform={`rotate(-90 ${c} ${c})`}
            />
          );
          offset += dash;
          return el;
        })}
      </svg>
      <ul className="min-w-0 space-y-1 text-[11px]">
        {slices.map((slice, i) => (
          <li key={slice.id} className="flex items-center justify-between gap-2">
            <span className="flex min-w-0 items-center gap-1.5 text-white/70">
              <span
                className="inline-block h-2 w-2 shrink-0 rounded-full"
                style={{ background: COLORS[i % COLORS.length] }}
              />
              <span className="truncate">{slice.name}</span>
            </span>
            <span className="font-mono text-white/50">{Math.round((slice.dailyKwh / total) * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
