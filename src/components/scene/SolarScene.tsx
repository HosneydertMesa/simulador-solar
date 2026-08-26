"use client";

import { useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { ContactShadows, OrbitControls, Sky } from "@react-three/drei";
import { useSimulator } from "@/store/simulation";
import { locationById } from "@/data/locations";
import { declination, hourAngle, solarAltitude, solarAzimuth, sunVector } from "@/engine/sun";
import { midMonthDayOfYear } from "@/engine/math";
import { SiteModels } from "./SiteModels";

export default function SolarScene() {
  const month = useSimulator((s) => s.monthPreview);
  const hour = useSimulator((s) => s.hourPreview);
  const locationId = useSimulator((s) => s.locationId);
  const location = locationById(locationId);

  const sun = useMemo(() => {
    const day = midMonthDayOfYear(month);
    const delta = declination(day);
    const omega = hourAngle(hour + 0.5);
    const alt = solarAltitude(location.lat, delta, omega);
    const az = solarAzimuth(location.lat, delta, omega, alt);
    const visible = alt > 0;
    const dir = sunVector(Math.max(alt, 8), az);
    const position: [number, number, number] = [dir[0] * 48, dir[1] * 48, dir[2] * 48];
    return { alt, az, visible, position, intensity: visible ? 2.2 : 0.08 };
  }, [month, hour, location.lat]);

  return (
    <Canvas
      shadows
      dpr={[1, 1.8]}
      camera={{ position: [13, 8.5, 14], fov: 38, near: 0.1, far: 200 }}
      gl={{ antialias: true }}
      style={{ width: "100%", height: "100%" }}
    >
      <color attach="background" args={["#081018"]} />
      <fog attach="fog" args={["#081018", 28, 70]} />
      <Sky
        sunPosition={sun.position}
        turbidity={sun.visible ? 6 : 12}
        rayleigh={sun.visible ? 0.8 : 0.2}
        mieCoefficient={0.005}
        mieDirectionalG={0.8}
        inclination={0.5}
        azimuth={0.25}
      />
      <hemisphereLight args={["#b9d7ff", "#3d2a18", sun.visible ? 0.55 : 0.12]} />
      <ambientLight intensity={sun.visible ? 0.18 : 0.06} />
      <directionalLight
        castShadow
        position={sun.position}
        intensity={sun.intensity}
        color={sun.visible ? "#fff4d6" : "#6b7cff"}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-near={1}
        shadow-camera-far={90}
        shadow-camera-left={-22}
        shadow-camera-right={22}
        shadow-camera-top={22}
        shadow-camera-bottom={-22}
      />
      <SiteModels sunPosition={sun.position} sunVisible={sun.visible} />
      <ContactShadows
        position={[0, 0.01, 0]}
        opacity={0.45}
        scale={40}
        blur={2.2}
        far={12}
      />
      <OrbitControls
        makeDefault
        target={[0, 1.6, 0]}
        minPolarAngle={0.25}
        maxPolarAngle={Math.PI / 2.05}
        minDistance={6}
        maxDistance={38}
        enablePan
      />
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, 0]}
        receiveShadow
        onClick={() => useSimulator.getState().set({ selectedObject: null })}
      >
        <circleGeometry args={[48, 64]} />
        <meshStandardMaterial color="#1a3324" roughness={0.95} />
      </mesh>
      <gridHelper args={[40, 40, "#1e3d32", "#14261e"]} position={[0, 0.02, 0]} />
    </Canvas>
  );
}
