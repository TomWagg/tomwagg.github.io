/* Shared helpers: object styles, formatting, orbit loading and the tooltip. */
(function () {
  "use strict";
  const BHO = (window.BHO = window.BHO || {});
  const CAT = window.BHO_CATALOGUE;
  BHO.CAT = CAT;

  // ------------------------------------------------------------ object types
  // diamond like matplotlib's "D" marker (a square rotated by 45 degrees)
  const symbolRotSquare = {
    draw(ctx, size) {
      const r = Math.sqrt(size / 2);
      ctx.moveTo(0, -r); ctx.lineTo(r, 0); ctx.lineTo(0, r); ctx.lineTo(-r, 0); ctx.closePath();
    },
  };

  BHO.TYPES = {
    bh: { label: "Black holes", short: "Black hole", symbol: d3.symbolStar, size: 230, hit: 18, ring: 14 },
    gc: { label: "Globular clusters", short: "Globular cluster", symbol: d3.symbolCircle, size: 44, hit: 11, ring: 8 },
    dwarf: { label: "Dwarf galaxies", short: "Dwarf galaxy", symbol: d3.symbolSquare, size: 40, hit: 11, ring: 8 },
    stream: { label: "Streams", short: "Stream", symbol: symbolRotSquare, size: 44, hit: 11, ring: 8 },
    ambiguous: { label: "Ambiguous systems", short: "Ambiguous system", symbol: d3.symbolTriangle, size: 44, hit: 11, ring: 8 },
  };
  BHO.TYPE_ORDER = ["bh", "gc", "dwarf", "stream", "ambiguous"];
  // drawing order: background populations first, black holes on top
  BHO.DRAW_ORDER = { stream: 0, dwarf: 1, ambiguous: 2, gc: 3, bh: 4 };

  // density contours of the Galactic discs (APOGEE giants near the Sun), toggled like the types
  BHO.DISCS = {
    low_alpha: { label: "Low-α disc" },
    high_alpha: { label: "High-α disc" },
  };
  BHO.DISC_ORDER = ["low_alpha", "high_alpha"];

  /** Inline SVG nested-contour swatch for the disc toggles. */
  BHO.discSwatch = function (key, px = 16) {
    return `<svg width="${px}" height="${px}" viewBox="-8 -8 16 16" aria-hidden="true">` +
      `<ellipse class="contour ${key}" rx="7" ry="5"/><ellipse class="contour ${key}" rx="3" ry="2"/></svg>`;
  };

  const symbolCache = {};
  BHO.symbol = function (type, scale = 1) {
    const key = `${type}:${scale}`;
    if (!symbolCache[key]) {
      const t = BHO.TYPES[type];
      symbolCache[key] = d3.symbol(t.symbol, t.size * scale)();
    }
    return symbolCache[key];
  };

  /** Inline SVG marker swatch for legends / tooltips. */
  BHO.swatch = function (type, px = 14) {
    const scale = type === "bh" ? 0.55 : 1.1;
    return `<svg width="${px}" height="${px}" viewBox="-8 -8 16 16" aria-hidden="true">` +
      `<path class="pt ${type}" d="${BHO.symbol(type, scale)}"/></svg>`;
  };

  // ------------------------------------------------------------- formatting
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  BHO.esc = esc;
  const ok = (v) => v !== null && v !== undefined && Number.isFinite(v);
  BHO.ok = ok;

  /** Fixed decimal places (uses a true minus sign). */
  BHO.fmt = (v, dp = 2) => (ok(v) ? d3.format(`.${dp}f`)(v) : "—");
  /** Significant figures, trailing zeros trimmed. */
  BHO.sig = (v, s = 3) => (ok(v) ? d3.format(`.${s}~r`)(v) : "—");
  /** Value ± error with matching precision. */
  BHO.pm = (v, err, dp = 2) => {
    if (!ok(v)) return "—";
    return ok(err) && err > 0 ? `${BHO.fmt(v, dp)} ± ${BHO.fmt(err, dp)}` : BHO.fmt(v, dp);
  };
  /** Pick decimal places so the error has ~2 significant figures. */
  BHO.dpFor = (err, min = 0, max = 4) => {
    if (!ok(err) || err <= 0) return Math.min(max, Math.max(min, 2));
    return Math.min(max, Math.max(min, 1 - Math.floor(Math.log10(err))));
  };
  BHO.pmAuto = (v, err) => BHO.pm(v, err, BHO.dpFor(err));
  const hasErr = (err) => ok(err) && err > 0;
  /** Value ± error when there is an error, otherwise ``fallback(v)``. */
  BHO.withErr = (v, err, fallback) => (hasErr(err) ? BHO.pmAuto(v, err) : fallback(v));
  /** As withErr, but with the error in a muted span (for compact stat blocks). */
  BHO.withErrHTML = (v, err, fallback, unit = "") => {
    if (!hasErr(err) || !ok(v)) return `${fallback(v)}${unit}`;
    const dp = BHO.dpFor(err);
    return `${BHO.fmt(v, dp)}${unit} <span class="err">± ${BHO.fmt(err, dp)}</span>`;
  };

  BHO.raHMS = (ra) => {
    if (!ok(ra)) return "—";
    let s = ((ra / 15) % 24 + 24) % 24 * 3600;
    const h = Math.floor(s / 3600); s -= h * 3600;
    const m = Math.floor(s / 60); s -= m * 60;
    return `${h}<sup>h</sup>${String(m).padStart(2, "0")}<sup>m</sup>${s.toFixed(1).padStart(4, "0")}<sup>s</sup>`;
  };
  BHO.decDMS = (dec) => {
    if (!ok(dec)) return "—";
    const sign = dec < 0 ? "−" : "+";
    let s = Math.abs(dec) * 3600;
    const d = Math.floor(s / 3600); s -= d * 3600;
    const m = Math.floor(s / 60); s -= m * 60;
    return `${sign}${String(d).padStart(2, "0")}° ${String(m).padStart(2, "0")}′ ${s.toFixed(0).padStart(2, "0")}″`;
  };

  /** Turn a "Author2023ApJ...123..456A" style key into an ADS link (or plain text). */
  BHO.refHTML = function (keys) {
    if (!keys) return "—";
    const seen = new Set();
    return String(keys).split(",").map((k) => k.trim()).filter((k) => k && !seen.has(k) && seen.add(k)).map((k) => {
      const m = k.match(/^(\D+?)(\d{4})(.*)$/);
      if (!m) return esc(k);
      const label = `${m[1].replace(/([a-z])([A-Z])/g, "$1-$2")} (${m[2]})`;
      const bibcode = m[2] + m[3];
      if (bibcode.length === 19) {
        return `<a href="https://ui.adsabs.harvard.edu/abs/${encodeURIComponent(bibcode)}/abstract" target="_blank" rel="noopener">${esc(label)}</a>`;
      }
      return esc(label);
    }).join(", ");
  };

  /**
   * Render a label with _{sub} and ^{sup} markup into an SVG <text>.
   * Uses dy shifts (baseline-shift is unsupported in Firefox).
   */
  BHO.richText = function (textSel, str, fontPx = 13) {
    textSel.text(null);
    const re = /([_^])\{([^}]*)\}/g;
    const shift = { "": 0, _: 0.3 * fontPx, "^": -0.4 * fontPx };
    let cur = 0, last = 0, m;
    const add = (s, kind) => {
      if (!s) return;
      const target = shift[kind];
      const ts = textSel.append("tspan").text(s).attr("dy", target - cur);
      if (kind) ts.attr("font-size", `${0.75 * fontPx}px`);
      cur = target;
    };
    while ((m = re.exec(str))) {
      add(str.slice(last, m.index), "");
      add(m[2], m[1]);
      last = re.lastIndex;
    }
    add(str.slice(last), "");
  };

  BHO.directionBadge = function (o) {
    // prograde orbits rotate clockwise in the X-Y view (the Sun moves towards +y from x < 0)
    const pro = o.direction === "prograde";
    return `<span class="pill" title="L_z / L_z,⊙ = ${BHO.fmt(o.Lz, 2)}; ${pro ? "clockwise" : "anticlockwise"} in the X–Y view">` +
      `${pro ? "Prograde" : "Retrograde"}</span>`;
  };

  BHO.typeBadge = (o) => `<span class="pill">${BHO.swatch(o.type, 12)}${BHO.TYPES[o.type].short}</span>`;

  BHO.populationBadge = (o) => (o.population ? `<span class="pill">${esc(o.population)}</span>` : "");

  /** Semi-major axis (AU) of a binary from Kepler's third law. */
  BHO.semiMajorAU = (o) => {
    if (!ok(o.period) || !ok(o.m_bh) || !ok(o.m_star)) return null;
    return Math.cbrt((o.m_bh + o.m_star) * (o.period / 365.25) ** 2);
  };

  // ----------------------------------------------------------- orbit loading
  const orbitCache = new Map();
  const pending = new Map();
  // orbit files sit in orbits/ next to catalogue.js, so resolve them from wherever that was loaded
  // (web/data/ locally, ../../data/bh-orbits/ once copied into the website)
  const catalogueScript = document.querySelector('script[src$="catalogue.js"]');
  const ORBIT_DIR = catalogueScript ? new URL("orbits/", catalogueScript.src).href : "data/orbits/";

  /** Called by each data/orbits/<id>.js file. Positions arrive in pc. */
  BHO.orbitLoaded = function (p) {
    const n = p.n;
    const x = new Float32Array(n), y = new Float32Array(n), z = new Float32Array(n), R = new Float32Array(n);
    let zAbsMax = 0, xyMax = 0, RMax = 0;
    for (let i = 0; i < n; i++) {
      x[i] = p.x[i] / 1000; y[i] = p.y[i] / 1000; z[i] = p.z[i] / 1000;
      R[i] = Math.hypot(x[i], y[i]);
      zAbsMax = Math.max(zAbsMax, Math.abs(z[i]));
      xyMax = Math.max(xyMax, Math.abs(x[i]), Math.abs(y[i]));
      RMax = Math.max(RMax, R[i]);
    }
    const orbit = { id: p.id, t0: p.t0, dt: p.dt, n, tEnd: p.t0 + (n - 1) * p.dt, x, y, z, R, zAbsMax, xyMax, RMax };
    orbitCache.set(p.id, orbit);
    const req = pending.get(p.id);
    if (req) { pending.delete(p.id); req.resolve(orbit); }
  };

  /** Lazily load an orbit by injecting its script (works over file:// too). */
  BHO.loadOrbit = function (id) {
    if (orbitCache.has(id)) return Promise.resolve(orbitCache.get(id));
    if (pending.has(id)) return pending.get(id).promise;
    const req = {};
    req.promise = new Promise((resolve, reject) => { req.resolve = resolve; req.reject = reject; });
    pending.set(id, req);
    const s = document.createElement("script");
    s.src = `${ORBIT_DIR}${encodeURIComponent(id)}.js`;
    s.async = true;
    s.onload = () => s.remove();
    s.onerror = () => { s.remove(); pending.delete(id); req.reject(new Error(`Could not load orbit for ${id}`)); };
    document.head.appendChild(s);
    return req.promise;
  };

  /** Fractional sample index for time t (Myr). */
  BHO.orbitIndex = (o, t) => Math.min(o.n - 1, Math.max(0, (t - o.t0) / o.dt));
  /** Linearly interpolated position at fractional index f. */
  BHO.orbitAt = (o, f) => {
    const i = Math.min(o.n - 1, Math.floor(f)), j = Math.min(o.n - 1, i + 1), w = f - i;
    const lerp = (a) => a[i] + (a[j] - a[i]) * w;
    const x = lerp(o.x), y = lerp(o.y), z = lerp(o.z);
    return { x, y, z, R: Math.hypot(x, y) };
  };

  // ----------------------------------------------------------------- tooltip
  const tip = document.querySelector(".bho-tooltip");
  BHO.tooltip = {
    show(html, ev) { tip.innerHTML = html; tip.hidden = false; this.move(ev); },
    move(ev) {
      if (tip.hidden || !ev) return;
      const pad = 14, w = tip.offsetWidth, h = tip.offsetHeight;
      let left = ev.clientX + pad, top = ev.clientY + pad;
      if (left + w > window.innerWidth - 8) left = ev.clientX - w - pad;
      if (top + h > window.innerHeight - 8) top = ev.clientY - h - pad;
      tip.style.left = `${Math.max(8, left)}px`;
      tip.style.top = `${Math.max(8, top)}px`;
    },
    hide() { tip.hidden = true; },
  };

  BHO.tooltipHTML = function (o) {
    const bh = o.type === "bh";
    return `<div class="tt-head">${BHO.swatch(o.type)}<strong>${esc(o.name)}</strong></div>
      <div class="tt-sub">${BHO.TYPES[o.type].short} · ${o.direction}${o.population ? ` · ${esc(o.population)}` : ""}</div>
      <dl class="tt-grid">
        <dt>RA, Dec</dt><dd>${BHO.fmt(o.ra, 3)}°, ${BHO.fmt(o.dec, 3)}°</dd>
        <dt>l, b</dt><dd>${BHO.fmt(o.l, 2)}°, ${BHO.fmt(o.b, 2)}°</dd>
        <dt>Distance</dt><dd>${BHO.sig(o.distance)} kpc</dd>
        ${o.r_peri_err || o.r_apo_err
          ? `<dt>r<sub>peri</sub></dt><dd>${BHO.withErr(o.r_peri, o.r_peri_err, BHO.sig)} kpc</dd>
             <dt>r<sub>apo</sub></dt><dd>${BHO.withErr(o.r_apo, o.r_apo_err, BHO.sig)} kpc</dd>`
          : `<dt>r<sub>peri</sub> – r<sub>apo</sub></dt><dd>${BHO.sig(o.r_peri)} – ${BHO.sig(o.r_apo)} kpc</dd>`}
        <dt>z<sub>max</sub></dt><dd>${BHO.withErr(o.z_max, o.z_max_err, BHO.sig)} kpc</dd>
        <dt>Eccentricity</dt><dd>${BHO.withErr(o.ecc_gal, o.ecc_gal_err, (v) => BHO.fmt(v, 2))}</dd>
        <dt>L<sub>z</sub> / L<sub>z,⊙</sub></dt><dd>${BHO.withErr(o.Lz, o.Lz_err, (v) => BHO.fmt(v, 2))}</dd>
        <dt>E</dt><dd>${BHO.withErr(o.E, o.E_err, (v) => BHO.fmt(v, 2))} ×10<sup>5</sup> km²/s²</dd>
        ${bh ? `<dt>M<sub>BH</sub>, M<sub>★</sub></dt><dd>${BHO.sig(o.m_bh)}, ${BHO.sig(o.m_star, 2)} M<sub>⊙</sub></dd>
               <dt>P<sub>orb</sub>, e<sub>orb</sub></dt><dd>${BHO.sig(o.period, 4)} d, ${BHO.fmt(o.ecc, 2)}</dd>` : ""}
      </dl>
      <div class="tt-hint">Click to show its orbit</div>`;
  };

  // ------------------------------------------------------------ info panels
  BHO.infoGroupsHTML = function (o) {
    const row = (dt, dd) => `<dt>${dt}</dt><dd>${dd}</dd>`;
    const group = (title, rows) => `<section class="info-group"><h4>${title}</h4><dl>${rows.join("")}</dl></section>`;
    const groups = [];

    groups.push(group("Sky position", [
      row("RA", `${BHO.raHMS(o.ra)}<span class="sub">${BHO.fmt(o.ra, 4)}°</span>`),
      row("Dec", `${BHO.decDMS(o.dec)}<span class="sub">${BHO.fmt(o.dec, 4)}°</span>`),
      row("l, b", `${BHO.fmt(o.l, 3)}°, ${BHO.fmt(o.b, 3)}°`),
      row("Distance", `${BHO.pmAuto(o.distance, o.distance_err)} kpc`),
    ]));

    groups.push(group("Kinematics", [
      row("μ<sub>α*</sub>", `${BHO.pmAuto(o.pmra, o.pmra_err)} mas/yr`),
      row("μ<sub>δ</sub>", `${BHO.pmAuto(o.pmdec, o.pmdec_err)} mas/yr`),
      row("v<sub>r</sub>", `${BHO.pmAuto(o.rv, o.rv_err)} km/s`),
      row("Now at (X, Y, Z)", `${o.xyz_now.map((v) => BHO.fmt(v, 2)).join(", ")} kpc`),
    ]));

    groups.push(group("Galactic orbit", [
      ...(o.r_peri_err || o.r_apo_err
        ? [row("r<sub>peri</sub>", `${BHO.withErr(o.r_peri, o.r_peri_err, BHO.sig)} kpc`),
           row("r<sub>apo</sub>", `${BHO.withErr(o.r_apo, o.r_apo_err, BHO.sig)} kpc`)]
        : [row("r<sub>peri</sub> – r<sub>apo</sub>", `${BHO.sig(o.r_peri)} – ${BHO.sig(o.r_apo)} kpc`)]),
      row("z<sub>max</sub>", `${BHO.withErr(o.z_max, o.z_max_err, BHO.sig)} kpc`),
      row("Eccentricity", BHO.withErr(o.ecc_gal, o.ecc_gal_err, (v) => BHO.fmt(v, 3))),
      row("L<sub>z</sub> / L<sub>z,⊙</sub>", `${BHO.withErr(o.Lz, o.Lz_err, (v) => BHO.fmt(v, 3))}` +
        `<span class="sub">${BHO.withErr(o.Lz_kms, o.Lz_kms_err, (v) => BHO.sig(v, 4))} kpc km/s</span>`),
      row("Energy", `${BHO.withErr(o.E, o.E_err, (v) => BHO.fmt(v, 3))} ×10<sup>5</sup> km²/s²`),
      row("Direction", o.direction[0].toUpperCase() + o.direction.slice(1)),
    ]));

    if (o.type === "bh") {
      const a = BHO.semiMajorAU(o);
      groups.push(group("Binary", [
        row("Period", `${BHO.pmAuto(o.period, o.period_err)} d`),
        row("Eccentricity", BHO.pmAuto(o.ecc, o.ecc_err)),
        row("M<sub>BH</sub>", `${BHO.pmAuto(o.m_bh, o.m_bh_err)} M<sub>⊙</sub>`),
        row("M<sub>★</sub>", `${BHO.pmAuto(o.m_star, o.m_star_err)} M<sub>⊙</sub>`),
        row("Semi-major axis", a ? `${BHO.sig(a, 3)} AU` : "—"),
      ]));
    }

    const refs = [];
    if (o.refs) {
      refs.push(row("Distance", BHO.refHTML(o.refs.distance)));
      refs.push(row("Proper motion", BHO.refHTML(o.refs.pm)));
      refs.push(row("Radial velocity", BHO.refHTML(o.refs.rv)));
    }
    if (o.doi) refs.push(row("Paper", `<a href="https://doi.org/${esc(o.doi)}" target="_blank" rel="noopener">doi</a>${o.arxiv ? ` · <a href="https://arxiv.org/abs/${esc(o.arxiv)}" target="_blank" rel="noopener">arXiv</a>` : ""}`));
    if (o.type === "bh" && o.source_id) refs.push(row("Gaia DR3", `<span title="source_id">${esc(o.source_id)}</span>`));
    if (refs.length) groups.push(group("References", refs));

    return groups.join("");
  };

  BHO.prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
})();
