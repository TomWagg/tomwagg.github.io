/*
 * natal_kick_visualizer.js
 * ---------------------------------------------------------------------------
 * three.js scene + UI wiring for the natal-kick binary visualizer.
 * The physics lives in natal_kick_physics.js (loaded as window.NatalKickPhysics).
 *
 * Two scenes share ONE camera + OrbitControls:
 *   sceneBefore : the pre-supernova binary (fixed snapshot at the mean anomaly)
 *   sceneAfter  : the post-supernova outcome (new orbit or escape trajectories)
 * View modes:
 *   "before" / "after" render one scene across the whole canvas;
 *   "split"  renders both side-by-side (or stacked on narrow screens) using
 *            scissor viewports. Because a single camera drives both panels,
 *            rotating / zooming one is automatically mirrored in the other.
 * ---------------------------------------------------------------------------
 */
import * as THREE from "three"
import { OrbitControls } from "three/addons/controls/OrbitControls.js"

const Phys = window.NatalKickPhysics
const V = Phys.vec

// ---- Visual constants -----------------------------------------------------
const COLORS = {
  companion: 0xffd25a, // gold
  star: 0xffb066, // pre-SN collapsing star (orange-white)
  ns: 0x9fd0ff, // neutron star
  bh: 0x1a1a1a, // black hole
  preOrbit: 0x8899aa, // pre-SN orbit lines
  postOrbit: 0xe0662e, // post-SN orbit (primary)
  blaauw: 0x4c8fc0, // blaauw-only overlay
  kick: 0xe0662e, // natal kick arrow
  systemic: 0x3fd07f, // systemic velocity arrow (green)
  vsn: 0x9fd0ff, // remnant velocity
  vcomp: 0xffd25a, // companion velocity
  plane: 0x2a3550 // orbital plane disc
}
const MXNS = 2.5 // NS/BH boundary (Msun) for labels + momentum scaling
const REL_A = 2.0 // scene units for the largest orbit apoapsis (framing target)
const STAR_R = 0.26 // star sphere radius (scene units)
const TWO_PI = Math.PI * 2
const SPLIT_VERTICAL_BELOW = 560 // px wrapper width below which split stacks

// ===========================================================================
//  Renderer + shared camera + controls
// ===========================================================================
const canvas = document.getElementById("viz-canvas")
const camera = new THREE.PerspectiveCamera(45, 1.4, 0.01, 5000)
const CAM_HOME = new THREE.Vector3(5.2, 3.8, 8.4)
const CAM_DIR = CAM_HOME.clone().normalize()
camera.position.copy(CAM_HOME)

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.setScissorTest(true)
canvas.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.dampingFactor = 0.08
controls.autoRotateSpeed = 1.2
controls.enablePan = true
controls.screenSpacePanning = true
let userAdjusted = false
controls.addEventListener("start", () => {
  userAdjusted = true
})

// ===========================================================================
//  Two scenes (before / after) with their own environment
// ===========================================================================
const sceneBefore = new THREE.Scene()
const sceneAfter = new THREE.Scene()

function makeStarfield() {
  const g = new THREE.BufferGeometry()
  const n = 25000
  const pos = new Float32Array(n * 3)
  for (let i = 0; i < n; i++) {
    const u = Math.sin(i * 12.9898) * 43758.5453
    const v = Math.sin(i * 78.233) * 12543.331
    const w = Math.sin(i * 39.425) * 7654.221
    const r = 120 + ((i * 7) % 200)
    const theta = (u - Math.floor(u)) * TWO_PI
    const phi = Math.acos(2 * (v - Math.floor(v)) - 1)
    pos[i * 3] = r * Math.sin(phi) * Math.cos(theta)
    pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
    pos[i * 3 + 2] = r * Math.cos(phi) + (w - Math.floor(w)) * 10
  }
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3))
  const m = new THREE.PointsMaterial({
    color: 0xaab4d0,
    size: 0.7,
    sizeAttenuation: false
  })
  return new THREE.Points(g, m)
}
function makePlane() {
  const geo = new THREE.CircleGeometry(REL_A * 1.35, 64)
  const mat = new THREE.MeshBasicMaterial({
    color: COLORS.plane,
    transparent: true,
    opacity: 0.15,
    side: THREE.DoubleSide,
    depthWrite: false // don't occlude orbits overlaid on top (combined mode)
  })
  return new THREE.Mesh(geo, mat)
}
// A small 3-axis cross marking the centre of mass (the origin). depthTest is
// off so it stays visible from any angle.
function makeCoMCross() {
  const s = 0.14
  const geo = new THREE.BufferGeometry()
  geo.setAttribute(
    "position",
    new THREE.BufferAttribute(
      new Float32Array([
        -s,
        0,
        0,
        s,
        0,
        0,
        0,
        -s,
        0,
        0,
        s,
        0,
        0,
        0,
        -s,
        0,
        0,
        s
      ]),
      3
    )
  )
  const mat = new THREE.LineBasicMaterial({
    color: 0xe6ecf7,
    transparent: true,
    opacity: 0.85,
    depthTest: false
  })
  const cross = new THREE.LineSegments(geo, mat)
  cross.renderOrder = 10
  return cross
}
function addEnvironment(scn) {
  const p2 = new THREE.PointLight(0xbecbff, 15, 0, 1.5)
  p2.position.set(8, 10, 8)
  scn.add(p2)
  scn.add(makeStarfield())
  scn.add(makePlane())
  scn.add(makeCoMCross())
}
addEnvironment(sceneBefore)
addEnvironment(sceneAfter)

