/* Animated orbit viewer: X-Y with X-Z / Y-Z marginals (equal aspect) and R-z. */
(function () {
  "use strict";
  const BHO = window.BHO;
  const SUN = BHO.CAT.meta.sun_xyz;
  const R_SUN = Math.hypot(SUN[0], SUN[1]);
  const DISC_R = 15;   // kpc, extent of the schematic disc
  const DISC_H = 0.3;  // kpc, half-thickness of the schematic disc
  const TRAIL_SEGMENTS = 14;
  let uid = 0;

  const ICON_PLAY = '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M4.5 2.5v11l9-5.5z" fill="currentColor"/></svg>';
  const ICON_PAUSE = '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M4 2.5h3v11H4zM9 2.5h3v11H9z" fill="currentColor"/></svg>';
  const SUN_GLYPH = '<circle class="ctx-sun" r="4.5"/><circle class="ctx-sun-dot" r="1.4"/>';
  const GC_GLYPH = '<path class="ctx-gc" d="M-4.5,0H4.5M0,-4.5V4.5"/>';

  const niceHalf = (v) => d3.scaleLinear().domain([-v, v]).nice(10).domain()[1];

  /** X/Y half-range (always including the Sun) and Z half-range (kpc) for an orbit. */
  function orbitExtent(o) {
    const L = niceHalf(Math.max(o.xyMax * 1.06, R_SUN + 1.4));
    const Lz = Math.min(L, Math.max(o.zAbsMax * 1.15, 0.12 * L));
    return { L, Lz };
  }
  BHO.orbitExtent = orbitExtent;

  function pathFrom(i0, i1, X, Y, head) {
    if (i1 < i0) return "";
    let s = `M${X(i0).toFixed(1)},${Y(i0).toFixed(1)}`;
    for (let i = i0 + 1; i <= i1; i++) s += `L${X(i).toFixed(1)},${Y(i).toFixed(1)}`;
    if (head) s += `L${head[0].toFixed(1)},${head[1].toFixed(1)}`;
    return s;
  }

  class OrbitViewer {
    constructor(el) {
      this.el = el;
      this.id = `ov${uid++}`;
      this.speed = 200;      // Myr per second of animation (default)
      this.trailMyr = 250;
      this.t = 0;
      this.playing = false;

      el.classList.add("ov");
      el.innerHTML = `
        <div class="ov-plots">
          <figure class="ov-panel ov-left">
            <figcaption>Galactocentric cartesian orbit</figcaption>
            <svg role="img" aria-label="Orbit projected onto the X–Y, X–Z and Y–Z planes"></svg>
          </figure>
          <figure class="ov-panel ov-right">
            <figcaption>Galactocentric cylindrical orbit</figcaption>
            <svg role="img" aria-label="Orbit in the meridional R–z plane"></svg>
          </figure>
        </div>
        <div class="ov-loading" hidden>Loading orbit…</div>
        <div class="ov-legend">
          <span><svg width="14" height="14" viewBox="-7 -7 14 14" aria-hidden="true"><circle class="orbit-head" r="4.5"/></svg>Position at selected time</span>
          <span><svg width="14" height="14" viewBox="-7 -7 14 14" aria-hidden="true"><path class="orbit-now" d="${d3.symbol(d3.symbolStar, 60)()}"/></svg>Present day</span>
          <span><svg width="14" height="14" viewBox="-7 -7 14 14" aria-hidden="true">${SUN_GLYPH}</svg>Sun</span>
          <span><svg width="14" height="14" viewBox="-7 -7 14 14" aria-hidden="true">${GC_GLYPH}</svg>Galactic centre</span>
          <span><svg width="22" height="14" viewBox="0 0 22 14" aria-hidden="true"><line class="ctx-solar-circle" x1="1" x2="21" y1="7" y2="7"/></svg>Solar circle</span>
        </div>
        <div class="ov-controls">
          <button type="button" class="btn btn-primary ov-play" aria-label="Play">${ICON_PLAY}</button>
          <input type="range" class="ov-time" min="-1000" max="0" step="0.5" value="0" aria-label="Time (Myr)">
          <output class="ov-tlabel">Present day</output>
          <label class="ov-opt">Speed
            <select class="ov-speed">
              <option value="25">25 Myr/s</option><option value="50">50 Myr/s</option>
              <option value="100">100 Myr/s</option><option value="200" selected>200 Myr/s</option>
              <option value="400">400 Myr/s</option><option value="1000">1 Gyr/s</option>
            </select>
          </label>
          <label class="ov-opt">Trail
            <select class="ov-trail">
              <option value="50">50 Myr</option><option value="100">100 Myr</option>
              <option value="250" selected>250 Myr</option><option value="500">500 Myr</option>
              <option value="Infinity">Full orbit</option>
            </select>
          </label>
        </div>`;

      this.plotsEl = el.querySelector(".ov-plots");
      this.leftFig = el.querySelector(".ov-left");
      this.rightFig = el.querySelector(".ov-right");
      this.svgL = d3.select(el.querySelector(".ov-left svg"));
      this.svgR = d3.select(el.querySelector(".ov-right svg"));
      this.loadingEl = el.querySelector(".ov-loading");
      this.slider = el.querySelector(".ov-time");
      this.tLabel = el.querySelector(".ov-tlabel");
      this.playBtn = el.querySelector(".ov-play");

      this.playBtn.addEventListener("click", () => (this.playing ? this.pause() : this.play()));
      this.slider.addEventListener("input", () => { this.pause(); this.setTime(+this.slider.value); });
      el.querySelector(".ov-speed").addEventListener("change", (e) => { this.speed = +e.target.value; });
      el.querySelector(".ov-trail").addEventListener("change", (e) => { this.trailMyr = +e.target.value; this.drawFrame(); });

      this.tick = this.tick.bind(this);
      new ResizeObserver(() => this.layout()).observe(this.plotsEl);
    }

    setLoading() {
      this.pause();
      this.el.classList.add("loading");
      this.loadingEl.hidden = false;
    }

    show(obj, orbit, { autoplay = false } = {}) {
      this.pause();
      this.obj = obj;
      this.orbit = orbit;
      this.el.classList.remove("loading");
      this.loadingEl.hidden = true;
      this.slider.min = orbit.t0;
      this.slider.max = orbit.tEnd;
      this.slider.step = orbit.dt;
      this.lastW = null;
      this.panels = null; // never draw a new orbit with the previous orbit's scales
      this.layout();
      const animate = autoplay && !BHO.prefersReducedMotion();
      this.setTime(animate ? orbit.t0 : orbit.tEnd);
      if (animate) this.play();
    }

    // --------------------------------------------------------------- layout
    layout() {
      const o = this.orbit;
      if (!o) return;
      const W = Math.floor(this.plotsEl.clientWidth);
      if (!W || W === this.lastW) return;
      this.lastW = W;

      const wide = W >= 760;
      this.plotsEl.classList.toggle("narrow", !wide);
      const gap = 20;
      const Wl = wide ? Math.floor((W - gap) * 0.58) : W;
      const Wr = wide ? W - gap - Wl : W;

      // symmetric X/Y half-range (always includes the Sun) and Z half-range;
      // marginal panels share the kpc-per-pixel scale of the X-Y panel
      const { L, Lz } = orbitExtent(o);
      const k = Lz / L;
      const m = { l: 52, r: 8, t: 6, b: 42 }, g = 10;
      let S = (Wl - m.l - m.r - g) / (1 + k);
      S = Math.floor(Math.min(S, (640 - m.t - m.b - g) / (1 + k)));
      const kS = k * S;
      const H = Math.ceil(m.t + kS + g + S + m.b);
      const ox = m.l, topZ = m.t, topXY = m.t + kS + g, sideX = ox + S + g;
      const wL = Math.ceil(sideX + kS + m.r);

      const xs = d3.scaleLinear([-L, L], [ox, ox + S]);
      const ys = d3.scaleLinear([-L, L], [topXY + S, topXY]);
      const zTop = d3.scaleLinear([-Lz, Lz], [topZ + kS, topZ]);
      const zSide = d3.scaleLinear([-Lz, Lz], [sideX, sideX + kS]);

      this.leftFig.style.width = wide ? `${Wl}px` : "100%";
      this.rightFig.style.width = wide ? `${Wr}px` : "100%";
      // centre the titles over the plot frames rather than over the axis-label margins
      const capL = this.leftFig.querySelector("figcaption");
      capL.style.paddingLeft = `${ox}px`;
      capL.style.paddingRight = `${Math.max(0, (wide ? Wl : W) - (sideX + kS))}px`;

      // ---- left: X-Y + marginals
      const svgL = this.svgL;
      svgL.selectAll("*").remove();
      svgL.attr("width", wL).attr("height", H).attr("viewBox", `0 0 ${wL} ${H}`);
      const defs = svgL.append("defs");
      const grad = defs.append("radialGradient").attr("id", `${this.id}-disc`);
      [[0, 0.9], [0.25, 0.55], [0.6, 0.18], [1, 0]].forEach(([off, op]) =>
        grad.append("stop").attr("offset", off).attr("style", `stop-color: var(--disc); stop-opacity: ${op}`));

      const pXZ = this.makePanel(svgL, defs, "xz", ox, topZ, S, kS, "X–Z");
      const pXY = this.makePanel(svgL, defs, "xy", ox, topXY, S, S, "X–Y");
      const pYZ = this.makePanel(svgL, defs, "yz", sideX, topXY, kS, S, "Y–Z");
      pXZ.X = (i) => xs(o.x[i]); pXZ.Y = (i) => zTop(o.z[i]); pXZ.at = (p) => [xs(p.x), zTop(p.z)];
      pXY.X = (i) => xs(o.x[i]); pXY.Y = (i) => ys(o.y[i]); pXY.at = (p) => [xs(p.x), ys(p.y)];
      pYZ.X = (i) => zSide(o.z[i]); pYZ.Y = (i) => ys(o.y[i]); pYZ.at = (p) => [zSide(p.z), ys(p.y)];

      // context: face-on disc, solar circle, Sun, Galactic centre
      pXY.ctx.append("circle").attr("cx", xs(0)).attr("cy", ys(0)).attr("r", xs(DISC_R) - xs(0))
        .attr("fill", `url(#${this.id}-disc)`);
      pXY.ctx.append("circle").attr("class", "ctx-solar-circle")
        .attr("cx", xs(0)).attr("cy", ys(0)).attr("r", xs(R_SUN) - xs(0));
      this.glyph(pXY.ctx, GC_GLYPH, xs(0), ys(0));
      this.glyph(pXY.ctx, SUN_GLYPH, xs(SUN[0]), ys(SUN[1]));
      // edge-on disc
      this.band(pXZ.ctx, xs(-DISC_R), zTop(DISC_H), xs(DISC_R) - xs(-DISC_R), zTop(-DISC_H) - zTop(DISC_H));
      pXZ.ctx.append("line").attr("class", "ctx-midplane").attr("x1", xs(-L)).attr("x2", xs(L)).attr("y1", zTop(0)).attr("y2", zTop(0)).attr("opacity", 0.5);
      this.glyph(pXZ.ctx, GC_GLYPH, xs(0), zTop(0));
      this.glyph(pXZ.ctx, SUN_GLYPH, xs(SUN[0]), zTop(SUN[2]));
      this.band(pYZ.ctx, zSide(-DISC_H), ys(DISC_R), zSide(DISC_H) - zSide(-DISC_H), ys(-DISC_R) - ys(DISC_R));
      pYZ.ctx.append("line").attr("class", "ctx-midplane").attr("y1", ys(-L)).attr("y2", ys(L)).attr("x1", zSide(0)).attr("x2", zSide(0)).attr("opacity", 0.5);
      this.glyph(pYZ.ctx, GC_GLYPH, zSide(0), ys(0));
      this.glyph(pYZ.ctx, SUN_GLYPH, zSide(SUN[2]), ys(SUN[1]));

      // axes
      const nXY = Math.max(4, Math.round(S / 70));
      svgL.append("g").attr("class", "axis").attr("transform", `translate(0,${topXY + S})`)
        .call(d3.axisBottom(xs).ticks(nXY).tickSizeOuter(0)).select(".domain").remove();
      svgL.append("g").attr("class", "axis").attr("transform", `translate(${ox},0)`)
        .call(d3.axisLeft(ys).ticks(nXY).tickSizeOuter(0)).select(".domain").remove();
      svgL.append("g").attr("class", "axis").attr("transform", `translate(${ox},0)`)
        .call(d3.axisLeft(zTop).ticks(Math.max(2, Math.floor(kS / 32))).tickSizeOuter(0)).select(".domain").remove();
      svgL.append("g").attr("class", "axis").attr("transform", `translate(0,${topXY + S})`)
        .call(d3.axisBottom(zSide).ticks(Math.max(2, Math.floor(kS / 45))).tickSizeOuter(0)).select(".domain").remove();

      const lab = (txt, x, y, rotate) => {
        const t = svgL.append("text").attr("class", "axis-label").attr("text-anchor", "middle")
          .attr("transform", `translate(${x},${y})${rotate ? " rotate(-90)" : ""}`);
        BHO.richText(t, txt);
      };
      lab("X [kpc]", ox + S / 2, H - 6);
      lab("Y [kpc]", 13, topXY + S / 2, true);
      lab(kS >= 70 ? "Z [kpc]" : "Z", 13, topZ + kS / 2 + (kS >= 70 ? 0 : 4), kS >= 70);
      lab(kS >= 70 ? "Z [kpc]" : "Z", sideX + kS / 2, H - 6);

      // ---- right: R-z
      const Hr = wide ? H : Math.round(Math.max(240, Math.min(420, Wr * 0.6)));
      const mr = { l: 52, r: 10, t: m.t, b: m.b };
      const capR = this.rightFig.querySelector("figcaption");
      capR.style.paddingLeft = `${mr.l}px`;
      capR.style.paddingRight = `${mr.r}px`;
      const Rmax = d3.scaleLinear().domain([0, Math.max(o.RMax * 1.05, R_SUN + 1.5)]).nice(8).domain()[1];
      const rs = d3.scaleLinear([0, Rmax], [mr.l, Wr - mr.r]);
      const zr = d3.scaleLinear([-Lz, Lz], [Hr - mr.b, mr.t]);
      const svgR = this.svgR;
      svgR.selectAll("*").remove();
      svgR.attr("width", Wr).attr("height", Hr).attr("viewBox", `0 0 ${Wr} ${Hr}`);
      const defsR = svgR.append("defs");
      const pRz = this.makePanel(svgR, defsR, "rz", mr.l, mr.t, Wr - mr.l - mr.r, Hr - mr.t - mr.b, "");
      pRz.X = (i) => rs(o.R[i]); pRz.Y = (i) => zr(o.z[i]); pRz.at = (p) => [rs(p.R), zr(p.z)];
      pRz.ctx.append("line").attr("class", "ctx-midplane").attr("x1", rs(0)).attr("x2", rs(Rmax)).attr("y1", zr(0)).attr("y2", zr(0)).attr("opacity", 0.5);
      this.glyph(pRz.ctx, GC_GLYPH, rs(0), zr(0));
      this.glyph(pRz.ctx, SUN_GLYPH, rs(R_SUN), zr(SUN[2]));
      svgR.append("g").attr("class", "axis").attr("transform", `translate(0,${Hr - mr.b})`)
        .call(d3.axisBottom(rs).ticks(Math.max(3, Math.round((Wr - mr.l) / 80))).tickSizeOuter(0)).select(".domain").remove();
      svgR.append("g").attr("class", "axis").attr("transform", `translate(${mr.l},0)`)
        .call(d3.axisLeft(zr).ticks(Math.max(3, Math.round(Hr / 60))).tickSizeOuter(0)).select(".domain").remove();
      const tR = svgR.append("text").attr("class", "axis-label").attr("text-anchor", "middle")
        .attr("transform", `translate(${(mr.l + Wr - mr.r) / 2},${Hr - 6})`);
      BHO.richText(tR, "R = (X^{2} + Y^{2})^{1/2} [kpc]");
      const tZ = svgR.append("text").attr("class", "axis-label").attr("text-anchor", "middle")
        .attr("transform", `translate(13,${(mr.t + Hr - mr.b) / 2}) rotate(-90)`);
      BHO.richText(tZ, "z [kpc]");

      this.panels = [pXZ, pXY, pYZ, pRz];
      for (const p of this.panels) {
        p.full.attr("d", pathFrom(0, o.n - 1, p.X, p.Y));
        const [nx, ny] = [p.X(o.n - 1), p.Y(o.n - 1)];
        p.marks.append("path").attr("class", "orbit-now").attr("d", d3.symbol(d3.symbolStar, 70)())
          .attr("transform", `translate(${nx},${ny})`);
        p.head = p.marks.append("circle").attr("class", "orbit-head").attr("r", 4.5);
      }
      this.drawFrame();
    }

    makePanel(svg, defs, key, x, y, w, h, tag) {
      const clipId = `${this.id}-${key}`;
      defs.append("clipPath").attr("id", clipId).append("rect").attr("x", x).attr("y", y).attr("width", w).attr("height", h);
      const g = svg.append("g");
      const inner = g.append("g").attr("clip-path", `url(#${clipId})`);
      const p = { ctx: inner.append("g") };
      p.full = inner.append("path").attr("class", "orbit-full");
      const trail = inner.append("g");
      p.trail = d3.range(TRAIL_SEGMENTS).map((k) => {
        const f = (k + 1) / TRAIL_SEGMENTS;
        return trail.append("path").attr("class", "orbit-trail")
          .attr("stroke-opacity", 0.1 + 0.9 * f ** 1.6).attr("stroke-width", 0.9 + 1.5 * f);
      });
      p.marks = g.append("g");
      g.append("rect").attr("class", "frame").attr("x", x).attr("y", y).attr("width", w).attr("height", h);
      if (tag && w > 40 && h > 24) g.append("text").attr("class", "panel-tag").attr("x", x + 6).attr("y", y + 14).text(tag);
      return p;
    }

    glyph(g, markup, x, y) { g.append("g").attr("transform", `translate(${x},${y})`).html(markup); }
    band(g, x, y, w, h) {
      g.append("rect").attr("class", "ctx-disc-band").attr("x", x).attr("y", y).attr("width", w).attr("height", Math.max(1, h));
    }

    // ------------------------------------------------------------ animation
    drawFrame() {
      const o = this.orbit;
      if (!o || !this.panels) return;
      const f = BHO.orbitIndex(o, this.t);
      const pos = BHO.orbitAt(o, f);
      const i1 = Math.floor(f);
      const span = Number.isFinite(this.trailMyr) ? Math.round(this.trailMyr / o.dt) : o.n;
      const i0 = Math.max(0, i1 - span);
      for (const p of this.panels) {
        const head = p.at(pos);
        p.head.attr("cx", head[0]).attr("cy", head[1]);
        for (let k = 0; k < TRAIL_SEGMENTS; k++) {
          const a = i0 + Math.floor((k * (i1 - i0)) / TRAIL_SEGMENTS);
          const b = i0 + Math.floor(((k + 1) * (i1 - i0)) / TRAIL_SEGMENTS);
          p.trail[k].attr("d", pathFrom(a, b, p.X, p.Y, k === TRAIL_SEGMENTS - 1 ? head : null));
        }
      }
    }

    setTime(t) {
      const o = this.orbit;
      if (!o) return;
      this.t = Math.min(o.tEnd, Math.max(o.t0, t));
      this.slider.value = this.t;
      const ago = o.tEnd - this.t;
      this.tLabel.textContent = ago < o.dt / 2 ? "Present day" : `${d3.format(",.0f")(ago)} Myr ago`;
      this.drawFrame();
    }

    play() {
      const o = this.orbit;
      if (!o) return;
      if (this.t >= o.tEnd - o.dt / 2) this.setTime(o.t0);
      this.playing = true;
      this.playBtn.innerHTML = ICON_PAUSE;
      this.playBtn.setAttribute("aria-label", "Pause");
      this.last = performance.now();
      cancelAnimationFrame(this.raf);
      this.raf = requestAnimationFrame(this.tick);
    }

    pause() {
      this.playing = false;
      cancelAnimationFrame(this.raf);
      this.playBtn.innerHTML = ICON_PLAY;
      this.playBtn.setAttribute("aria-label", "Play");
    }

    tick(now) {
      if (!this.playing) return;
      const dtSec = Math.min(0.1, (now - this.last) / 1000);
      this.last = now;
      const t = this.t + this.speed * dtSec;
      if (t >= this.orbit.tEnd) { this.setTime(this.orbit.tEnd); this.pause(); return; }
      this.setTime(t);
      this.raf = requestAnimationFrame(this.tick);
    }
  }

  // ------------------------------------------------------- static thumbnail
  /**
   * Draw a small X-Y + X-Z orbit thumbnail into an <svg>.
   * @param {number} L  X/Y half-range (kpc); @param {number} Lz Z half-range (kpc)
   */
  BHO.drawThumbnail = function (svgEl, orbit, L, Lz, width = 260) {
    const svg = d3.select(svgEl);
    svg.selectAll("*").remove();
    const gap = 6, S = width, kS = Math.max(14, (S * Lz) / L), H = S + gap + kS;
    svg.attr("viewBox", `0 0 ${S} ${H}`).attr("width", S).attr("height", H);
    const id = `th${uid++}`;
    const defs = svg.append("defs");
    const grad = defs.append("radialGradient").attr("id", `${id}-disc`);
    [[0, 0.9], [0.25, 0.55], [0.6, 0.18], [1, 0]].forEach(([off, op]) =>
      grad.append("stop").attr("offset", off).attr("style", `stop-color: var(--disc); stop-opacity: ${op}`));
    const xs = d3.scaleLinear([-L, L], [0, S]);
    const ys = d3.scaleLinear([-L, L], [S, 0]);
    const zs = d3.scaleLinear([-Lz, Lz], [S + gap + kS, S + gap]);
    defs.append("clipPath").attr("id", `${id}-a`).append("rect").attr("width", S).attr("height", S);
    defs.append("clipPath").attr("id", `${id}-b`).append("rect").attr("y", S + gap).attr("width", S).attr("height", kS);

    const a = svg.append("g").attr("clip-path", `url(#${id}-a)`);
    a.append("circle").attr("cx", xs(0)).attr("cy", ys(0)).attr("r", xs(DISC_R) - xs(0)).attr("fill", `url(#${id}-disc)`);
    a.append("circle").attr("class", "ctx-solar-circle").attr("cx", xs(0)).attr("cy", ys(0)).attr("r", xs(R_SUN) - xs(0));
    const o = orbit, n = o.n;
    a.append("path").attr("class", "orbit-trail").attr("stroke-opacity", 0.85).attr("stroke-width", 1.1)
      .attr("d", pathFrom(0, n - 1, (i) => xs(o.x[i]), (i) => ys(o.y[i])));
    a.append("g").attr("transform", `translate(${xs(0)},${ys(0)})`).html(GC_GLYPH);
    a.append("g").attr("transform", `translate(${xs(SUN[0])},${ys(SUN[1])})`).html(SUN_GLYPH);
    a.append("circle").attr("class", "orbit-head").attr("r", 4).attr("cx", xs(o.x[n - 1])).attr("cy", ys(o.y[n - 1]));

    const b = svg.append("g").attr("clip-path", `url(#${id}-b)`);
    b.append("rect").attr("class", "ctx-disc-band").attr("x", xs(-DISC_R)).attr("width", xs(DISC_R) - xs(-DISC_R))
      .attr("y", zs(DISC_H)).attr("height", Math.max(1, zs(-DISC_H) - zs(DISC_H)));
    b.append("path").attr("class", "orbit-trail").attr("stroke-opacity", 0.85).attr("stroke-width", 1.1)
      .attr("d", pathFrom(0, n - 1, (i) => xs(o.x[i]), (i) => zs(o.z[i])));
    b.append("circle").attr("class", "orbit-head").attr("r", 3.5).attr("cx", xs(o.x[n - 1])).attr("cy", zs(o.z[n - 1]));

    svg.append("rect").attr("class", "frame").attr("width", S).attr("height", S);
    svg.append("rect").attr("class", "frame").attr("y", S + gap).attr("width", S).attr("height", kS);
    svg.append("text").attr("class", "panel-tag").attr("x", 6).attr("y", 14).text("X–Y");
    if (kS > 22) svg.append("text").attr("class", "panel-tag").attr("x", 6).attr("y", S + gap + 13).text("X–Z");

    // scale bar
    const bar = [1, 2, 5, 10, 20, 50, 100, 200].find((v) => xs(v) - xs(0) > S * 0.18) || 200;
    const bx = S - 10 - (xs(bar) - xs(0)), by = S - 10;
    svg.append("line").attr("class", "bin-scale").attr("x1", bx).attr("x2", S - 10).attr("y1", by).attr("y2", by);
    svg.append("text").attr("class", "panel-tag").attr("x", S - 10).attr("y", by - 5).attr("text-anchor", "end").text(`${bar} kpc`);
  };

  BHO.OrbitViewer = OrbitViewer;
})();
