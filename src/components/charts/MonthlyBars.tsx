"use client";

import { useSyncExternalStore } from "react";

const MONTHS = ["E", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];
const emptySubscribe = () => () => {};

export function MonthlyBars({
  values,
  selected,
  onSelect,
}: {
  values: number[];
  selected: number;
  onSelect: (month: number) => void;
}) {
  const ready = useSyncExternalStore(emptySubscribe, () => true, () => false);
  const max = Math.max(1, ...values);
  const w = 320;
  const h = 88;
  const slot = w / 12;
  return (
    <div>
      <p className="mb-1 text-[11px] text-white/55">Producción en el año (toca un mes)</p>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full rounded-lg bg-black/30">
        {ready
          ? values.map((v, i) => {
              const month = i + 1;
              const barH = (v / max) * (h - 18);
              const on = month === selected;
              return (
                <g key={month} onClick={() => onSelect(month)} className="cursor-pointer">
                  <rect
                    x={i * slot + 4}
                    y={h - 14 - barH}
                    width={slot - 8}
                    height={Math.max(barH, 2)}
                    rx={3}
                    fill={on ? "#3ee0c2" : "#f5a524"}
                    opacity={on ? 1 : 0.7}
                  />
                  <text x={i * slot + slot / 2} y={h - 3} textAnchor="middle" fill="#8b9bb0" fontSize="9">
                    {MONTHS[i]}
                  </text>
                </g>
              );
            })
          : null}
      </svg>
    </div>
  );
}