// ---- star meshes ----------------------------------------------------------
function makeStar(color, radius, emissiveI) {
  const geo = new THREE.SphereGeometry(radius, 32, 32)
  const mat = new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: emissiveI,
    roughness: 0.4
  })
  return new THREE.Mesh(geo, mat)
}
// Sphere radius scales with mass like a constant-density body (r ∝ m^{1/3}),
// normalised so a 10 M⊙ star has the base radius, and clamped to stay visible.
function radiusForMass(mass) {
  return THREE.MathUtils.clamp(
    STAR_R * Math.cbrt(Math.max(mass, 0.1) / 10),
    0.14,
    0.55
  )
}
// Compact remnants are drawn much smaller, but a heavier remnant is still a
// slightly bigger marker so NS vs BH mass is legible.
function remnantRadius(m1n) {
  return THREE.MathUtils.clamp(
    0.13 * Math.cbrt(Math.max(m1n, 0.1) / 1.4),
    0.1,
    0.22
  )
}
const collapsingStar = makeStar(COLORS.star, STAR_R, 0.5)
const companionBefore = makeStar(COLORS.companion, STAR_R, 0.55)
sceneBefore.add(collapsingStar, companionBefore)

const remnant = makeStar(COLORS.ns, STAR_R, 0.8)
const companionAfter = makeStar(COLORS.companion, STAR_R, 0.55)
sceneAfter.add(remnant, companionAfter)

// ---- orbit / arrow groups -------------------------------------------------
const preGroup = new THREE.Group()
sceneBefore.add(preGroup)
const postGroup = new THREE.Group()
const blaauwGroup = new THREE.Group()
sceneAfter.add(postGroup, blaauwGroup)

let arrowsBefore = []
let arrowsAfter = []
function clearArrows() {
  arrowsBefore.forEach(a => sceneBefore.remove(a))
  arrowsAfter.forEach(a => sceneAfter.remove(a))
  arrowsBefore = []
  arrowsAfter = []
}
function addArrow(scn, list, dir, origin, length, color, headScale) {
  if (length < 1e-6) return
  const d = dir.clone().normalize()
  const a = new THREE.ArrowHelper(
    d,
    origin,
    length,
    color,
    Math.min(0.35, length * 0.35) * (headScale || 1),
    Math.min(0.2, length * 0.2) * (headScale || 1)
  )
  a.userData.tip = origin.clone().add(d.multiplyScalar(length))
  scn.add(a)
  list.push(a)
}
function clearGroup(g) {
  for (let i = g.children.length - 1; i >= 0; i--) {
    const c = g.children[i]
    if (c.geometry) c.geometry.dispose()
    if (c.material) c.material.dispose()
    g.remove(c)
  }
}
function toScene(vec, s) {
  return new THREE.Vector3(vec[0] * s, vec[1] * s, vec[2] * s)
}
function orbitLine(
  aRsun,
  ecc,
  nHat,
  pHat,
  massFrac,
  sceneScale,
  color,
  dashed
) {
  const qHat = V.hat(V.cross(nHat, pHat))
  const pts = []
  const N = 200
  for (let i = 0; i <= N; i++) {
    const f = (i / N) * TWO_PI
    const r = (aRsun * (1 - ecc * ecc)) / (1 + ecc * Math.cos(f))
    const rel = V.add(
      V.scale(pHat, r * Math.cos(f)),
      V.scale(qHat, r * Math.sin(f))
    )
    pts.push(toScene(V.scale(rel, massFrac), sceneScale))
  }
  const geo = new THREE.BufferGeometry().setFromPoints(pts)
  const mat = dashed
    ? new THREE.LineDashedMaterial({
        color,
        dashSize: 0.18,
        gapSize: 0.12,
        transparent: true,
        opacity: 0.9
      })
    : new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.95 })
  const line = new THREE.Line(geo, mat)
  if (dashed) line.computeLineDistances()
  return line
}
function addTrajectory(start, vel, flyScale, color) {
  const end = start.clone().add(vel.clone().multiplyScalar(flyScale))
  const geo = new THREE.BufferGeometry().setFromPoints([start.clone(), end])
  const mat = new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity: 0.5
  })
  postGroup.add(new THREE.Line(geo, mat))
}

