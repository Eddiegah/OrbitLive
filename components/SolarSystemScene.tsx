"use client";

/**
 * SolarSystemScene -- every planet's position here comes from
 * lib/orbitalMechanics.ts, real Keplerian orbital mechanics (JPL's
 * published elements), not a hand-tuned animation loop. During time-warp,
 * we're not playing back a canned animation -- we're recomputing the same
 * real formula for a different simulated date every frame.
 *
 * Coordinate mapping: orbitalMechanics.ts works in heliocentric ECLIPTIC
 * coordinates (x,y in the ecliptic plane, z out of it). Three.js is Y-up,
 * so ecliptic z (out-of-plane) becomes Three.js Y, and ecliptic x/y become
 * Three.js x/z -- this keeps the solar system lying roughly flat with "up"
 * meaning "north of the ecliptic," which is the conventional way these are
 * drawn. This mapping intentionally lives here, not in orbitalMechanics.ts,
 * so that module stays free of a three.js import (see OctoPulse's
 * lib/eventStyle.ts for why that matters: importing three.js into a module
 * used synchronously by page.tsx would defeat the dynamic-import code
 * splitting for the whole 3D scene).
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Stars } from "@react-three/drei";
import * as THREE from "three";
import { PLANETS, OrbitalElements, heliocentricPosition, orbitEllipsePoints, sceneDistance, sceneRadius } from "../lib/orbitalMechanics";

function toScene(x: number, y: number, z: number): THREE.Vector3 {
  const distanceAU = Math.sqrt(x * x + y * y + z * z) || 1e-9;
  const factor = sceneDistance(distanceAU) / distanceAU;
  return new THREE.Vector3(x * factor, z * factor, y * factor);
}

function OrbitRing({ planet, date }: { planet: OrbitalElements; date: Date }) {
  const geometry = useMemo(() => {
    const pts = orbitEllipsePoints(planet, date).map(([x, y, z]) => toScene(x, y, z));
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    return geo;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planet.name]);

  return (
    <line>
      <primitive object={geometry} attach="geometry" />
      <lineBasicMaterial color={planet.color} transparent opacity={0.35} />
    </line>
  );
}

function Sun() {
  const glowRef = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (glowRef.current) {
      const pulse = 1 + Math.sin(clock.elapsedTime * 0.8) * 0.03;
      glowRef.current.scale.setScalar(pulse);
    }
  });
  return (
    <group>
      <pointLight color="#fff3d6" intensity={3.2} distance={0} decay={1.6} />
      <mesh>
        <sphereGeometry args={[0.14, 32, 32]} />
        <meshBasicMaterial color="#ffe9a8" />
      </mesh>
      <mesh ref={glowRef}>
        <sphereGeometry args={[0.22, 32, 32]} />
        <meshBasicMaterial color="#ffcf6b" transparent opacity={0.25} depthWrite={false} />
      </mesh>
    </group>
  );
}

interface PlanetMeshProps {
  planet: OrbitalElements;
  position: THREE.Vector3;
  isFocused: boolean;
  onSelect: () => void;
}

function PlanetMesh({ planet, position, isFocused, onSelect }: PlanetMeshProps) {
  const radius = sceneRadius(planet.radiusEarths);
  return (
    <group position={position}>
      <mesh onClick={(e) => { e.stopPropagation(); onSelect(); }}>
        <sphereGeometry args={[radius, 24, 24]} />
        <meshStandardMaterial color={planet.color} roughness={0.75} metalness={0.05} />
      </mesh>
      {isFocused && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[radius * 1.8, radius * 2.1, 32]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.8} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      )}
      {/* generous invisible hit-target so small inner planets are easy to click */}
      <mesh onClick={(e) => { e.stopPropagation(); onSelect(); }} visible={false}>
        <sphereGeometry args={[Math.max(radius * 3, 0.06), 8, 8]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>
    </group>
  );
}

