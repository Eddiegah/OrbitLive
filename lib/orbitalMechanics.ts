/**
 * Real orbital mechanics -- not a stylized animation loop.
 *
 * Elements and the conversion procedure are taken verbatim from NASA JPL's
 * published "Keplerian Elements for Approximate Positions of the Major
 * Planets" (https://ssd.jpl.nasa.gov/planets/approx_pos.html), Table 1,
 * valid 1800 AD - 2050 AD. This is the standard low-precision ephemeris
 * algorithm used across countless astronomy tools -- accurate to a small
 * fraction of a degree for the era we care about, not spacecraft-navigation
 * precision, but genuinely computed from real physics for the actual
 * current date, not looped or faked.
 *
 * The six elements evolve linearly with time (a, e, I, L, long. of
 * perihelion ϖ, long. of ascending node Ω), so recomputing a planet's
 * position for "right now" -- or for any past/future date via the
 * time-warp controls -- is the same formula, just a different T.
 */

export interface OrbitalElements {
  name: string;
  a0: number; adot: number; // semi-major axis, AU, per century
  e0: number; edot: number; // eccentricity, per century
  I0: number; Idot: number; // inclination, degrees, per century
  L0: number; Ldot: number; // mean longitude, degrees, per century
  peri0: number; peridot: number; // longitude of perihelion (ϖ), degrees, per century
  node0: number; nodedot: number; // longitude of ascending node (Ω), degrees, per century
  color: string;
  radiusEarths: number; // real relative radius, Earth = 1 (for compressed visual sizing only)
}

export const PLANETS: OrbitalElements[] = [
  { name: "Mercury", a0: 0.38709927, adot: 0.00000037, e0: 0.20563593, edot: 0.00001906, I0: 7.00497902, Idot: -0.00594749, L0: 252.2503235, Ldot: 149472.67411175, peri0: 77.45779628, peridot: 0.16047689, node0: 48.33076593, nodedot: -0.12534081, color: "#b1adad", radiusEarths: 0.383 },
  { name: "Venus", a0: 0.72333566, adot: 0.0000039, e0: 0.00677672, edot: -0.00004107, I0: 3.39467605, Idot: -0.0007889, L0: 181.9790995, Ldot: 58517.81538729, peri0: 131.60246718, peridot: 0.00268329, node0: 76.67984255, nodedot: -0.27769418, color: "#e8cda2", radiusEarths: 0.949 },
  { name: "Earth", a0: 1.00000261, adot: 0.00000562, e0: 0.01671123, edot: -0.00004392, I0: -0.00001531, Idot: -0.01294668, L0: 100.46457166, Ldot: 35999.37244981, peri0: 102.93768193, peridot: 0.32327364, node0: 0.0, nodedot: 0.0, color: "#3a8ee0", radiusEarths: 1.0 },
  { name: "Mars", a0: 1.52371034, adot: 0.00001847, e0: 0.0933941, edot: 0.00007882, I0: 1.84969142, Idot: -0.00813131, L0: -4.55343205, Ldot: 19140.30268499, peri0: -23.94362959, peridot: 0.44441088, node0: 49.55953891, nodedot: -0.29257343, color: "#c1440e", radiusEarths: 0.532 },
  { name: "Jupiter", a0: 5.202887, adot: -0.00011607, e0: 0.04838624, edot: -0.00013253, I0: 1.30439695, Idot: -0.00183714, L0: 34.39644051, Ldot: 3034.74612775, peri0: 14.72847983, peridot: 0.21252668, node0: 100.47390909, nodedot: 0.20469106, color: "#d8ae82", radiusEarths: 11.21 },
  { name: "Saturn", a0: 9.53667594, adot: -0.0012506, e0: 0.05386179, edot: -0.00050991, I0: 2.48599187, Idot: 0.00193609, L0: 49.95424423, Ldot: 1222.49362201, peri0: 92.59887831, peridot: -0.41897216, node0: 113.66242448, nodedot: -0.28867794, color: "#e3d7b1", radiusEarths: 9.45 },
  { name: "Uranus", a0: 19.18916464, adot: -0.00196176, e0: 0.04725744, edot: -0.00004397, I0: 0.77263783, Idot: -0.00242939, L0: 313.23810451, Ldot: 428.48202785, peri0: 170.9542763, peridot: 0.40805281, node0: 74.01692503, nodedot: 0.04240589, color: "#9fe3e8", radiusEarths: 4.01 },
  { name: "Neptune", a0: 30.06992276, adot: 0.00026291, e0: 0.00859048, edot: 0.00005105, I0: 1.77004347, Idot: 0.00035372, L0: -55.12002969, Ldot: 218.45945325, peri0: 44.96476227, peridot: -0.32241464, node0: 131.78422574, nodedot: -0.00508664, color: "#4f6bd4", radiusEarths: 3.88 },
];

const DEG2RAD = Math.PI / 180;

function julianDay(date: Date): number {
  return date.getTime() / 86400000 + 2440587.5;
}

function centuriesSinceJ2000(date: Date): number {
  return (julianDay(date) - 2451545.0) / 36525;
}

function normalizeDegrees(deg: number): number {
  let d = deg % 360;
  if (d > 180) d -= 360;
  if (d < -180) d += 360;
  return d;
}