// ===========================================================================
//  State
// ===========================================================================
let liveMode = true
let applied = false
let spinning = false
let viewMode = "split" // 'combined' | 'before' | 'after' | 'split'
let splitVertical = false
let current = null
let sceneScale = 1
let velScale = 1
let preRemnantPos = new THREE.Vector3()
let preCompanionPos = new THREE.Vector3()

// ===========================================================================
//  Input handling
// ===========================================================================
function num(id) {
  return Number(document.getElementById(id + "-num").value)
}
function setPair(id, value, decimals) {
  const v = decimals != null ? Number(value.toFixed(decimals)) : value
  const r = document.getElementById(id)
  const n = document.getElementById(id + "-num")
  if (r) r.value = v
  if (n) n.value = v
}
function linkPair(id) {
  const r = document.getElementById(id)
  const n = document.getElementById(id + "-num")
  if (!r || !n) return
  r.addEventListener("input", () => {
    n.value = r.value
    onInputChange()
  })
  n.addEventListener("input", () => {
    const clamped = Math.max(
      Number(r.min),
      Math.min(Number(r.max), Number(n.value) || 0)
    )
    r.value = clamped
    onInputChange()
  })
}
function readParams() {
  return {
    m1: num("m1"),
    m1n: num("m1n"),
    m2: num("m2"),
    sep: num("sep"),
    ecc: num("ecc"),
    meanAnomDeg: num("meanAnom"),
    vk: num("vk"),
    phiDeg: num("phi"),
    thetaDeg: num("theta"),
    r2: 0
  }
}

// ===========================================================================
//  Main update
// ===========================================================================
function updateDerivedLabels(p) {
  document.getElementById("mass-lost").textContent = Math.max(
    p.m1 - p.m1n,
    0
  ).toFixed(1)
  document.getElementById("remnant-type").textContent =
    p.m1n > MXNS ? "BH" : "NS"
  document.getElementById("period-display").textContent = fmtPeriod(
    Phys.orbitalPeriodDays(p.sep, p.m1 + p.m2)
  )
}

function computeScene() {
  const p = readParams()
  // a remnant can never be more massive than the star that collapsed to form it
  if (p.m1n > p.m1) {
    p.m1n = p.m1
    setPair("m1n", p.m1, 1)
  }
  updateDerivedLabels(p)

  const res = Phys.kickPfahl(p)
  current = res

  // Scale so the larger of the pre-/post-SN orbits fits the framing target
  const mtotPre = p.m1 + p.m2
  let maxExtent = p.sep * (1 + p.ecc) * (Math.max(p.m1, p.m2) / mtotPre)
  if (!res.disrupt && isFinite(res.sepNew) && res.eccNew < 1) {
    const mtotNew = p.m1n + p.m2
    const postExt =
      res.sepNew * (1 + res.eccNew) * (Math.max(p.m1n, p.m2) / mtotNew)
    if (isFinite(postExt)) maxExtent = Math.max(maxExtent, postExt)
  }
  if (!(maxExtent > 0)) maxExtent = p.sep
  sceneScale = REL_A / maxExtent

  // pre-SN star positions from the exact separation vector at this phase
  if (res.sepVec) {
    preRemnantPos = toScene(
      V.scale(res.sepVec, p.m2 / mtotPre / Phys.RSUN_KM),
      sceneScale
    )
    preCompanionPos = toScene(
      V.scale(res.sepVec, -p.m1 / mtotPre / Phys.RSUN_KM),
      sceneScale
    )
  }
  collapsingStar.position.copy(preRemnantPos)
  companionBefore.position.copy(preCompanionPos)
  remnant.position.copy(preRemnantPos)
  companionAfter.position.copy(preCompanionPos)

  // scale spheres by mass
  collapsingStar.scale.setScalar(radiusForMass(p.m1) / STAR_R)
  const compScale = radiusForMass(p.m2) / STAR_R
  companionBefore.scale.setScalar(compScale)
  companionAfter.scale.setScalar(compScale)

  clearArrows()
  drawPreSN(p, res)

  if (liveMode || applied) {
    drawPostSN(p, res)
    updateResults(p, res)
    applied = true
  } else {
    clearGroup(postGroup)
    clearGroup(blaauwGroup)
    markResultsStale()
  }

  setRemnantLook(applied && current ? current.inputs.m1n > MXNS : false)
  if (!userAdjusted) fitToContent(false)
}

