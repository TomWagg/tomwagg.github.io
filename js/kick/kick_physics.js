/*
 * natal_kick_physics.js
 * ---------------------------------------------------------------------------
 * A faithful, dependency-free JavaScript port of the single-supernova (sn=1)
 * path of the `kick_pfahl` subroutine from COSMIC
 * (src/cosmic/src/kick.f, Pfahl et al. 2002 appendix).
 *
 * Everything is computed in the pre-SN orbital frame: the pre-SN orbit lies in
 * the x-y plane and its angular momentum points along +z. All internal math is
 * in km, km/s, s and solar masses; separations enter/leave in solar radii.
 *
 * Exposes two entry points:
 *   kickPfahl(params)          -> full post-SN state + geometry for plotting
 *   drawKick(model, params)    -> a random natal kick (magnitude + angles)
 *
 * Works both in the browser (window.NatalKickPhysics) and in Node (module.exports).
 * ---------------------------------------------------------------------------
 */
(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.NatalKickPhysics = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  // ---- Constants (matching kick.f) --------------------------------------
  const G_CONST = 1.3271244e11; // km^3 / (Msun s^2)
  const RSUN_KM = 6.96e5; // km per Rsun
  const YEARSC = 3.1557e7; // seconds per year
  const AU_KM = 1.495978707e8; // km per AU
  const DAY_S = 86400.0;
  const DEG = Math.PI / 180.0;
  const TWOPI = 2.0 * Math.PI;

  // ---- Vector helpers ---------------------------------------------------
  const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const scale = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const cross = (a, b) => [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
  const mag = (a) => Math.sqrt(dot(a, a));
  const hat = (a) => {
    const m = mag(a);
    return m > 0 ? scale(a, 1 / m) : [0, 0, 0];
  };

  // ---- Kepler solver (Newton-Raphson, as in kick.f 402-407) -------------
  function solveEccentricAnomaly(meanAnom, ecc) {
    if (meanAnom === 0) return 0;
    let E = meanAnom;
    for (let i = 0; i < 100; i++) {
      const dif = E - ecc * Math.sin(E) - meanAnom;
      if (Math.abs(dif / meanAnom) <= 1.0e-4) break;
      const der = 1.0 - ecc * Math.cos(E);
      E -= dif / der;
    }
    return E;
  }

  // ---- Orbital period (days) from a (Rsun) and total mass (Msun) --------
  function orbitalPeriodDays(aRsun, mtot) {
    if (aRsun <= 0 || mtot <= 0) return NaN;
    const aKm = aRsun * RSUN_KM;
    const P = TWOPI * Math.sqrt((aKm * aKm * aKm) / (G_CONST * mtot)); // seconds
    return P / DAY_S;
  }
  function separationFromPeriodRsun(periodDays, mtot) {
    if (periodDays <= 0 || mtot <= 0) return NaN;
    const P = periodDays * DAY_S;
    const aKm = Math.cbrt((G_CONST * mtot * P * P) / (TWOPI * TWOPI));
    return aKm / RSUN_KM;
  }

  /*
   * kickPfahl
   * ---------
   * params:
   *   m1        pre-SN mass of the exploding star (Msun)
   *   m1n       post-SN remnant mass (Msun)
   *   m2        companion mass (Msun)
   *   sep       pre-SN semi-major axis (Rsun)
   *   ecc       pre-SN eccentricity
   *   meanAnomDeg  orbital phase, mean anomaly (deg)
   *   vk        natal kick magnitude (km/s)
   *   phiDeg    kick polar angle, latitude from orbital plane (deg, [-90, 90])
   *   thetaDeg  kick azimuthal angle in orbital plane (deg, [0, 360])
   *   r2        companion radius (Rsun), optional (for collision check)
   *
   * Returns an object with the post-SN state and all intermediate vectors
   * needed to draw the system.
   */
  function kickPfahl(params) {
    const m1 = params.m1;
    const m1n = params.m1n;
    const m2 = params.m2;
    const sep = params.sep;
    const ecc = params.ecc;
    const meanAnom = (params.meanAnomDeg || 0) * DEG;
    const vk = params.vk || 0;
    const phi = (params.phiDeg || 0) * DEG;
    const theta = (params.thetaDeg || 0) * DEG;
    const r2 = params.r2 || 0;

    const cosPhi = Math.cos(phi);
    const sinPhi = Math.sin(phi);
    const cosTheta = Math.cos(theta);
    const sinTheta = Math.sin(theta);

    // Natal kick vector in the orbital frame (kick.f 354-357)
    const natalKick = [
      vk * cosPhi * cosTheta,
      vk * cosPhi * sinTheta,
      vk * sinPhi,
    ];

    const result = {
      inputs: { m1, m1n, m2, sep, ecc, vk, meanAnomDeg: params.meanAnomDeg },
      natalKick,
      massLost: m1 - m1n,
    };

    // Guard against non-physical input
    if (sep <= 0 || ecc < 0 || ecc >= 1 || m1n < 0 || m2 <= 0) {
      result.error = "invalid pre-SN parameters";
      result.disrupt = true;
      return result;
    }

    // Eccentric anomaly
    const E = solveEccentricAnomaly(meanAnom, ecc);
    const cosE = Math.cos(E);
    const sinE = Math.sin(E);
    const sqrt1me2 = Math.sqrt(1.0 - ecc * ecc);

    const mtotPrev = m1 + m2;
    const mtot = m1n + m2;
    const aPrev = sep * RSUN_KM;
    const omega = Math.sqrt((G_CONST * mtotPrev) / (aPrev * aPrev * aPrev));

    // Pre-SN separation vector (km) and its magnitude
    const sepVec = [aPrev * (cosE - ecc), aPrev * sqrt1me2 * sinE, 0.0];
    const sepPrev = mag(sepVec);

    // Pre-SN relative velocity (km/s)
    const prefac = (omega * aPrev * aPrev) / sepPrev;
    const vRelPrev = [-prefac * sinE, prefac * sqrt1me2 * cosE, 0.0];

    // Pre-SN specific angular momentum and eccentricity (LRL) vectors
    const hPrev = cross(sepVec, vRelPrev);
    const LRLprev = sub(
      scale(cross(vRelPrev, hPrev), 1.0 / (G_CONST * mtotPrev)),
      scale(sepVec, 1.0 / sepPrev)
    );

    // --- Systemic velocity, decomposed into Blaauw + natal-kick terms ----
    const blaauwTerm = scale(
      vRelPrev,
      (-m2 * (m1 - m1n)) / mtotPrev / mtot
    );
    const kickTerm = scale(natalKick, m1n / mtot);
    const vCm = add(blaauwTerm, kickTerm);

    // Post-SN relative velocity, new angular momentum & eccentricity vector
    const vRel = add(vRelPrev, natalKick);
    const h = cross(sepVec, vRel);
    const hMag = mag(h);
    const LRL = sub(
      scale(cross(vRel, h), 1.0 / (G_CONST * mtot)),
      scale(sepVec, 1.0 / sepPrev)
    );
    const eccNew = mag(LRL);
    const sepNew = (hMag * hMag) / (G_CONST * mtot * (1.0 - eccNew * eccNew)) / RSUN_KM;

    // Common geometry for plotting
    Object.assign(result, {
      E,
      mtotPrev,
      mtot,
      sepVec,
      sepPrev,
      vRelPrev,
      hPrev,
      LRLprev,
      h,
      hMag,
      LRL,
      eccNew,
      sepNew,
      blaauwTerm,
      blaauwMag: mag(blaauwTerm),
      kickTerm,
      kickMag: mag(kickTerm),
      vCm,
      vCmMag: mag(vCm),
    });

    if (eccNew > 1.0) {
      // ---- System disrupted (hyperbolic) -------------------------------
      result.disrupt = true;
      const eHat = scale(LRL, 1.0 / eccNew);
      const hHat = scale(h, 1.0 / hMag);
      const hCrossE = cross(hHat, eHat);
      const vInf = ((G_CONST * mtot) / hMag) * Math.sqrt(eccNew * eccNew - 1.0);
      const vInfVec = scale(
        add(
          scale(eHat, -1.0 / eccNew),
          scale(hCrossE, Math.sqrt(1.0 - 1.0 / (eccNew * eccNew)))
        ),
        vInf
      );
      const vSn = add(scale(vInfVec, m2 / mtot), vCm); // remnant (exploding star)
      const vComp = add(scale(vInfVec, -m1n / mtot), vCm); // companion

      // Collision check (kick.f CollisionCheck): closest approach of the two
      // stars assuming straight-line motion after the SN.
      let collide = false;
      const vDif = sub(vComp, vSn);
      const vDifDot = dot(vDif, vDif);
      if (vDifDot > 0) {
        const tMin = -dot(sepVec, vDif) / vDifDot;
        if (tMin >= 0) {
          const dMinVec = add(sepVec, scale(vDif, tMin));
          if (mag(dMinVec) < r2 * RSUN_KM) collide = true;
        }
      }

      Object.assign(result, {
        eHat,
        hHat,
        vInf,
        vInfVec,
        vSn,
        vComp,
        vSnMag: mag(vSn),
        vCompMag: mag(vComp),
        collide,
        periodNew: NaN,
        jorb: NaN,
      });
    } else {
      // ---- System stays bound ------------------------------------------
      result.disrupt = false;
      result.collide = false;
      result.periodNew = orbitalPeriodDays(sepNew, mtot);
      result.jorb =
        ((m1n * m2) / mtot) * (hMag / RSUN_KM / RSUN_KM) * YEARSC; // Msun Rsun^2 / yr
      // Systemic velocity is v_cm; companions share the same CM when bound.
      result.systemicMag = result.vCmMag;
    }

    return result;
  }

  // ---- Random number helpers -------------------------------------------
  function gaussian() {
    // Box-Muller
    let u1 = Math.random();
    let u2 = Math.random();
    if (u1 <= 0) u1 = 1e-10;
    return Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(TWOPI * u2);
  }
  function maxwellianSpeed(sigma) {
    // magnitude of a 3D vector whose components are N(0, sigma): Maxwellian
    const x = sigma * gaussian();
    const y = sigma * gaussian();
    const z = sigma * gaussian();
    return Math.sqrt(x * x + y * y + z * z);
  }
  function truncatedNormal(mu, sigma, lower, upper) {
    for (let i = 0; i < 1000; i++) {
      const x = mu + sigma * gaussian();
      if (x >= lower && x <= upper) return x;
    }
    return 0.5 * (lower + upper);
  }

  // ---- Isotropic (or polar-restricted) kick direction ------------------
  function drawDirection(polarKickAngleDeg) {
    const bound = Math.sin((90.0 - polarKickAngleDeg) * DEG);
    let sinPhi = (1.0 - bound) * Math.random() + bound;
    let phi = Math.asin(sinPhi);
    if (Math.random() >= 0.5) phi = -phi;
    const theta = TWOPI * Math.random();
    return { phiDeg: phi / DEG, thetaDeg: theta / DEG };
  }

  const DISBERG_MEAN = 5.6;
  const MEAN_MNS = 1.2;
  const MEAN_MEJ = 9.0;
  const ALPHA_KICK = 70.0;
  const BETA_KICK = 120.0;

  // Model registry with display names and paper links (used by the UI too).
  const MODELS = {
    disberg2025: {
      name: "Disberg & Mandel 2025",
      note: "Log-normal",
      url: "https://ui.adsabs.harvard.edu/abs/2025ApJ...989L...8D/abstract",
    },
    hobbs2005: {
      name: "Hobbs et al. 2005",
      note: "Maxwellian",
      url: "https://ui.adsabs.harvard.edu/abs/2005MNRAS.360..974H/abstract",
    },
    giacobbo_mapelli_1: {
      name: "Giacobbo & Mapelli 2020 (Eq. 1)",
      note: "Maxwellian scaled by ejecta & remnant mass",
      url: "https://ui.adsabs.harvard.edu/abs/2020ApJ...891..141G/abstract",
    },
    giacobbo_mapelli_2: {
      name: "Giacobbo & Mapelli 2020 (Eq. 2)",
      note: "Maxwellian scaled by ejecta mass",
      url: "https://ui.adsabs.harvard.edu/abs/2020ApJ...891..141G/abstract",
    },
    bray_eldridge: {
      name: "Bray & Eldridge 2016",
      note: "Momentum-conserving (deterministic)",
      url: "https://ui.adsabs.harvard.edu/abs/2016MNRAS.461.3747B/abstract",
    },
    mandel_muller: {
      name: "Mandel & Müller 2020",
      note: "Remnant-mass dependent",
      url: "https://ui.adsabs.harvard.edu/abs/2020MNRAS.499.3214M/abstract",
    },
  };

  /*
   * drawKick(model, params)
   * -----------------------
   * params (all optional except masses where a model needs them):
   *   m1, m1n, m1c   pre-SN mass, remnant mass, CO core mass (Msun)
   *   isBH           whether the remnant is a black hole
   *   sigma          Maxwellian dispersion (km/s), default 265
   *   mmMuNs, mmMuBh Mandel & Muller prefactors (default 400, 200)
   *   bhReduction    'none' | 'zero' | 'fallback' | 'momentum'
   *   fallback       fallback fraction [0,1]
   *   mxns           max NS mass (Msun), default 3.0
   *   bhSigmaFrac    scale-down of dispersion for BHs (default 1.0)
   *   polarKickAngle kick opening angle (deg), default 90 (isotropic)
   * Returns { vk, phiDeg, thetaDeg }.
   */
  function drawKick(model, params) {
    params = params || {};
    const m1 = params.m1;
    const m1n = params.m1n;
    const m1c = params.m1c != null ? params.m1c : m1n;
    const isBH = !!params.isBH;
    let sigma = params.sigma != null ? params.sigma : 265.0;
    const mmMuNs = params.mmMuNs != null ? params.mmMuNs : 400.0;
    const mmMuBh = params.mmMuBh != null ? params.mmMuBh : 200.0;
    const bhReduction = params.bhReduction || "fallback";
    const fallback = params.fallback != null ? params.fallback : 0.0;
    const mxns = params.mxns != null ? params.mxns : 3.0;
    const bhSigmaFrac = params.bhSigmaFrac != null ? params.bhSigmaFrac : 1.0;
    const polarKickAngle =
      params.polarKickAngle != null ? params.polarKickAngle : 90.0;

    let disbergMean = DISBERG_MEAN;
    if (isBH && (model === "hobbs2005" || model === "disberg2025")) {
      sigma = sigma * bhSigmaFrac;
      disbergMean = disbergMean * bhSigmaFrac;
    }

    let vk;
    switch (model) {
      case "disberg2025":
        vk = Math.exp(disbergMean + 0.69 * gaussian());
        break;
      case "mandel_muller": {
        const mu = (isBH ? mmMuBh : mmMuNs) * Math.max(m1c - m1n, 0.0) / m1n;
        const scatter = truncatedNormal(0.0, 0.3, -1.0, 10000.0);
        vk = mu * (1.0 + scatter);
        break;
      }
      case "giacobbo_mapelli_1":
        vk = maxwellianSpeed(sigma) * ((m1 - m1n) / MEAN_MEJ) * (MEAN_MNS / m1n);
        break;
      case "giacobbo_mapelli_2":
        vk = maxwellianSpeed(sigma) * ((m1 - m1n) / MEAN_MEJ);
        break;
      case "bray_eldridge":
        vk = ALPHA_KICK * ((m1 - m1n) / m1n) + BETA_KICK;
        break;
      case "hobbs2005":
      default:
        vk = maxwellianSpeed(sigma);
        break;
    }

    // BH kick reduction
    if (isBH) {
      if (bhReduction === "zero") vk = 0.0;
      else if (bhReduction === "fallback")
        vk = Math.max((1.0 - Math.min(fallback, 1.0)) * vk, 0.0);
      else if (bhReduction === "momentum") vk = (vk * mxns) / m1n;
    }

    if (m1n <= 0) vk = 10000.0; // massless remnant -> forced disruption

    const dir = drawDirection(polarKickAngle);
    return { vk, phiDeg: dir.phiDeg, thetaDeg: dir.thetaDeg };
  }

  return {
    G_CONST,
    RSUN_KM,
    AU_KM,
    kickPfahl,
    drawKick,
    drawDirection,
    solveEccentricAnomaly,
    orbitalPeriodDays,
    separationFromPeriodRsun,
    maxwellianSpeed,
    gaussian,
    MODELS,
    vec: { add, sub, scale, dot, cross, mag, hat },
  };
});
