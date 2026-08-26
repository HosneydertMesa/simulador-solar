"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import type { Group, Mesh } from "three";
import * as THREE from "three";
import { panelById } from "@/data/catalog";
import { useSimulator } from "@/store/simulation";

type Props = {
  sunPosition: [number, number, number];
  sunVisible: boolean;
};

export function SiteModels({ sunPosition, sunVisible }: Props) {
  const selected = useSimulator((s) => s.selectedObject);
  const set = useSimulator((s) => s.set);
  const count = useSimulator((s) => s.panelCount);
  const tilt = useSimulator((s) => s.tiltDeg);
  const topology = useSimulator((s) => s.topology);
  const batteryCount = useSimulator((s) => s.batteryCount);
  const panel = panelById(useSimulator((s) => s.panelId));
  const hour = useSimulator((s) => s.hourPreview);

  return (
    <group>
      <House
        tilt={tilt}
        selected={selected === "house"}
        onSelect={() => set({ selectedObject: "house" })}
      />
      <RoofArray
        tilt={tilt}
        count={count}
        widthM={panel.widthM}
        heightM={panel.heightM}
        selected={selected === "panels"}
        onSelect={() => set({ selectedObject: "panels" })}
        glow={sunVisible}
      />
      <InverterBox
        selected={selected === "inverter"}
        onSelect={() => set({ selectedObject: "inverter" })}
      />
      {topology !== "ongrid" && (
        <BatteryRack
          count={batteryCount}
          selected={selected === "battery"}
          onSelect={() => set({ selectedObject: "battery" })}
        />
      )}
      {topology !== "offgrid" && <MeterPole />}
      <EnergyCables topology={topology} pulse={hour} />
      <SunMarker position={sunPosition} visible={sunVisible} />
      <Tree position={[-8.5, 0, 5.5]} />
      <Tree position={[9.2, 0, -4.2]} scale={1.15} />
    </group>
  );
}

function House({
  tilt,
  selected,
  onSelect,
}: {
  tilt: number;
  selected: boolean;
  onSelect: () => void;
}) {
  const pitch = (Math.min(Math.max(tilt, 8), 35) * Math.PI) / 180;
  const half = 3.35;
  const rise = Math.tan(pitch) * half;

  return (
    <group onClick={(e) => { e.stopPropagation(); onSelect(); }}>
      <mesh position={[0, 1.45, 0]} castShadow receiveShadow>
        <boxGeometry args={[8.2, 2.9, 6.4]} />
        <meshStandardMaterial
          color={selected ? "#f3e6d0" : "#e6d5b8"}
          roughness={0.86}
        />
      </mesh>
      <mesh position={[0, 1.35, 3.22]}>
        <boxGeometry args={[1.35, 2.2, 0.12]} />
        <meshStandardMaterial color="#4a2c18" roughness={0.6} />
      </mesh>
      {[-2.2, 2.2].map((x) => (
        <mesh key={x} position={[x, 1.7, 3.22]}>
          <boxGeometry args={[1.2, 1.1, 0.08]} />
          <meshStandardMaterial color="#7ec8e3" roughness={0.15} metalness={0.3} />
        </mesh>
      ))}
      <mesh
        position={[0, 2.9 + rise / 2, -half / 2]}
        rotation={[pitch, 0, 0]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[8.7, 0.12, half / Math.cos(pitch) + 0.15]} />
        <meshStandardMaterial color="#6f2e22" roughness={0.92} />
      </mesh>
      <mesh
        position={[0, 2.9 + rise / 2, half / 2]}
        rotation={[-pitch, 0, 0]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[8.7, 0.12, half / Math.cos(pitch) + 0.15]} />
        <meshStandardMaterial color="#7a3426" roughness={0.92} />
      </mesh>
    </group>
  );
}

function RoofArray({
  tilt,
  count,
  widthM,
  heightM,
  selected,
  onSelect,
  glow,
}: {
  tilt: number;
  count: number;
  widthM: number;
  heightM: number;
  selected: boolean;
  onSelect: () => void;
  glow: boolean;
}) {
  const pitch = (Math.min(Math.max(tilt, 8), 35) * Math.PI) / 180;
  const half = 3.35;
  const rise = Math.tan(pitch) * half;
  const visual = Math.min(count, 24);
  const cols = Math.min(6, visual);
  const rows = Math.ceil(visual / cols);
  const gap = 0.06;
  const panels = useMemo(() => {
    const list: { x: number; z: number }[] = [];
    for (let i = 0; i < visual; i += 1) {
      const r = Math.floor(i / cols);
      const c = i % cols;
      list.push({
        x: (c - (cols - 1) / 2) * (widthM + gap),
        z: (r - (rows - 1) / 2) * (heightM + gap),
      });
    }
    return list;
  }, [visual, cols, rows, widthM, heightM]);

  return (
    <group
      position={[0, 2.98 + rise / 2, -half / 2]}
      rotation={[pitch, 0, 0]}
      onClick={(e) => { e.stopPropagation(); onSelect(); }}
    >
      {panels.map((p, i) => (
        <group key={i} position={[p.x, 0.09, p.z]}>
          <mesh castShadow>
            <boxGeometry args={[widthM, 0.045, heightM]} />
            <meshStandardMaterial
              color={selected ? "#12385c" : "#08192c"}
              metalness={0.72}
              roughness={0.22}
              emissive={glow ? "#0b3a6a" : "#01060c"}
              emissiveIntensity={glow ? 0.35 : 0.08}
            />
          </mesh>
          <mesh position={[0, 0.028, 0]}>
            <boxGeometry args={[widthM * 0.92, 0.004, heightM * 0.92]} />
            <meshStandardMaterial
              color="#0c2744"
              metalness={0.5}
              roughness={0.18}
            />
          </mesh>
        </group>
      ))}
      {count > 24 && (
        <Html position={[0, 0.4, 0]} center>
          <div className="rounded-full bg-black/70 px-2 py-1 text-[10px] text-amber-200">
            +{count - 24} módulos
          </div>
        </Html>
      )}
    </group>
  );
}