function velScaleFor(res) {
  const vref = Math.max(
    res.vRelPrev ? V.mag(res.vRelPrev) : 0,
    res.vk || 0,
    res.vCmMag || 0,
    res.vSnMag || 0,
    res.vCompMag || 0,
    30
  )
  velScale = 2 / vref
  return velScale
}

function drawPreSN(p, res) {
  clearGroup(preGroup)
  const nHat = res.hPrev ? V.hat(res.hPrev) : [0, 0, 1]
  const pHat = p.ecc > 1e-6 && res.LRLprev ? V.hat(res.LRLprev) : [1, 0, 0]
  const mtotPrev = p.m1 + p.m2
  preGroup.add(
    orbitLine(
      p.sep,
      p.ecc,
      nHat,
      pHat,
      p.m2 / mtotPrev,
      sceneScale,
      COLORS.preOrbit,
      false
    )
  )
  preGroup.add(
    orbitLine(
      p.sep,
      p.ecc,
      nHat,
      pHat,
      -p.m1 / mtotPrev,
      sceneScale,
      COLORS.preOrbit,
      false
    )
  )

  if (res.natalKick) {
    const kdir = new THREE.Vector3(
      res.natalKick[0],
      res.natalKick[1],
      res.natalKick[2]
    )
    addArrow(
      sceneBefore,
      arrowsBefore,
      kdir,
      preRemnantPos,
      kdir.length() * velScaleFor(res),
      COLORS.kick,
      1.0
    )
  }
}

function drawPostSN(p, res) {
  clearGroup(postGroup)
  clearGroup(blaauwGroup)
  velScaleFor(res)

  if (res.disrupt) {
    res.flyScale = 3.2 / Math.max(res.vSnMag, res.vCompMag, 1)
    if (res.vSn && res.vComp) {
      const vsn = new THREE.Vector3(res.vSn[0], res.vSn[1], res.vSn[2])
      const vcomp = new THREE.Vector3(res.vComp[0], res.vComp[1], res.vComp[2])
      addTrajectory(preRemnantPos, vsn, res.flyScale, COLORS.postOrbit)
      addTrajectory(preCompanionPos, vcomp, res.flyScale, COLORS.postOrbit)
      addArrow(
        sceneAfter,
        arrowsAfter,
        vsn,
        preRemnantPos,
        vsn.length() * velScale,
        COLORS.vsn,
        0.9
      )
      addArrow(
        sceneAfter,
        arrowsAfter,
        vcomp,
        preCompanionPos,
        vcomp.length() * velScale,
        COLORS.vcomp,
        0.9
      )
    }
  } else {
    const nHat = V.hat(res.h)
    const pHat = res.eccNew > 1e-6 ? V.hat(res.LRL) : [1, 0, 0]
    const mtot = p.m1n + p.m2
    postGroup.add(
      orbitLine(
        res.sepNew,
        res.eccNew,
        nHat,
        pHat,
        p.m2 / mtot,
        sceneScale,
        COLORS.postOrbit,
        false
      )
    )
    postGroup.add(
      orbitLine(
        res.sepNew,
        res.eccNew,
        nHat,
        pHat,
        -p.m1n / mtot,
        sceneScale,
        COLORS.postOrbit,
        false
      )
    )
    if (res.vCm) {
      const vcm = new THREE.Vector3(res.vCm[0], res.vCm[1], res.vCm[2])
      addArrow(
        sceneAfter,
        arrowsAfter,
        vcm,
        new THREE.Vector3(0, 0, 0),
        vcm.length() * velScale,
        COLORS.systemic,
        1.0
      )
    }
  }

  if (document.getElementById("show-blaauw").checked) {
    const br = Phys.kickPfahl(Object.assign({}, p, { vk: 0 }))
    if (!br.disrupt) {
      const nHat = V.hat(br.h)
      const pHat = br.eccNew > 1e-6 ? V.hat(br.LRL) : [1, 0, 0]
      const mtot = p.m1n + p.m2
      blaauwGroup.add(
        orbitLine(
          br.sepNew,
          br.eccNew,
          nHat,
          pHat,
          p.m2 / mtot,
          sceneScale,
          COLORS.blaauw,
          true
        )
      )
      blaauwGroup.add(
        orbitLine(
          br.sepNew,
          br.eccNew,
          nHat,
          pHat,
          -p.m1n / mtot,
          sceneScale,
          COLORS.blaauw,
          true
        )
      )
    }
  }
}

