/* Schematic of a BH + star binary orbit in the centre-of-mass frame (to scale). */
(function () {
  "use strict";
  const BHO = window.BHO;
  const SECONDS_PER_ORBIT = 6;

  /** Solve Kepler's equation M = E - e sin E for the true anomaly. */
  function trueAnomaly(M, e) {
    let E = e < 0.8 ? M : Math.PI;
    for (let i = 0; i < 30; i++) {
      const dE = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
      E -= dE;
      if (Math.abs(dE) < 1e-10) break;
    }
    return 2 * Math.atan2(Math.sqrt(1 + e) * Math.sin(E / 2), Math.sqrt(1 - e) * Math.cos(E / 2));
  }

  class BinaryView {
    constructor(el) {
      this.el = el;
      this.frame = this.frame.bind(this);
    }

    stop() { cancelAnimationFrame(this.raf); this.raf = null; }

    show(o) {
      this.stop();
      const el = this.el;
      const a = BHO.semiMajorAU(o);
      if (!a || !BHO.ok(o.ecc)) {
        el.innerHTML = '<p class="muted">No binary solution available.</p>';
        return;
      }
      const e = o.ecc, M = o.m_bh + o.m_star;
      const aS = (a * o.m_bh) / M, aB = (a * o.m_star) / M;
      const bS = aS * Math.sqrt(1 - e * e);
      this.o = o; this.e = e; this.aS = aS; this.ratio = o.m_star / o.m_bh;

      // equal-scale layout in AU, periastron of the star towards +x
      const xmin = Math.min(-aS * (1 + e), -aB * (1 - e)), xmax = Math.max(aS * (1 - e), aB * (1 + e));
      const W = 420, pad = 26, bottom = 0;
      const sc = Math.min((W - 2 * pad) / (xmax - xmin), 260 / (2 * bS));
      const H = Math.round(2 * bS * sc + 2 * pad + bottom);
      const cx = pad + (W - 2 * pad - (xmax - xmin) * sc) / 2 - xmin * sc;
      const cy = pad + bS * sc;
      this.X = (x) => cx + x * sc;
      this.Y = (y) => cy - y * sc;

      el.innerHTML = "";
      const svg = d3.select(el).append("svg").attr("viewBox", `0 0 ${W} ${H}`)
        .attr("role", "img").attr("aria-label", `Binary orbit of ${o.name}: eccentricity ${BHO.fmt(e, 2)}, semi-major axis ${BHO.sig(a, 3)} AU`);

      const ellipse = (aa, sign) => {
        const pts = d3.range(0, 2 * Math.PI + 1e-9, Math.PI / 120).map((nu) => {
          const r = (aa * (1 - e * e)) / (1 + e * Math.cos(nu));
          return [this.X(sign * r * Math.cos(nu)), this.Y(sign * r * Math.sin(nu))];
        });
        return d3.line()(pts) + "Z";
      };
      svg.append("line").attr("class", "bin-axis")
        .attr("x1", this.X(-aS * (1 + e))).attr("x2", this.X(aS * (1 - e))).attr("y1", cy).attr("y2", cy);
      svg.append("path").attr("class", "bin-orbit-star").attr("d", ellipse(aS, 1));
      svg.append("path").attr("class", "bin-orbit-bh").attr("d", ellipse(aB, -1));
      svg.append("path").attr("class", "bin-com").attr("d", `M${cx - 5},${cy}H${cx + 5}M${cx},${cy - 5}V${cy + 5}`);

      // symbol with a subscript, e.g. m₁ (dy shifts are relative, so undo the drop afterwards)
      const sym = (txt, s, sub) => {
        txt.append("tspan").attr("font-style", "italic").text(s);
        if (sub) txt.append("tspan").attr("dy", 3).attr("font-size", "0.75em").text(sub);
        return txt.append("tspan").attr("dy", sub ? -3 : null);
      };
      const massLabel = (sub, m, err) => {
        const txt = svg.append("text").attr("class", "bin-label").attr("text-anchor", "middle");
        sym(txt, "m", sub).text(` = ${BHO.fmt(m, BHO.dpFor(err))} M`);
        txt.append("tspan").attr("dy", 3).attr("font-size", "0.75em").text("⊙");
        return txt;
      };

      // eccentricity: upper-right corner, outside the orbit
      sym(svg.append("text").attr("class", "bin-label").attr("text-anchor", "end")
        .attr("x", W - 4).attr("y", 14), "e")
        .text(` = ${BHO.fmt(e, BHO.dpFor(o.ecc_err))}`);

      // semi-major axis of the relative orbit: a to-scale dimension line along the line of apsides,
      // starting at the star's apastron (drawn before the bodies so they pass over it)
      const ax0 = this.X(-aS * (1 + e)), ax1 = ax0 + a * sc;
      svg.append("path").attr("class", "bin-scale")
        .attr("d", `M${ax0},${cy - 4}V${cy + 4}M${ax0},${cy}H${ax1}M${ax1},${cy - 4}V${cy + 4}`);
      // label hugs the far end, away from the star's labels as it swings round apastron
      sym(svg.append("text").attr("class", "bin-label").attr("text-anchor", "end")
        .attr("x", ax1 - 6).attr("y", cy - 8), "a")
        .text(` = ${d3.format(".3r")(a)} AU`);

      // body sizes are schematic: grow gently with mass
      const rBH = 5 + 2 * Math.cbrt(o.m_bh), rStar = 4 + 2.5 * Math.cbrt(o.m_star);
      this.bh = svg.append("circle").attr("class", "bin-bh").attr("r", rBH);
      this.star = svg.append("circle").attr("class", "bin-star").attr("r", rStar);
      this.bhLabel = massLabel("1", o.m_bh, o.m_bh_err);
      this.starLabel = massLabel("2", o.m_star, o.m_star_err);
      this.rBH = rBH; this.rStar = rStar; this.W = W;
      this.labelW = new Map();

      const pYears = o.period / 365.25;
      const param = (dt, dd) => `<div><dt>${dt}</dt><dd>${dd}</dd></div>`;
      const valErr = (v, err) => {
        const dp = BHO.dpFor(err);
        return `${BHO.fmt(v, dp)}${BHO.ok(err) && err > 0 ? ` <span class="err">± ${BHO.fmt(err, dp)}</span>` : ""}`;
      };
      const params = document.createElement("dl");
      params.className = "binary-params";
      params.innerHTML = [
        param("Black hole mass, <i>m</i><sub>1</sub>", `${valErr(o.m_bh, o.m_bh_err)} M<sub>⊙</sub>`),
        param("Star mass, <i>m</i><sub>2</sub>", `${valErr(o.m_star, o.m_star_err)} M<sub>⊙</sub>`),
        param("Orbital period", `${valErr(o.period, o.period_err)} d` + (pYears > 1 ? ` <span class="err">(${BHO.sig(pYears, 3)} yr)</span>` : "")),
        param("Eccentricity, <i>e</i>", valErr(o.ecc, o.ecc_err)),
        param("Semi-major axis, <i>a</i>", `${d3.format(".3r")(a)} AU`),
        param("Periastron sep.", `${BHO.sig(a * (1 - e), 3)} AU`),
      ].join("");
      el.appendChild(params);
      const cap = document.createElement("p");
      cap.className = "bin-caption";
      cap.textContent = "Relative orbits in the centre-of-mass frame, to scale and face-on. The a bar shows the full separation, so it is longer than the star's own orbit. One orbit lasts " + SECONDS_PER_ORBIT + " s (not the same timescale as Galactic orbit plots!).";
      el.appendChild(cap);

      if (BHO.prefersReducedMotion()) {
        this.place(Math.PI); // static, at apastron
      } else {
        this.start = performance.now();
        this.raf = requestAnimationFrame(this.frame);
      }
    }

    place(meanAnomaly) {
      const e = this.e, nu = trueAnomaly(meanAnomaly, e);
      const r = (this.aS * (1 - e * e)) / (1 + e * Math.cos(nu));
      const sx = r * Math.cos(nu), sy = r * Math.sin(nu);
      const bx = -this.ratio * sx, by = -this.ratio * sy;
      this.star.attr("cx", this.X(sx)).attr("cy", this.Y(sy));
      this.bh.attr("cx", this.X(bx)).attr("cy", this.Y(by));
      // mass labels ride just above each body, kept inside the frame
      const above = (label, x, y, rad) => {
        let w = this.labelW.get(label);
        if (!w) {
          w = label.node().getComputedTextLength(); // 0 while the panel is hidden
          if (w > 0) this.labelW.set(label, w);
          else w = 80;
        }
        const lx = Math.min(Math.max(this.X(x), w / 2 + 2), this.W - w / 2 - 2);
        label.attr("x", lx).attr("y", this.Y(y) - rad - 6);
      };
      above(this.starLabel, sx, sy, this.rStar);
      above(this.bhLabel, bx, by, this.rBH);
    }

    frame(now) {
      if (!this.el.isConnected) return this.stop();
      const phase = (((now - this.start) / 1000) / SECONDS_PER_ORBIT) % 1;
      this.place(2 * Math.PI * phase);
      this.raf = requestAnimationFrame(this.frame);
    }
  }

  BHO.BinaryView = BinaryView;
})();
