"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { PLANETS, heliocentricPosition } from "../lib/orbitalMechanics";
import { TIME_SPEEDS } from "../lib/types";

const SolarSystemScene = dynamic(() => import("../components/SolarSystemScene"), { ssr: false });

function formatDate(d: Date): string {
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function Home() {
  // dateRef starts at a fixed, deterministic epoch rather than `new Date()`
  // -- this is a statically-exported page, so the initial render happens
  // once at build time and again at hydration; anything computed from a
  // live clock during render (not inside an effect) would produce two
  // different values and trigger a React hydration mismatch. The real
  // current time gets set client-side in the effect below, after mount.
  const dateRef = useRef(new Date(0));
  const speedRef = useRef(0);
  const [displayDate, setDisplayDate] = useState<Date | null>(null);
  const [speedIndex, setSpeedIndex] = useState(0);
  const [focusedName, setFocusedName] = useState<string | null>(null);

  useEffect(() => {
    const now = new Date();
    dateRef.current = now;
    setDisplayDate(now);
  }, []);

  const distances = useMemo(() => {
    const map = new Map<string, number>();
    if (!displayDate) return map;
    for (const p of PLANETS) map.set(p.name, heliocentricPosition(p, displayDate).distanceAU);
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayDate]);

  const selectSpeed = (index: number) => {
    speedRef.current = TIME_SPEEDS[index].secondsPerSecond;
    setSpeedIndex(index);
  };

  return (
    <main className="stage">
      <div className="scene-layer">
        <SolarSystemScene
          dateRef={dateRef}
          speedRef={speedRef}
          onDateTick={setDisplayDate}
          focusedName={focusedName}
          onSelect={(name) => setFocusedName(name || null)}
        />
      </div>

      <div className="overlay">
        <div className="header-row">
          <div className="title-block glass" style={{ padding: "14px 18px" }}>
            <h1>🪐 OrbitLive</h1>
            <p>The solar system, computed right now — every planet&apos;s position comes from real orbital mechanics, not an animation loop.</p>
          </div>
          <div className="date-card glass">
            <div className="date">{displayDate ? formatDate(displayDate) : "Loading…"}</div>
            <div className="label">simulated date{speedIndex === 0 ? " · live" : ""}</div>
          </div>
        </div>

        <div className="speed-row">
          {TIME_SPEEDS.map((s, i) => (
            <button key={s.label} className={`speed-chip ${speedIndex === i ? "active" : ""}`} onClick={() => selectSpeed(i)}>
              {s.label}
            </button>
          ))}
        </div>

        <div className="bottom-row">
          <div className="scale-note glass">
            Distances are compressed (√ scale) so all 8 planets fit in one navigable view — Neptune is genuinely ~77x farther from the
            Sun than Mercury. Real distances (AU) are shown per planet, straight from the same orbital calculation driving the scene.
          </div>

          <div>
            <div className="planet-list glass">
              <div className={`planet-row ${!focusedName ? "focused" : ""}`} onClick={() => setFocusedName(null)}>
                <span className="planet-dot" style={{ background: "#ffcf6b" }} />
                <span className="planet-name">Sun (reset view)</span>
              </div>
              {PLANETS.map((p) => (
                <div key={p.name} className={`planet-row ${focusedName === p.name ? "focused" : ""}`} onClick={() => setFocusedName(p.name)}>
                  <span className="planet-dot" style={{ background: p.color }} />
                  <span className="planet-name">{p.name}</span>
                  <span className="planet-au">{(distances.get(p.name) ?? 0).toFixed(2)} AU</span>
                </div>
              ))}
            </div>
            <div className="hint">click a planet to fly there · drag to orbit · scroll to zoom</div>
          </div>
        </div>
      </div>
    </main>
  );
}