function setRemnantLook(isBH) {
  const m1n = current && current.inputs ? current.inputs.m1n : 1.4
  const rScale = remnantRadius(m1n) / STAR_R
  remnant.scale.setScalar(rScale)
  if (isBH) {
    remnant.material.color.setHex(COLORS.bh)
    remnant.material.emissive.setHex(0x000000)
  } else {
    remnant.material.color.setHex(COLORS.ns)
    remnant.material.emissive.setHex(COLORS.ns)
    remnant.material.emissiveIntensity = 0.8
  }
}

// ===========================================================================
//  Camera framing (fit whichever scenes the current mode shows)
// ===========================================================================
function limitingHalfAngle() {
  const vHalf = THREE.MathUtils.degToRad(camera.fov) / 2
  const hHalf = Math.atan(Math.tan(vHalf) * camera.aspect)
  return Math.min(vHalf, hHalf)
}
function panelAspect() {
  const w = canvas.clientWidth || 1
  const h = canvas.clientHeight || 1
  if (viewMode === "split") return splitVertical ? w / (h / 2) : w / 2 / h
  return w / h
}
function contentBox() {
  const b = new THREE.Box3()
  b.makeEmpty()
  const wantBefore = viewMode !== "after" // before, split, combined
  const wantAfter = viewMode !== "before" // after, split, combined
  if (wantBefore) {
    if (preGroup.children.length) b.expandByObject(preGroup)
    arrowsBefore.forEach(a => b.expandByPoint(a.userData.tip || a.position))
  }
  if (wantAfter) {
    if (postGroup.children.length) b.expandByObject(postGroup)
    if (blaauwGroup.children.length) b.expandByObject(blaauwGroup)
    arrowsAfter.forEach(a => b.expandByPoint(a.userData.tip || a.position))
  }
  b.expandByPoint(preRemnantPos)
  b.expandByPoint(preCompanionPos)
  return b
}
function fitToContent(resetDir) {
  camera.aspect = panelAspect()
  const box = contentBox()
  if (box.isEmpty()) return

  // Always frame around the centre of mass (the origin), so the view stays
  // centred on the CoM rather than drifting to the content's bounding-box centre.
  const center = new THREE.Vector3(0, 0, 0)
  const c = box
  const corners = [
    [c.min.x, c.min.y, c.min.z],
    [c.min.x, c.min.y, c.max.z],
    [c.min.x, c.max.y, c.min.z],
    [c.min.x, c.max.y, c.max.z],
    [c.max.x, c.min.y, c.min.z],
    [c.max.x, c.min.y, c.max.z],
    [c.max.x, c.max.y, c.min.z],
    [c.max.x, c.max.y, c.max.z]
  ]
  // radius = farthest content point from the origin
  let R = 0.4
  for (const p of corners) {
    R = Math.max(R, Math.hypot(p[0], p[1], p[2]))
  }

  const dir = resetDir
    ? CAM_DIR.clone()
    : camera.position.clone().sub(controls.target).normalize()
  if (!isFinite(dir.x) || dir.lengthSq() === 0) dir.copy(CAM_DIR)

  controls.target.copy(center)
  const place = dist => {
    camera.position.copy(center).add(dir.clone().multiplyScalar(dist))
    camera.near = Math.max(dist / 2000, 0.001)
    camera.far = dist * 2000
    camera.updateProjectionMatrix()
    camera.updateMatrixWorld()
  }
  let dist = (R / Math.sin(limitingHalfAngle())) * 1.1
  place(dist)
  // refine using the projected extent so content fills the frame (still centred on CoM)
  let maxAbs = 0
  for (const p of corners) {
    const v = new THREE.Vector3(p[0], p[1], p[2]).project(camera)
    maxAbs = Math.max(maxAbs, Math.abs(v.x), Math.abs(v.y))
  }
  if (maxAbs > 0.01) place(dist * (maxAbs / 0.5))
  controls.update()
}

