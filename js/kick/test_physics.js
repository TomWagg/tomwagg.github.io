/* Quick sanity checks for natal_kick_physics.js — run with `node test_physics.js` */
const P = require("./natal_kick_physics.js");

let pass = 0,
  fail = 0;
function check(name, cond, extra) {
  if (cond) {
    pass++;
    console.log("  ok  - " + name);
  } else {
    fail++;
    console.log("FAIL  - " + name + (extra ? "  [" + extra + "]" : ""));
  }
}

// 1. No kick, no mass loss -> orbit unchanged, ~zero systemic velocity
{
  const r = P.kickPfahl({
    m1: 10,
    m1n: 10,
    m2: 8,
    sep: 100,
    ecc: 0.0,
    meanAnomDeg: 90,
    vk: 0,
    phiDeg: 0,
    thetaDeg: 0,
  });
  check("no-op keeps a", Math.abs(r.sepNew - 100) < 1e-6, "a=" + r.sepNew);
  check("no-op keeps e≈0", r.eccNew < 1e-9, "e=" + r.eccNew);
  check("no-op vcm≈0", r.vCmMag < 1e-9, "v=" + r.vCmMag);
  check("no-op bound", r.disrupt === false);
}

// 2. Blaauw (symmetric mass loss only), circular orbit.
//    Analytic: a_new/a_old = mtot_prev / (2*mtot - mtot_prev); bound iff <half mass lost.
{
  const m1 = 10,
    m2 = 8,
    a0 = 100;
  const cases = [
    { m1n: 8 }, // small loss -> bound
    { m1n: 5 }, // moderate
    { m1n: 1.5 }, // large loss, near threshold
  ];
  for (const c of cases) {
    // average over mean anomaly since instantaneous a depends on phase for the
    // vector formulation; but for e=0 the analytic relation holds at every phase.
    const r = P.kickPfahl({
      m1,
      m1n: c.m1n,
      m2,
      sep: a0,
      ecc: 0.0,
      meanAnomDeg: 37,
      vk: 0,
      phiDeg: 0,
      thetaDeg: 0,
    });
    const mtotPrev = m1 + m2,
      mtot = c.m1n + m2;
    const expected = (a0 * mtot) / (2 * mtot - mtotPrev);
    check(
      "Blaauw a (m1n=" + c.m1n + ")",
      Math.abs(r.sepNew - expected) / expected < 1e-6,
      "got " + r.sepNew.toFixed(4) + " exp " + expected.toFixed(4)
    );
  }
  // Disruption threshold: lose more than half total mass -> unbound (e>=1)
  const disr = P.kickPfahl({
    m1: 20,
    m1n: 1.0,
    m2: 5,
    sep: 100,
    ecc: 0.0,
    meanAnomDeg: 90,
    vk: 0,
    phiDeg: 0,
    thetaDeg: 0,
  });
  // mass lost = 19, total pre = 25, half = 12.5 -> lost > half -> disrupt
  check("Blaauw disrupts past half-mass loss", disr.disrupt === true, "e=" + disr.eccNew);
}

// 3. Large kick disrupts, finite v_inf, sensible component velocities
{
  const r = P.kickPfahl({
    m1: 8,
    m1n: 1.4,
    m2: 6,
    sep: 50,
    ecc: 0.0,
    meanAnomDeg: 90,
    vk: 2000,
    phiDeg: 10,
    thetaDeg: 45,
  });
  check("big kick disrupts", r.disrupt === true, "e=" + r.eccNew);
  check("v_inf finite & positive", isFinite(r.vInf) && r.vInf > 0, "vinf=" + r.vInf);
  check("component speeds finite", isFinite(r.vSnMag) && isFinite(r.vCompMag));
}

// 4. Momentum bookkeeping when disrupted:
//    m1n*v_sn + m2*v_comp should equal mtot*v_cm (CM velocity conserved).
{
  const r = P.kickPfahl({
    m1: 9,
    m1n: 1.3,
    m2: 7,
    sep: 40,
    ecc: 0.2,
    meanAnomDeg: 120,
    vk: 800,
    phiDeg: -20,
    thetaDeg: 200,
  });
  if (r.disrupt) {
    const px = r.m1n_check;
    const lhs = [
      1.3 * r.vSn[0] + 7 * r.vComp[0],
      1.3 * r.vSn[1] + 7 * r.vComp[1],
      1.3 * r.vSn[2] + 7 * r.vComp[2],
    ];
    const mtot = 1.3 + 7;
    const rhs = [mtot * r.vCm[0], mtot * r.vCm[1], mtot * r.vCm[2]];
    const err = Math.sqrt(
      (lhs[0] - rhs[0]) ** 2 + (lhs[1] - rhs[1]) ** 2 + (lhs[2] - rhs[2]) ** 2
    );
    check("CM momentum conserved (disrupted)", err / (mtot * r.vCmMag) < 1e-9, "err=" + err);
  }
}

// 5. Systemic velocity decomposition adds up
{
  const r = P.kickPfahl({
    m1: 12,
    m1n: 2.0,
    m2: 10,
    sep: 200,
    ecc: 0.3,
    meanAnomDeg: 60,
    vk: 150,
    phiDeg: 30,
    thetaDeg: 90,
  });
  const sum = [
    r.blaauwTerm[0] + r.kickTerm[0],
    r.blaauwTerm[1] + r.kickTerm[1],
    r.blaauwTerm[2] + r.kickTerm[2],
  ];
  const err = Math.sqrt(
    (sum[0] - r.vCm[0]) ** 2 + (sum[1] - r.vCm[1]) ** 2 + (sum[2] - r.vCm[2]) ** 2
  );
  check("vcm = blaauw + kick", err < 1e-9, "err=" + err);
}

// 6. Sampling: distribution medians/means roughly match expectations
{
  const N = 20000;
  function median(arr) {
    const s = arr.slice().sort((a, b) => a - b);
    return s[Math.floor(s.length / 2)];
  }
  // Disberg log-normal: median ~ e^5.6 ≈ 270 km/s
  let d = [];
  for (let i = 0; i < N; i++)
    d.push(P.drawKick("disberg2025", { m1: 10, m1n: 1.4 }).vk);
  const med = median(d);
  check("Disberg median ~270", Math.abs(med - Math.exp(5.6)) / Math.exp(5.6) < 0.1, "med=" + med.toFixed(1));

  // Hobbs Maxwellian sigma=265: mean = sigma*2*sqrt(2/pi) ≈ 422
  let h = [];
  for (let i = 0; i < N; i++)
    h.push(P.drawKick("hobbs2005", { m1: 10, m1n: 1.4, sigma: 265 }).vk);
  const mean = h.reduce((a, b) => a + b, 0) / N;
  const expMean = 265 * 2 * Math.sqrt(2 / Math.PI);
  check("Hobbs mean ~422", Math.abs(mean - expMean) / expMean < 0.05, "mean=" + mean.toFixed(1));

  // Bray deterministic: 70*(m1-m1n)/m1n + 120
  const bray = P.drawKick("bray_eldridge", { m1: 10, m1n: 2.0 }).vk;
  check("Bray deterministic", Math.abs(bray - (70 * (8 / 2) + 120)) < 1e-9, "vk=" + bray);
}

console.log("\n" + pass + " passed, " + fail + " failed");
process.exit(fail === 0 ? 0 : 1);
