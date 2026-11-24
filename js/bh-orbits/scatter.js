/* Zoomable scatter plot with nearest-point hover and linked selection rings. */
(function () {
  "use strict";
  const BHO = window.BHO;
  let uid = 0;

  class Scatter {
    /**
     * @param {HTMLElement} el host element
     * @param {object} opts {x, y: accessors; xErr, yErr: optional 1σ accessors; xLabel, yLabel; xDomain, yDomain; yLog;
     *                       decorate(g, x, y, scatter); onHover(obj, ev); onClick(obj); ariaLabel}
     * Density contours (e.g. of the Galactic discs) can be added with ``setContours`` and are toggled
     * through ``setVisible`` using their key, in the same way as the object types.
     */
    constructor(el, opts) {
      this.el = el;
      this.opts = opts;
      this.id = `sc${uid++}`;
      this.transform = d3.zoomIdentity;
      this.points = [];
      this.visible = {};
      this.selected = null;
      this.hovered = null;
      this.m = { top: 12, right: 14, bottom: 46, left: 58 };

      const svg = (this.svg = d3.select(el).append("svg").attr("class", "scatter")
        .attr("role", "img").attr("aria-label", opts.ariaLabel || ""));
      svg.append("defs").append("clipPath").attr("id", `${this.id}-clip`).append("rect");
      this.gGrid = svg.append("g").attr("class", "grid");
      const plot = svg.append("g").attr("clip-path", `url(#${this.id}-clip)`);
      this.gDecor = plot.append("g").attr("class", "decor");
      this.gContours = plot.append("g").attr("class", "contours").attr("pointer-events", "none");
      this.gErr = plot.append("g").attr("class", "errbars");
      this.gPoints = plot.append("g").attr("class", "points");
      this.gRings = plot.append("g").attr("class", "rings").attr("pointer-events", "none");
      this.frame = svg.append("rect").attr("class", "frame");
      this.gX = svg.append("g").attr("class", "axis x");
      this.gY = svg.append("g").attr("class", "axis y");
      this.xLab = svg.append("text").attr("class", "axis-label").attr("text-anchor", "middle");
      this.yLab = svg.append("text").attr("class", "axis-label").attr("text-anchor", "middle");
      BHO.richText(this.xLab, opts.xLabel);
      BHO.richText(this.yLab, opts.yLabel);

      // wheel zoom only with ctrl/cmd (or trackpad pinch) so the page still scrolls
      this.zoom = d3.zoom()
        .scaleExtent([0.4, 400])
        .filter((ev) => (ev.type === "wheel" ? ev.ctrlKey || ev.metaKey : !ev.button))
        .on("zoom", (ev) => { this.transform = ev.transform; this.update(); });
      svg.call(this.zoom).on("dblclick.zoom", null).on("dblclick", () => this.resetZoom());
      svg.on("pointermove", (ev) => this.onPointer(ev))
        .on("pointerleave", () => this.setHover(null))
        .on("click", () => { if (this.hovered) this.opts.onClick?.(this.hovered.obj); });

      new ResizeObserver(() => this.resize()).observe(el);
    }

    setData(objects) {
      const { x, y, yLog, xErr, yErr } = this.opts;
      const err = (fn, obj) => { const v = fn?.(obj); return BHO.ok(v) && v > 0 ? v : 0; };
      this.points = objects
        .map((obj) => ({ obj, px: x(obj), py: y(obj), ex: err(xErr, obj), ey: err(yErr, obj) }))
        .filter((d) => BHO.ok(d.px) && BHO.ok(d.py) && (!yLog || d.py > 0))
        .sort((a, b) => BHO.DRAW_ORDER[a.obj.type] - BHO.DRAW_ORDER[b.obj.type]);
      this.byId = new Map(this.points.map((d) => [d.obj.id, d]));
      this.gPoints.selectAll("path.pt").data(this.points, (d) => d.obj.id).join("path")
        .attr("class", (d) => `pt ${d.obj.type}`)
        .attr("d", (d) => BHO.symbol(d.obj.type));
      this.gErr.selectAll("path.errbar").data(this.points.filter((d) => d.ex || d.ey), (d) => d.obj.id).join("path")
        .attr("class", (d) => `errbar ${d.obj.type}`);
      this.update();
    }

    /**
     * @param {Array<{key: string, lines: Array<{f: number, x: number[], y: number[]}>}>} sets
     *   contour polylines in data coordinates, one set per population
     */
    setContours(sets) {
      const { yLog } = this.opts;
      this.contourLines = sets.flatMap((set) => set.lines.map((l) => ({
        key: set.key, f: l.f,
        pts: l.x.map((x, i) => [x, l.y[i]]).filter((p) => BHO.ok(p[0]) && BHO.ok(p[1]) && (!yLog || p[1] > 0)),
      })));
      this.gContours.selectAll("path.contour").data(this.contourLines).join("path")
        .attr("class", (d) => `contour ${d.key}`)
        .attr("data-fraction", (d) => d.f)
        .attr("display", (d) => (this.visible[d.key] ? null : "none"));
      this.update();
    }

    setVisible(visible) {
      this.visible = { ...visible };
      this.gPoints.selectAll("path.pt").attr("display", (d) => (this.visible[d.obj.type] ? null : "none"));
      this.gErr.selectAll("path.errbar").attr("display", (d) => (this.visible[d.obj.type] ? null : "none"));
      this.gContours.selectAll("path.contour").attr("display", (d) => (this.visible[d.key] ? null : "none"));
      this.update();
    }

    setSelected(id) { this.selected = id; this.drawRings(); }

    /** Highlight driven from elsewhere (the other plot, the table). */
    setLinkedHover(id) { this.linkedHover = id; this.drawRings(); }

    resetZoom() {
      this.svg.transition().duration(BHO.prefersReducedMotion() ? 0 : 450).call(this.zoom.transform, d3.zoomIdentity);
    }

    resize() {
      const w = Math.floor(this.el.clientWidth);
      if (!w) return;
      const h = Math.round(Math.max(300, Math.min(520, w * 0.78)));
      if (w === this.w && h === this.h) return;
      this.w = w; this.h = h;
      const { m, opts } = this;
      this.svg.attr("width", w).attr("height", h).attr("viewBox", `0 0 ${w} ${h}`);
      // ranges are in svg pixels so the zoom transform maps directly onto them
      this.x0 = d3.scaleLinear().domain(opts.xDomain).range([m.left, w - m.right]);
      this.y0 = (opts.yLog ? d3.scaleLog() : d3.scaleLinear()).domain(opts.yDomain).range([h - m.bottom, m.top]);
      this.zoom.extent([[m.left, m.top], [w - m.right, h - m.bottom]]);
      this.svg.select(`#${this.id}-clip rect`)
        .attr("x", m.left).attr("y", m.top).attr("width", w - m.left - m.right).attr("height", h - m.top - m.bottom);
      this.frame.attr("x", m.left).attr("y", m.top).attr("width", w - m.left - m.right).attr("height", h - m.top - m.bottom);
      this.xLab.attr("x", (m.left + w - m.right) / 2).attr("y", h - 8);
      this.yLab.attr("transform", `translate(16,${(m.top + h - m.bottom) / 2}) rotate(-90)`);
      this.update();
    }

    update() {
      if (!this.x0) return;
      const { m, w, h, opts } = this;
      const x = (this.x = this.transform.rescaleX(this.x0));
      const y = (this.y = this.transform.rescaleY(this.y0));

      const xTicks = Math.max(3, Math.round((w - m.left - m.right) / 85));
      const yTicks = Math.max(3, Math.round((h - m.top - m.bottom) / 60));
      this.gX.attr("transform", `translate(0,${h - m.bottom})`).call(d3.axisBottom(x).ticks(xTicks).tickSizeOuter(0));
      const yAxis = d3.axisLeft(y).tickSizeOuter(0);
      if (opts.yLog) yAxis.ticks(yTicks, "~g"); else yAxis.ticks(yTicks);
      this.gY.attr("transform", `translate(${m.left},0)`).call(yAxis);
      this.gX.select(".domain").remove();
      this.gY.select(".domain").remove();

      const yGridTicks = opts.yLog ? y.ticks(yTicks).filter((v) => Math.abs(Math.log10(v) - Math.round(Math.log10(v))) < 1e-6) : y.ticks(yTicks);
      this.gGrid.selectAll("line.gx").data(x.ticks(xTicks)).join("line").attr("class", "gx")
        .attr("x1", x).attr("x2", x).attr("y1", m.top).attr("y2", h - m.bottom);
      this.gGrid.selectAll("line.gy").data(yGridTicks).join("line").attr("class", "gy")
        .attr("y1", y).attr("y2", y).attr("x1", m.left).attr("x2", w - m.right);

      opts.decorate?.(this.gDecor, x, y, this);

      const contourLine = d3.line().x((p) => x(p[0])).y((p) => y(p[1]));
      this.gContours.selectAll("path.contour").attr("d", (d) => contourLine(d.pts));

      this.gPoints.selectAll("path.pt").attr("transform", (d) => `translate(${x(d.px)},${y(d.py)})`);
      // ±1σ bars (on a log axis the lower end is kept positive)
      this.gErr.selectAll("path.errbar").attr("d", (d) => {
        const sx = x(d.px), sy = y(d.py);
        const lo = opts.yLog ? Math.max(d.py - d.ey, d.py / 100) : d.py - d.ey;
        return (d.ex ? `M${x(d.px - d.ex)},${sy}H${x(d.px + d.ex)}` : "") +
          (d.ey ? `M${sx},${y(lo)}V${y(d.py + d.ey)}` : "");
      });

      // nearest-neighbour lookup over the visible, on-screen points
      this.hitPoints = this.points.filter((d) => {
        if (!this.visible[d.obj.type]) return false;
        const sx = x(d.px), sy = y(d.py);
        return sx >= m.left - 4 && sx <= w - m.right + 4 && sy >= m.top - 4 && sy <= h - m.bottom + 4;
      });
      this.delaunay = d3.Delaunay.from(this.hitPoints, (d) => x(d.px), (d) => y(d.py));
      this.drawRings();
    }

    onPointer(ev) {
      if (!this.delaunay || !this.hitPoints.length) return;
      const [mx, my] = d3.pointer(ev, this.svg.node());
      const { m, w, h } = this;
      if (mx < m.left || mx > w - m.right || my < m.top || my > h - m.bottom) return this.setHover(null);
      const d = this.hitPoints[this.delaunay.find(mx, my)];
      const dist = Math.hypot(this.x(d.px) - mx, this.y(d.py) - my);
      this.setHover(dist <= BHO.TYPES[d.obj.type].hit ? d : null, ev);
    }

    setHover(d, ev) {
      if (d !== this.hovered) {
        this.hovered = d;
        this.svg.classed("hovering", !!d);
        this.drawRings();
      }
      this.opts.onHover?.(d ? d.obj : null, ev);
    }

    drawRings() {
      if (!this.x) return;
      const rings = [];
      const add = (id, kind) => {
        const d = this.byId?.get(id);
        if (d && this.visible[d.obj.type]) rings.push({ d, kind, scatter: this });
      };
      add(this.selected, "sel-under");
      add(this.selected, "sel");
      if (this.hovered && this.hovered.obj.id !== this.selected) add(this.hovered.obj.id, "hov");
      else if (this.linkedHover && this.linkedHover !== this.selected) add(this.linkedHover, "hov");

      this.gPoints.classed("has-selection", !!this.selected);
      this.gRings.selectAll("circle").data(rings).join("circle")
        .attr("class", (r) => `ring ${r.kind}`)
        .attr("r", (r) => BHO.TYPES[r.d.obj.type].ring + (r.kind === "hov" ? 1 : 0))
        .attr("cx", (r) => this.x(r.d.px)).attr("cy", (r) => this.y(r.d.py));

      // name label next to the selected object
      const sel = rings.filter((r) => r.kind === "sel");
      this.gRings.selectAll("text").data(sel).join("text")
        .attr("class", "ring-label")
        .each(function (r) {
          // flip to the left of the marker near the right-hand edge
          const self = d3.select(this), off = BHO.TYPES[r.d.obj.type].ring + 5;
          const sx = r.scatter.x(r.d.px), flip = sx > r.scatter.w - r.scatter.m.right - 130;
          self.attr("text-anchor", flip ? "end" : "start").attr("x", flip ? sx - off : sx + off);
        })
        .attr("y", (r) => this.y(r.d.py) + 4)
        .text((r) => r.d.obj.name);
    }
  }

  BHO.Scatter = Scatter;
})();
