"use client";

import dynamic from "next/dynamic";

const SolarScene = dynamic(() => import("./SolarScene"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full min-h-[320px] items-center justify-center bg-[#081018] text-sm text-cyan-100/70">
      Montando escena 3D…
    </div>
  ),
});

export function SceneCanvas() {
  return <SolarScene />;
}