export interface HeliocentricPosition {
  x: number; // AU, ecliptic
  y: number;
  z: number;
  distanceAU: number;
}

/** Solves Kepler's equation M = E - e*sin(E) for E via Newton's method,
 * exactly as JPL's procedure specifies (iterate to within 1e-6 degrees). */
function solveEccentricAnomaly(meanAnomalyDeg: number, e: number): number {
  const eStar = (180 / Math.PI) * e;
  let E = meanAnomalyDeg + eStar * Math.sin(meanAnomalyDeg * DEG2RAD);
  for (let i = 0; i < 100; i++) {
    const dM = meanAnomalyDeg - (E - eStar * Math.sin(E * DEG2RAD));
    const dE = dM / (1 - e * Math.cos(E * DEG2RAD));
    E += dE;
    if (Math.abs(dE) < 1e-6) break;
  }
  return E;
}

/** Real heliocentric ecliptic position (AU) for a planet at an arbitrary date. */
export function heliocentricPosition(planet: OrbitalElements, date: Date): HeliocentricPosition {
  const T = centuriesSinceJ2000(date);
  const a = planet.a0 + planet.adot * T;
  const e = planet.e0 + planet.edot * T;
  const I = planet.I0 + planet.Idot * T;
  const L = planet.L0 + planet.Ldot * T;
  const peri = planet.peri0 + planet.peridot * T; // ϖ
  const node = planet.node0 + planet.nodedot * T; // Ω
  const omega = peri - node; // argument of perihelion, ω

  const M = normalizeDegrees(L - peri);
  const E = solveEccentricAnomaly(M, e);
  const Erad = E * DEG2RAD;

  const xOrb = a * (Math.cos(Erad) - e);
  const yOrb = a * Math.sqrt(1 - e * e) * Math.sin(Erad);

  const omegaRad = omega * DEG2RAD;
  const IRad = I * DEG2RAD;
  const nodeRad = node * DEG2RAD;

  const cosO = Math.cos(omegaRad);
  const sinO = Math.sin(omegaRad);
  const cosN = Math.cos(nodeRad);
  const sinN = Math.sin(nodeRad);
  const cosI = Math.cos(IRad);
  const sinI = Math.sin(IRad);

  const x = (cosO * cosN - sinO * sinN * cosI) * xOrb + (-sinO * cosN - cosO * sinN * cosI) * yOrb;
  const y = (cosO * sinN + sinO * cosN * cosI) * xOrb + (-sinO * sinN + cosO * cosN * cosI) * yOrb;
  const z = sinO * sinI * xOrb + cosO * sinI * yOrb;

  return { x, y, z, distanceAU: Math.sqrt(x * x + y * y + z * z) };
}

/** Samples a full closed orbit ellipse (in AU, ecliptic) for drawing the
 * orbit ring -- same math, stepping mean anomaly through a full revolution
 * at a fixed date rather than stepping time. */
export function orbitEllipsePoints(planet: OrbitalElements, date: Date, steps = 128): [number, number, number][] {
  const T = centuriesSinceJ2000(date);
  const a = planet.a0 + planet.adot * T;
  const e = planet.e0 + planet.edot * T;
  const I = planet.I0 + planet.Idot * T;
  const peri = planet.peri0 + planet.peridot * T;
  const node = planet.node0 + planet.nodedot * T;
  const omega = peri - node;

  const omegaRad = omega * DEG2RAD;
  const IRad = I * DEG2RAD;
  const nodeRad = node * DEG2RAD;
  const cosO = Math.cos(omegaRad);
  const sinO = Math.sin(omegaRad);
  const cosN = Math.cos(nodeRad);
  const sinN = Math.sin(nodeRad);
  const cosI = Math.cos(IRad);
  const sinI = Math.sin(IRad);

  const points: [number, number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const E = (i / steps) * 360;
    const Erad = E * DEG2RAD;
    const xOrb = a * (Math.cos(Erad) - e);
    const yOrb = a * Math.sqrt(1 - e * e) * Math.sin(Erad);
    const x = (cosO * cosN - sinO * sinN * cosI) * xOrb + (-sinO * cosN - cosO * sinN * cosI) * yOrb;
    const y = (cosO * sinN + sinO * cosN * cosI) * xOrb + (-sinO * sinN + cosO * cosN * cosI) * yOrb;
    const z = sinO * sinI * xOrb + cosO * sinI * yOrb;
    points.push([x, y, z]);
  }
  return points;
}

/** Compresses real AU distance into a navigable scene distance (sqrt curve)
 * so all 8 planets are visible and reachable in one view instead of Neptune
 * being 77x further away than Mercury. Real AU is always shown alongside
 * this in the UI -- the compression is purely a rendering choice. */
export function sceneDistance(distanceAU: number): number {
  return 1.9 * Math.sqrt(distanceAU);
}

/** Compresses real relative planet radius (Earth=1) for visible-but-honest
 * sizing -- Jupiter is genuinely ~29x Mercury's radius, which would make
 * Mercury an invisible speck at any scale that keeps Jupiter on screen. */
export function sceneRadius(radiusEarths: number): number {
  return 0.055 * Math.cbrt(radiusEarths);
}