// ===========================================================================
//  Results panel
// ===========================================================================
function fmtPeriod(days) {
  if (!isFinite(days)) return "&mdash;"
  if (days < 1) return (days * 24).toFixed(1) + " hr"
  if (days < 365) return days.toFixed(1) + " d"
  return (days / 365.25).toFixed(2) + " yr"
}
function fmtA(rsun) {
  if (!isFinite(rsun)) return "&mdash;"
  if (rsun > 215) return (rsun / 215.032).toFixed(2) + " AU"
  return rsun.toFixed(1) + " R☉"
}
function markResultsStale() {
  const badge = document.getElementById("status-badge")
  badge.className = "badge fs-6"
  badge.textContent = "press Apply"
  ;[
    "res-a",
    "res-e",
    "res-period",
    "res-systemic",
    "res-blaauw",
    "res-kick"
  ].forEach(id => (document.getElementById(id).innerHTML = "&mdash;"))
  document.getElementById("bound-block").style.display = ""
  document.getElementById("disrupt-block").style.display = "none"
}
function updateResults(p, res) {
  const badge = document.getElementById("status-badge")
  if (res.disrupt) {
    badge.className = "badge fs-6 disrupted"
    badge.textContent = "Disrupted"
    document.getElementById("res-a").innerHTML = "unbound"
    document.getElementById("res-e").textContent = isFinite(res.eccNew)
      ? res.eccNew.toFixed(2)
      : "—"
    document.getElementById("res-period").innerHTML = "&mdash;"
    document.getElementById("bound-block").style.display = "none"
    document.getElementById("disrupt-block").style.display = ""
    document.getElementById("res-vsn").innerHTML =
      res.vSnMag.toFixed(1) + " <small>km/s</small>"
    document.getElementById("res-vcomp").innerHTML =
      res.vCompMag.toFixed(1) + " <small>km/s</small>"
    document.getElementById("res-vinf").textContent =
      res.vInf.toFixed(1) + " km/s"
    document.getElementById("res-collide").style.display = res.collide
      ? ""
      : "none"
  } else {
    badge.className = "badge fs-6 bound"
    badge.textContent = "Bound"
    document.getElementById("res-a").innerHTML = fmtA(res.sepNew)
    document.getElementById("res-e").textContent = res.eccNew.toFixed(3)
    document.getElementById("res-period").innerHTML = fmtPeriod(res.periodNew)
    document.getElementById("bound-block").style.display = ""
    document.getElementById("disrupt-block").style.display = "none"
    document.getElementById("res-systemic").innerHTML =
      res.vCmMag.toFixed(1) + " <small>km/s</small>"
    document.getElementById("res-blaauw").innerHTML =
      res.blaauwMag.toFixed(1) + " km/s"
    document.getElementById("res-kick").innerHTML =
      res.kickMag.toFixed(1) + " km/s"
    const tot = res.blaauwMag + res.kickMag || 1
    document.getElementById("bar-blaauw").style.width =
      (100 * res.blaauwMag) / tot + "%"
    document.getElementById("bar-kick").style.width =
      (100 * res.kickMag) / tot + "%"
  }
}

// ===========================================================================
//  Model selector + random draw
// ===========================================================================
function refreshModelUI() {
  const model = document.getElementById("kick-model").value
  const info = Phys.MODELS[model] || {}
  document.getElementById("model-note").textContent = info.note
    ? info.note + " — "
    : ""
  document.getElementById("model-paper").href = info.url || "#"

  const isBH = num("m1n") > MXNS
  const vis = {
    "param-sigma": [
      "hobbs2005",
      "giacobbo_mapelli_1",
      "giacobbo_mapelli_2"
    ].includes(model),
    "param-m1c": model === "mandel_muller",
    "param-polar": true,
    "param-bh": isBH && ["hobbs2005", "disberg2025"].includes(model)
  }
  Object.keys(vis).forEach(id =>
    document.getElementById(id).classList.toggle("show", vis[id])
  )
  const fbMode = document.getElementById("bh-reduction").value
  document.getElementById("param-fallback").style.display =
    fbMode === "fallback" ? "" : "none"
}

