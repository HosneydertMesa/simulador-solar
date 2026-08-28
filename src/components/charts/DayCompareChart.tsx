"use client";

import { useSyncExternalStore } from "react";
import type { DayPoint } from "@/engine/charts";

const emptySubscribe = () => () => {};

export function DayCompareChart({
  points,
  selectedHour,
  onSelectHour,
}: {
  points: DayPoint[];
  selectedHour: number;
  onSelectHour: (hour: number) => void;
}) {
  const ready = useSyncExternalStore(emptySubscribe, () => true, () => false);
  const w = 560;
  const h = 168;
  const padL = 8;
  const padR = 8;
  const padT = 12;
  const padB = 22;
  const innerW = w - padL - padR;
  const innerH = h - padT - padB;
  const max = Math.max(0.25, ...points.flatMap((p) => [p.solarKw, p.loadKw]));
  const slot = innerW / 24;
  const selected = points[selectedHour] ?? points[0];

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-xs font-medium text-white/80">Un día: el sol contra lo que enchufas</p>
          <p className="text-[11px] text-white/45">Toca una hora. Ámbar = sol · gris = casa.</p>
        </div>
        {selected && (
          <p className="font-mono text-xs text-cyan-100">
            {String(selected.hour).padStart(2, "0")}:00 · sol {selected.solarKw.toFixed(1)} kW · casa{" "}
            {selected.loadKw.toFixed(1)} kW
          </p>
        )}
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full rounded-xl bg-black/35" role="img" aria-label="Sol contra consumo en 24 horas">
        {ready
          ? points.map((p) => {
              const x = padL + p.hour * slot;
              const solarH = (p.solarKw / max) * innerH;
              const loadH = (p.loadKw / max) * innerH;
              const on = p.hour === selectedHour;
              return (
                <g key={p.hour}>
                  <rect
                    x={x + slot * 0.08}
                    y={padT + innerH - solarH}
                    width={slot * 0.38}
                    height={Math.max(solarH, 1)}
                    rx={2}
                    fill={on ? "#f5c056" : "#f5a524"}
                    opacity={on ? 1 : 0.72}
                  />
                  <rect
                    x={x + slot * 0.5}
                    y={padT + innerH - loadH}
                    width={slot * 0.38}
                    height={Math.max(loadH, 1)}
                    rx={2}
                    fill={on ? "#d5dee8" : "#8b9bb0"}
                    opacity={on ? 1 : 0.8}
                  />
                  <rect
                    x={x}
                    y={0}
                    width={slot}
                    height={h}
                    fill="transparent"
                    className="cursor-pointer"
                    onClick={() => onSelectHour(p.hour)}
                  >
                    <title>{`${String(p.hour).padStart(2, "0")}:00 · sol ${p.solarKw.toFixed(2)} kW · casa ${p.loadKw.toFixed(2)} kW`}</title>
                  </rect>
                  {p.hour % 3 === 0 && (
                    <text
                      x={x + slot / 2}
                      y={h - 6}
                      textAnchor="middle"
                      fill="#8b9bb0"
                      fontSize="9"
                    >
                      {p.hour}
                    </text>
                  )}
                </g>
              );
            })
          : null}
      </svg>
    </div>
  );
}
