<div align="center">

# 🪐 OrbitLive

### Somewhere out there, Mars is at a very specific point in its orbit — right now, this second.

A flyable 3D solar system where every planet sits at its **actual real position**, computed live from real orbital mechanics — not a looping animation, not a stock illustration. Click a planet to fly to it. Warp time forward and watch the entire solar system actually move, physically correctly, in front of you.

### 🔴 [**Fly through it → eddiegah.github.io/OrbitLive**](https://eddiegah.github.io/OrbitLive/)

[![Live](https://img.shields.io/badge/demo-live-brightgreen?style=flat-square)](https://eddiegah.github.io/OrbitLive/)
[![Data](https://img.shields.io/badge/math-NASA%20JPL%20orbital%20elements-1f6feb?style=flat-square)](https://ssd.jpl.nasa.gov/planets/approx_pos.html)
[![Stack](https://img.shields.io/badge/stack-Next.js%20%2B%20Three.js-000000?style=flat-square&logo=next.js&logoColor=white)](#how-its-built)
[![Hosting](https://img.shields.io/badge/hosting-GitHub%20Pages-222?style=flat-square&logo=github)](https://pages.github.com/)
[![License: MIT](https://img.shields.io/badge/license-MIT-yellow?style=flat-square)](LICENSE)

</div>

---

Load the page and every planet is exactly where it actually is in space at this instant — verified against real astronomical data, not eyeballed. Click "1 year / sec" and watch Mercury lap the Sun in seconds while Neptune barely creeps, because that's genuinely how absurdly different their orbital periods are. This isn't a simulation *of* the solar system — it's a renderer *for* the solar system, driven by the same class of math that generates real ephemeris data.

## ⚡ What's actually happening

- **The positions are real.** Every planet's coordinates come from NASA JPL's published Keplerian orbital elements, run through the actual Kepler's-equation solver used in real ephemeris calculations — not a hand-animated orbit loop.
- **Time-warp is physically correct, not sped-up video.** At any speed, the scene isn't playing back a canned animation — it's recomputing genuine planetary positions for a different simulated date every single frame.
- **Distances are honestly compressed, and it says so.** Neptune is really ~77x farther from the Sun than Mercury; rendering that to true scale would make the outer planets invisible dots. The visual distance uses a √-compression, and the real distance in AU is shown for every planet at all times.
- **Zero backend, same as the rest of this series.** All computation happens in your browser — nothing to fetch, nothing that can go down.

## 🛠 How it's built

| Piece | What's doing the work |
|---|---|
| Orbital mechanics | [NASA JPL's approximate Keplerian elements](https://ssd.jpl.nasa.gov/planets/approx_pos.html) (Table 1, valid 1800–2050), solved via Newton's-method Kepler's equation |
| Rendering | Three.js via React Three Fiber |
| Camera | A rig that flies to and tracks whichever planet is selected — including following it around its orbit during time-warp |
| Framework | Next.js, built as a static export |
| Hosting | GitHub Pages, auto-deployed by GitHub Actions on every push to `main` |

## 🚀 Running it locally

```bash
npm install
npm run dev
```

Open `http://localhost:3030`.

## 📦 Deploying your own copy

Push to `main` — `.github/workflows/deploy.yml` builds the static export and publishes it to GitHub Pages automatically. Pages just needs to be switched on once in the repo settings with source **GitHub Actions**.

## 📄 License

MIT — see [LICENSE](LICENSE).