function drawRandomKick() {
  const model = document.getElementById("kick-model").value
  const k = Phys.drawKick(model, {
    m1: num("m1"),
    m1n: num("m1n"),
    m1c: num("m1c"),
    isBH: num("m1n") > MXNS,
    sigma: num("sigma"),
    fallback: num("fallback"),
    bhReduction: document.getElementById("bh-reduction").value,
    mxns: MXNS,
    polarKickAngle: num("polar-angle")
  })
  setPair("vk", Math.min(k.vk, 5000), 0)
  setPair("phi", k.phiDeg, 0)
  setPair("theta", (k.thetaDeg + 360) % 360, 0)
  applied = true
  computeScene()
}

// ===========================================================================
//  View mode + split layout
// ===========================================================================
// In combined mode the before-scene's own star meshes are hidden so the single
// remnant + companion (from the after scene) aren't drawn twice on top of the
// collapsing star; the pre-SN orbit and kick arrow still show.
function applyModeVisibility() {
  const hideBeforeStars = viewMode === "combined"
  collapsingStar.visible = !hideBeforeStars
  companionBefore.visible = !hideBeforeStars
}

function setViewMode(mode) {
  viewMode = mode
  document
    .querySelectorAll(".view-mode-group [data-mode]")
    .forEach(b => b.classList.toggle("active", b.dataset.mode === mode))
  applyModeVisibility()
  updateSplitLayout()
  fitToContent(false) // reframe to the newly visible content, keep orientation
}

function updateSplitLayout() {
  const w = canvas.clientWidth
  const h = canvas.clientHeight
  splitVertical = w < SPLIT_VERTICAL_BELOW
  const lb = document.getElementById("label-before")
  const la = document.getElementById("label-after")
  const dv = document.getElementById("viz-divider")

  if (viewMode === "split") {
    lb.style.display = la.style.display = "block"
    dv.style.display = "block"
    if (splitVertical) {
      lb.style.left = la.style.left = "12px"
      lb.style.top = "10px"
      la.style.top = h / 2 + 10 + "px"
      dv.style.left = "0"
      dv.style.top = "50%"
      dv.style.width = "100%"
      dv.style.height = "1px"
    } else {
      lb.style.top = la.style.top = "10px"
      lb.style.left = "12px"
      la.style.left = w / 2 + 12 + "px"
      dv.style.top = "0"
      dv.style.left = "50%"
      dv.style.width = "1px"
      dv.style.height = "100%"
    }
  } else {
    // combined / before / after: single panel
    dv.style.display = "none"
    lb.style.top = la.style.top = "10px"
    lb.style.left = la.style.left = "12px"
    lb.style.display = viewMode === "before" ? "block" : "none"
    la.style.display = viewMode === "after" ? "block" : "none"
  }
}

// ===========================================================================
//  Event wiring
// ===========================================================================
function onInputChange() {
  if (!liveMode) applied = false
  refreshModelUI()
  computeScene()
}

;[
  "m1",
  "m1n",
  "m2",
  "sep",
  "ecc",
  "meanAnom",
  "vk",
  "phi",
  "theta",
  "sigma",
  "m1c",
  "polar-angle",
  "fallback"
].forEach(linkPair)

document.getElementById("kick-model").addEventListener("change", refreshModelUI)
document
  .getElementById("bh-reduction")
  .addEventListener("change", refreshModelUI)
document.getElementById("draw-kick").addEventListener("click", drawRandomKick)
document.getElementById("show-blaauw").addEventListener("change", computeScene)
document.getElementById("reset-view").addEventListener("click", () => {
  userAdjusted = false
  fitToContent(true)
})
document.getElementById("toggle-spin").addEventListener("click", e => {
  spinning = !spinning
  controls.autoRotate = spinning
  e.currentTarget.classList.toggle("active", spinning)
})
document.querySelectorAll(".view-mode-group [data-mode]").forEach(btn => {
  btn.addEventListener("click", () => setViewMode(btn.dataset.mode))
})

// ===========================================================================
//  Legend
// ===========================================================================
;(function buildLegend() {
  const items = [
    ["swatch", COLORS.companion, "Companion"],
    ["swatch", COLORS.star, "Collapsing star / remnant"],
    ["cross", 0xe6ecf7, "Centre of mass"],
    ["line", COLORS.preOrbit, "Pre-SN orbit"],
    ["line", COLORS.postOrbit, "Post-SN orbit / escape"],
    ["arrow", COLORS.kick, "Natal kick"],
    ["arrow", COLORS.systemic, "Systemic recoil"],
    ["line", COLORS.blaauw, "Blaauw-only orbit"]
  ]
  document.getElementById("viz-legend").innerHTML = items
    .map(([type, color, label]) => {
      const hex = "#" + color.toString(16).padStart(6, "0")
      const mark =
        type === "swatch"
          ? `<span class="legend-swatch" style="background:${hex}"></span>`
          : type === "cross"
            ? `<span class="legend-cross" style="color:${hex}">+</span>`
            : `<span class="legend-line" style="background:${hex}"></span>`
      return `<span class="legend-item">${mark}${label}</span>`
    })
    .join("")
})()