function CameraRig({ focusedPlanet, date }: { focusedPlanet: OrbitalElements | null; date: React.MutableRefObject<Date> }) {
  const { camera } = useThree();
  const controlsRef = useRef<any>(null);

  useFrame(() => {
    const controls = controlsRef.current;
    if (!controls) return;
    if (!focusedPlanet) {
      controls.update();
      return;
    }
    const pos = heliocentricPosition(focusedPlanet, date.current);
    const target = toScene(pos.x, pos.y, pos.z);
    const prevTarget = controls.target.clone();
    controls.target.lerp(target, 0.06);
    const delta = controls.target.clone().sub(prevTarget);
    camera.position.add(delta);

    const desiredDist = Math.max(0.4, sceneRadius(focusedPlanet.radiusEarths) * 8);
    const offset = camera.position.clone().sub(controls.target);
    const newDist = THREE.MathUtils.lerp(offset.length(), desiredDist, 0.04);
    camera.position.copy(controls.target).add(offset.normalize().multiplyScalar(newDist));
    controls.update();
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enablePan={false}
      minDistance={0.25}
      maxDistance={20}
      rotateSpeed={0.5}
      zoomSpeed={0.8}
    />
  );
}

function TimeDriver({
  dateRef,
  speedRef,
  onTick,
}: {
  dateRef: React.MutableRefObject<Date>;
  speedRef: React.MutableRefObject<number>;
  onTick: (d: Date) => void;
}) {
  const sinceLastUiUpdate = useRef(0);
  useFrame((_state, delta) => {
    if (speedRef.current === 0) {
      // "Now (live)" -- always track real wall-clock time, not a frozen
      // moment from whenever time-warp was last active.
      dateRef.current = new Date();
    } else {
      dateRef.current = new Date(dateRef.current.getTime() + delta * 1000 * speedRef.current);
    }
    sinceLastUiUpdate.current += delta;
    if (sinceLastUiUpdate.current > 0.4) {
      sinceLastUiUpdate.current = 0;
      onTick(dateRef.current);
    }
  });
  return null;
}

function useContainerSize(ref: React.RefObject<HTMLDivElement>) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setSize({ width: el.clientWidth, height: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener("resize", measure);
    const retryTimers = [50, 250, 750].map((ms) => window.setTimeout(measure, ms));
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
      retryTimers.forEach(clearTimeout);
    };
  }, [ref]);
  return size;
}

function Planets({ dateRef, focusedName, onSelect }: { dateRef: React.MutableRefObject<Date>; focusedName: string | null; onSelect: (name: string) => void }) {
  const [, forceTick] = useState(0);
  useFrame(() => {
    forceTick((t) => (t + 1) % 1000000);
  });

  return (
    <>
      {PLANETS.map((planet) => {
        const pos = heliocentricPosition(planet, dateRef.current);
        const scenePos = toScene(pos.x, pos.y, pos.z);
        return (
          <PlanetMesh
            key={planet.name}
            planet={planet}
            position={scenePos}
            isFocused={focusedName === planet.name}
            onSelect={() => onSelect(planet.name)}
          />
        );
      })}
    </>
  );
}

export interface SolarSystemSceneProps {
  dateRef: React.MutableRefObject<Date>;
  speedRef: React.MutableRefObject<number>;
  onDateTick: (d: Date) => void;
  focusedName: string | null;
  onSelect: (name: string) => void;
}

export default function SolarSystemScene({ dateRef, speedRef, onDateTick, focusedName, onSelect }: SolarSystemSceneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { width, height } = useContainerSize(containerRef);
  const focusedPlanet = useMemo(() => PLANETS.find((p) => p.name === focusedName) ?? null, [focusedName]);
  const orbitDate = useMemo(() => new Date(), []); // orbit ring shape is drawn once at mount -- drift is imperceptible over a session

  return (
    <div ref={containerRef} style={{ width: "100%", height: "100%" }}>
      {width > 0 && height > 0 && (
        <Canvas
          camera={{ position: [0, 3.4, 5.2], fov: 45 }}
          style={{ width, height, background: "radial-gradient(ellipse at center, #05070f 0%, #010104 80%)" }}
          onPointerMissed={() => onSelect("")}
        >
          <ambientLight intensity={0.18} color="#8fa8ff" />
          <Stars radius={120} depth={60} count={4000} factor={2.4} fade speed={0.2} />
          <Sun />
          {PLANETS.map((planet) => (
            <OrbitRing key={planet.name} planet={planet} date={orbitDate} />
          ))}
          <Planets dateRef={dateRef} focusedName={focusedName} onSelect={onSelect} />
          <CameraRig focusedPlanet={focusedPlanet} date={dateRef} />
          <TimeDriver dateRef={dateRef} speedRef={speedRef} onTick={onDateTick} />
        </Canvas>
      )}
    </div>
  );
}