function InverterBox({
  selected,
  onSelect,
}: {
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <group
      position={[4.3, 1.15, 2.2]}
      onClick={(e) => { e.stopPropagation(); onSelect(); }}
    >
      <mesh castShadow>
        <boxGeometry args={[0.42, 0.7, 0.22]} />
        <meshStandardMaterial
          color={selected ? "#3a3f48" : "#22262e"}
          metalness={0.4}
          roughness={0.45}
        />
      </mesh>
      <mesh position={[0, 0.18, 0.12]}>
        <boxGeometry args={[0.18, 0.08, 0.02]} />
        <meshStandardMaterial
          color="#3ee0c2"
          emissive="#3ee0c2"
          emissiveIntensity={1.4}
        />
      </mesh>
      <Html position={[0, 0.55, 0]} center>
        <div className="rounded bg-black/60 px-1.5 py-0.5 text-[9px] tracking-wide text-cyan-100">
          INVERSOR
        </div>
      </Html>
    </group>
  );
}

function BatteryRack({
  count,
  selected,
  onSelect,
}: {
  count: number;
  selected: boolean;
  onSelect: () => void;
}) {
  const n = Math.min(Math.max(count, 1), 8);
  return (
    <group
      position={[5.4, 0, 0.6]}
      onClick={(e) => { e.stopPropagation(); onSelect(); }}
    >
      {Array.from({ length: n }).map((_, i) => (
        <mesh key={i} position={[0, 0.22 + i * 0.38, 0]} castShadow>
          <boxGeometry args={[0.7, 0.34, 0.48]} />
          <meshStandardMaterial
            color={selected ? "#1b3d36" : "#10161c"}
            metalness={0.35}
            roughness={0.5}
          />
        </mesh>
      ))}
      <Html position={[0, 0.4 + n * 0.38, 0]} center>
        <div className="rounded bg-black/60 px-1.5 py-0.5 text-[9px] tracking-wide text-amber-100">
          BATERÍAS ×{count}
        </div>
      </Html>
    </group>
  );
}

function MeterPole() {
  return (
    <group position={[-6.4, 0, 3.2]}>
      <mesh position={[0, 2.2, 0]} castShadow>
        <cylinderGeometry args={[0.08, 0.09, 4.4, 10]} />
        <meshStandardMaterial color="#4a433a" roughness={0.8} />
      </mesh>
      <mesh position={[0.18, 3.1, 0]} castShadow>
        <boxGeometry args={[0.28, 0.4, 0.22]} />
        <meshStandardMaterial color="#6b7280" metalness={0.5} roughness={0.4} />
      </mesh>
    </group>
  );
}

function Tree({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.6, 0]} castShadow>
        <cylinderGeometry args={[0.12, 0.16, 1.2, 8]} />
        <meshStandardMaterial color="#5c3a22" roughness={1} />
      </mesh>
      <mesh position={[0, 1.7, 0]} castShadow>
        <coneGeometry args={[1.05, 2.1, 10]} />
        <meshStandardMaterial color="#1f5c38" roughness={0.9} />
      </mesh>
    </group>
  );
}

function SunMarker({
  position,
  visible,
}: {
  position: [number, number, number];
  visible: boolean;
}) {
  if (!visible) return null;
  return (
    <mesh position={position}>
      <sphereGeometry args={[1.1, 24, 24]} />
      <meshBasicMaterial color="#ffe7a3" />
    </mesh>
  );
}

function EnergyCables({ topology, pulse }: { topology: string; pulse: number }) {
  const ref = useRef<Mesh>(null);
  const path = useMemo(() => {
    const pts = [
      new THREE.Vector3(0, 4.2, -2.2),
      new THREE.Vector3(2.4, 3.4, 0.4),
      new THREE.Vector3(4.3, 1.5, 2.2),
    ];
    if (topology !== "ongrid") pts.push(new THREE.Vector3(5.4, 1.1, 0.6));
    return new THREE.CatmullRomCurve3(pts);
  }, [topology]);

  const geometry = useMemo(() => new THREE.TubeGeometry(path, 48, 0.025, 8, false), [path]);
  const bead = useRef<Group>(null);

  useFrame((_, dt) => {
    if (!bead.current) return;
    const t = ((performance.now() / 2200 + pulse / 24) % 1);
    const p = path.getPointAt(t);
    bead.current.position.copy(p);
    if (ref.current) {
      const mat = ref.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 0.6 + Math.sin(performance.now() / 400) * 0.25;
    }
    void dt;
  });

  return (
    <group>
      <mesh ref={ref} geometry={geometry}>
        <meshStandardMaterial
          color="#3ee0c2"
          emissive="#3ee0c2"
          emissiveIntensity={0.8}
          roughness={0.3}
        />
      </mesh>
      <group ref={bead}>
        <mesh>
          <sphereGeometry args={[0.07, 12, 12]} />
          <meshBasicMaterial color="#f5a524" />
        </mesh>
      </group>
    </group>
  );
}