// ===========================================================================
//  Scale bar — shows the physical size of the view in solar radii
// ===========================================================================
const scaleBar = document.createElement("div")
scaleBar.id = "viz-scalebar"
scaleBar.innerHTML = '<div class="sb-text"></div><div class="sb-bar"></div>'
canvas.parentElement.appendChild(scaleBar)
const scaleBarBar = scaleBar.querySelector(".sb-bar")
const scaleBarText = scaleBar.querySelector(".sb-text")

function niceLength(x) {
  if (!(x > 0)) return 1
  const pow = Math.pow(10, Math.floor(Math.log10(x)))
  const m = x / pow
  const nice = m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10
  return nice * pow
}
function fmtScaleNum(n) {
  return n >= 1 ? String(Math.round(n)) : String(Number(n.toPrecision(1)))
}
let lastScaleTxt = ""
function updateScaleBar() {
  if (!isFinite(sceneScale) || sceneScale <= 0) return
  const h = canvas.clientHeight
  if (!h) return
  // vertical world extent visible at the CoM plane, per panel
  const panelH = viewMode === "split" && splitVertical ? h / 2 : h
  const d = camera.position.distanceTo(controls.target)
  const worldHeight = 2 * d * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2)
  const rsunPerPx = worldHeight / panelH / sceneScale
  if (!isFinite(rsunPerPx) || rsunPerPx <= 0) return
  const nice = niceLength(100 * rsunPerPx) // aim for a ~100px bar
  scaleBarBar.style.width = (nice / rsunPerPx).toFixed(1) + "px"
  const txt = fmtScaleNum(nice) + " R☉"
  if (txt !== lastScaleTxt) {
    scaleBarText.textContent = txt
    lastScaleTxt = txt
  }
}

// ===========================================================================
//  Render / animation loop
// ===========================================================================
function renderScene(scn, x, y, w, h) {
  renderer.setViewport(x, y, w, h)
  renderer.setScissor(x, y, w, h)
  camera.aspect = w / h
  camera.updateProjectionMatrix()
  renderer.render(scn, camera)
}
function renderFrame() {
  const w = renderer.domElement.clientWidth || canvas.clientWidth
  const h = renderer.domElement.clientHeight || canvas.clientHeight
  if (viewMode === "split") {
    if (splitVertical) {
      const hh = h / 2
      renderScene(sceneBefore, 0, hh, w, hh) // top
      renderScene(sceneAfter, 0, 0, w, hh) // bottom
    } else {
      const hw = w / 2
      renderScene(sceneBefore, 0, 0, hw, h) // left
      renderScene(sceneAfter, hw, 0, hw, h) // right
    }
  } else if (viewMode === "combined") {
    // overlay both scenes in one viewport, sharing the depth buffer so the two
    // orbits interleave correctly (autoClear off for the second pass)
    renderer.setViewport(0, 0, w, h)
    renderer.setScissor(0, 0, w, h)
    camera.aspect = w / h
    camera.updateProjectionMatrix()
    renderer.autoClear = true
    renderer.render(sceneBefore, camera)
    renderer.autoClear = false
    renderer.render(sceneAfter, camera)
    renderer.autoClear = true
  } else {
    renderScene(viewMode === "before" ? sceneBefore : sceneAfter, 0, 0, w, h)
  }
}
function loop() {
  controls.update()
  updateScaleBar()
  renderFrame()
  requestAnimationFrame(loop)
}

// ---- responsive sizing ----------------------------------------------------
function resize() {
  const w = canvas.clientWidth
  const h = canvas.clientHeight
  if (w === 0 || h === 0) return
  renderer.setSize(w, h)
  updateSplitLayout()
  camera.aspect = panelAspect()
  camera.updateProjectionMatrix()
  if (!userAdjusted) fitToContent(false)
}
new ResizeObserver(resize).observe(canvas)

// ===========================================================================
//  Go
// ===========================================================================
resize()
refreshModelUI()
applyModeVisibility()
updateSplitLayout()
applied = true
computeScene()
requestAnimationFrame(loop)
