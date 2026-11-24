/* Page controller: routing, explorer (linked scatter plots + orbit) and BH gallery. */
(function () {
  "use strict";
  const BHO = window.BHO, CAT = BHO.CAT, esc = BHO.esc;
  // ambiguous systems are never shown on the site
  const objects = CAT.objects.filter((o) => o.type !== "ambiguous");
  const byId = new Map(objects.map((o) => [o.id, o]));
  const nameSort = (a, b) => a.name.localeCompare(b.name, undefined, { numeric: true });
  const bhs = objects.filter((o) => o.type === "bh").sort(nameSort);
  const counts = d3.rollup(objects, (v) => v.length, (o) => o.type);
  const types = BHO.TYPE_ORDER.filter((t) => counts.get(t));

  const state = {
    // start with only the BHs (disc contours off too)
    visible: { bh: true, gc: false, dwarf: false, stream: false, low_alpha: false, high_alpha: false },
    selected: null,
  };

  // =============================================================== explorer
  const exploreEl = document.getElementById("view-explore");
  const detailEl = document.getElementById("detail");
  const detailBody = detailEl.querySelector(".detail-body");
  const exploreViewer = new BHO.OrbitViewer(document.getElementById("explore-orbit"));

  // ---- type toggles (also serve as the legend)
  const chipsEl = exploreEl.querySelector(".chips");
  chipsEl.innerHTML = types.map((t) =>
    `<button type="button" class="chip ${t}" data-type="${t}" aria-pressed="${state.visible[t]}">` +
    `${BHO.swatch(t)}${BHO.TYPES[t].label} <span class="count">${counts.get(t)}</span></button>`).join("");
  // disc density contours, toggled in the same way
  const discs = BHO.DISC_ORDER.filter((k) => CAT.discs?.[k]);
  if (discs.length) {
    const fracs = [...new Set(CAT.discs[discs[0]].Lz_E.map((l) => l.f))].sort((a, b) => a - b)
      .map((f) => `${Math.round(f * 100)}%`);
    const tip = `Density contours enclosing ${fracs.slice(0, -1).join(", ")} and ${fracs.at(-1)} of ` +
      "APOGEE giants within 2.5 kpc of the Sun (in Galactocentric R)";
    chipsEl.insertAdjacentHTML("beforeend", '<span class="chip-sep" aria-hidden="true"></span>' +
      discs.map((k) =>
        `<button type="button" class="chip disc ${k}" data-type="${k}" aria-pressed="${state.visible[k]}" title="${esc(tip)}">` +
        `${BHO.discSwatch(k)}${BHO.DISCS[k].label} <span class="count">${CAT.discs[k].n} stars</span></button>`).join(""));
  }
  chipsEl.addEventListener("click", (e) => {
    const b = e.target.closest(".chip");
    if (!b) return;
    state.visible[b.dataset.type] = !state.visible[b.dataset.type];
    applyVisibility();
  });

  function applyVisibility() {
    chipsEl.querySelectorAll(".chip").forEach((b) => b.setAttribute("aria-pressed", state.visible[b.dataset.type]));
    scatters.forEach((s) => s.setVisible(state.visible));
  }

  // ---- linked hover
  let hoverId = null;
  function onHover(source, obj, ev) {
    const id = obj ? obj.id : null;
    if (id !== hoverId) {
      hoverId = id;
      if (obj) BHO.tooltip.show(BHO.tooltipHTML(obj), ev);
      else BHO.tooltip.hide();
      scatters.forEach((s) => s !== source && s.setLinkedHover(id));
    } else if (obj) {
      BHO.tooltip.move(ev);
    }
  }

  // ---- Lz-E decorations: forbidden region below the circular-orbit curve + labels
  function decorateLzE(g, x, y, sc) {
    const c = CAT.circular, n = c.Lz.length, Lmax = c.Lz[n - 1], bottom = -100;
    if (!g.node().__init) {
      g.node().__init = true;
      g.append("path").attr("class", "forbidden");
      g.append("line").attr("class", "zero-line");
      g.append("path").attr("class", "bound");
      g.append("path").attr("id", `${sc.id}-pro`).attr("fill", "none");
      g.append("path").attr("id", `${sc.id}-retro`).attr("fill", "none");
      for (const [key, text] of [["pro", "Prograde"], ["retro", "Retrograde"]]) {
        g.append("text").attr("class", `region-label ${key}`).attr("dy", 20)
          .append("textPath").attr("href", `#${sc.id}-${key}`).attr("text-anchor", "middle").text(text);
      }
    }
    const curve = [];
    for (let i = n - 1; i >= 0; i--) curve.push([-c.Lz[i], c.E[i]]);
    for (let i = 0; i < n; i++) curve.push([c.Lz[i], c.E[i]]);
    const line = d3.line().x((d) => x(d[0])).y((d) => y(d[1]));
    g.select(".forbidden").attr("d", line([[-Lmax, bottom], ...curve, [Lmax, bottom]]) + "Z");
    g.select(".bound").attr("d", line(curve));
    g.select(".zero-line").attr("x1", x(0)).attr("x2", x(0)).attr("y1", sc.m.top).attr("y2", sc.h - sc.m.bottom);

    // label paths follow the curve left-to-right; text centred at |Lz| = 0.5 like the paper figure
    for (const [key, sign] of [["pro", 1], ["retro", -1]]) {
      let pts = [];
      for (let i = 0; i < n; i++) if (c.Lz[i] > 0.05 && c.Lz[i] < 1.6) pts.push([sign * c.Lz[i], c.E[i]]);
      if (sign < 0) pts = pts.reverse();
      const sp = pts.map((p) => [x(p[0]), y(p[1])]);
      let len = 0, centre = 0, best = Infinity;
      for (let i = 0; i < sp.length; i++) {
        if (i) len += Math.hypot(sp[i][0] - sp[i - 1][0], sp[i][1] - sp[i - 1][1]);
        const dist = Math.abs(Math.abs(pts[i][0]) - 0.5);
        if (dist < best) { best = dist; centre = len; }
      }
      g.select(`#${sc.id}-${key}`).attr("d", d3.line()(sp));
      g.select(`.region-label.${key} textPath`).attr("startOffset", centre);
    }
  }

  // y range also covers the disc contours so they are not clipped when switched on
  const zmax = objects.map((o) => o.z_max)
    .concat(BHO.DISC_ORDER.flatMap((k) => CAT.discs?.[k]?.ecc_zmax.flatMap((l) => l.y) ?? []))
    .filter((v) => v > 0);
  const scatters = [];
  const lze = new BHO.Scatter(document.getElementById("plot-lze"), {
    x: (o) => o.Lz, y: (o) => o.E,
    xErr: (o) => o.Lz_err, yErr: (o) => o.E_err,
    xLabel: "Vertical angular momentum, L_{z} / L_{z,⊙}",
    yLabel: "Energy, E [10^{5} km^{2} s^{−2}]",
    xDomain: [-2, 2], yDomain: [-2.75, 0.05],
    decorate: decorateLzE,
    onHover: (o, ev) => onHover(lze, o, ev),
    onClick: (o) => select(o.id),
    ariaLabel: "Scatter plot of orbital energy against vertical angular momentum relative to the Sun's",
  });
  const ecc = new BHO.Scatter(document.getElementById("plot-ecc"), {
    x: (o) => o.ecc_gal, y: (o) => o.z_max,
    xErr: (o) => o.ecc_gal_err, yErr: (o) => o.z_max_err,
    xLabel: "Galactic orbital eccentricity, e",
    yLabel: "z_{max} [kpc]",
    xDomain: [-0.02, 1.02], yDomain: [d3.min(zmax) / 1.8, d3.max(zmax) * 1.8], yLog: true,
    onHover: (o, ev) => onHover(ecc, o, ev),
    onClick: (o) => select(o.id),
    ariaLabel: "Scatter plot of maximum height above the disc (log scale) against Galactic orbital eccentricity",
  });
  scatters.push(lze, ecc);
  scatters.forEach((s) => s.setData(objects));
  const discContours = (plane) => discs.map((k) => ({ key: k, lines: CAT.discs[k][plane] }));
  lze.setContours(discContours("Lz_E"));
  ecc.setContours(discContours("ecc_zmax"));

  document.getElementById("reset-zoom").addEventListener("click", () => scatters.forEach((s) => s.resetZoom()));

  // ---- search
  const search = document.getElementById("search");
  document.getElementById("object-names").innerHTML =
    objects.slice().sort(nameSort).map((o) => `<option value="${esc(o.name)}"></option>`).join("");
  function runSearch() {
    const q = search.value.trim().toLowerCase();
    if (!q) return;
    const hit = objects.find((o) => o.name.toLowerCase() === q) ||
      objects.slice().sort(nameSort).find((o) => o.name.toLowerCase().startsWith(q)) ||
      objects.slice().sort(nameSort).find((o) => o.name.toLowerCase().includes(q));
    if (hit) { select(hit.id, { scroll: true }); search.blur(); }
  }
  search.addEventListener("change", runSearch);
  search.addEventListener("keydown", (e) => { if (e.key === "Enter") runSearch(); });

  // ---- selection + detail panel
  async function select(id, { scroll = false, updateHash = true, autoplay = true } = {}) {
    const o = byId.get(id);
    if (!o) return;
    if (!state.visible[o.type]) { state.visible[o.type] = true; applyVisibility(); }
    state.selected = id;
    scatters.forEach((s) => s.setSelected(id));

    detailEl.querySelector(".detail-empty").hidden = true;
    detailBody.hidden = false;
    detailBody.querySelector(".detail-name").textContent = o.name;
    detailBody.querySelector(".detail-badges").innerHTML =
      BHO.typeBadge(o) + BHO.directionBadge(o) + BHO.populationBadge(o);
    detailBody.querySelector(".detail-actions").innerHTML =
      (o.type === "bh" ? `<a class="btn btn-sm btn-outline-main" href="#/gallery/${o.id}">Binary &amp; gallery view →</a>` : "") +
      `<button type="button" class="btn btn-sm btn-outline-main close-detail" aria-label="Clear selection" title="Clear selection">✕</button>`;
    detailBody.querySelector(".info-groups").innerHTML = BHO.infoGroupsHTML(o);
    if (updateHash) history.replaceState(null, "", `#/explore/${encodeURIComponent(id)}`);
    if (scroll) detailEl.scrollIntoView({ behavior: BHO.prefersReducedMotion() ? "auto" : "smooth", block: "start" });

    exploreViewer.setLoading();
    try {
      const orbit = await BHO.loadOrbit(id);
      if (state.selected === id) exploreViewer.show(o, orbit, { autoplay });
    } catch (err) {
      console.error(err);
      exploreViewer.el.querySelector(".ov-loading").textContent = "Sorry, this orbit could not be loaded.";
    }
  }

  function clearSelection() {
    state.selected = null;
    scatters.forEach((s) => s.setSelected(null));
    exploreViewer.pause();
    detailBody.hidden = true;
    detailEl.querySelector(".detail-empty").hidden = false;
    history.replaceState(null, "", "#/explore");
  }
  detailEl.addEventListener("click", (e) => { if (e.target.closest(".close-detail")) clearSelection(); });

  // ================================================================ gallery
  const galleryEl = document.getElementById("view-gallery");
  const galleryIndex = galleryEl.querySelector(".gallery-index");
  const bhDetail = galleryEl.querySelector(".bh-detail");
  const galleryViewer = new BHO.OrbitViewer(document.getElementById("gallery-orbit"));
  const binaryView = new BHO.BinaryView(galleryEl.querySelector(".binary-host"));
  const groupSel = document.getElementById("g-group");
  const sortSel = document.getElementById("g-sort");
  const scaleSel = document.getElementById("g-scale");

  // a "population" column (e.g. disc / halo) in data/gaia-bhs.ecsv is picked up automatically
  const hasPopulation = bhs.some((o) => o.population);
  groupSel.innerHTML = [
    '<option value="none">No grouping</option>',
    '<option value="direction">Orbit direction</option>',
    hasPopulation ? '<option value="population">Population</option>' : "",
  ].join("");
  const SORTS = {
    name: { label: "Name", fn: nameSort },
    Lz: { label: "Lz / Lz,⊙ (prograde first)", fn: (a, b) => b.Lz - a.Lz },
    z_max: { label: "Maximum height, z max", fn: (a, b) => a.z_max - b.z_max },
    ecc_gal: { label: "Galactic eccentricity", fn: (a, b) => a.ecc_gal - b.ecc_gal },
    E: { label: "Energy", fn: (a, b) => a.E - b.E },
    m_bh: { label: "Black hole mass", fn: (a, b) => b.m_bh - a.m_bh },
    distance: { label: "Distance", fn: (a, b) => a.distance - b.distance },
  };
  sortSel.innerHTML = Object.entries(SORTS).map(([k, s]) => `<option value="${k}">${s.label}</option>`).join("");
  [groupSel, sortSel, scaleSel].forEach((s) => s.addEventListener("change", renderGallery));

  const sortedBHs = () => bhs.slice().sort((a, b) => SORTS[sortSel.value].fn(a, b) || nameSort(a, b));

  function groupsFor(list) {
    const mode = groupSel.value;
    if (mode === "direction") {
      return [
        { title: "Prograde", note: "L<sub>z</sub> / L<sub>z,⊙</sub> &gt; 0 · rotating with the disc", items: list.filter((o) => o.direction === "prograde") },
        { title: "Retrograde", note: "L<sub>z</sub> / L<sub>z,⊙</sub> &lt; 0 · counter-rotating", items: list.filter((o) => o.direction === "retrograde") },
      ].filter((g) => g.items.length);
    }
    if (mode === "population") {
      const keys = [...new Set(list.map((o) => o.population || "Unclassified"))];
      return keys.map((k) => ({ title: k, note: "", items: list.filter((o) => (o.population || "Unclassified") === k) }));
    }
    return [{ title: "All black holes", note: "", items: list }];
  }

  async function renderGallery() {
    const list = sortedBHs();
    const host = document.getElementById("gallery-groups");
    host.innerHTML = groupsFor(list).map((g) => `
      <section class="group">
        <div class="group-head"><h2>${esc(g.title)} <span class="muted">(${g.items.length})</span></h2><p>${g.note}</p></div>
        <div class="cards">${g.items.map(cardHTML).join("")}</div>
      </section>`).join("");

    const orbits = await Promise.all(bhs.map((o) => BHO.loadOrbit(o.id).catch(() => null)));
    const byOrbit = new Map(bhs.map((o, i) => [o.id, orbits[i]]));
    const ext = orbits.filter(Boolean).map((o) => BHO.orbitExtent(o));
    const shared = { L: d3.max(ext, (e) => e.L), Lz: d3.max(ext, (e) => e.Lz) };
    host.querySelectorAll("svg.thumb").forEach((svg) => {
      const orbit = byOrbit.get(svg.dataset.id);
      if (!orbit) return;
      const e = scaleSel.value === "shared" ? shared : BHO.orbitExtent(orbit);
      BHO.drawThumbnail(svg, orbit, e.L, e.Lz);
    });
  }

  function cardHTML(o) {
    const stat = (dt, dd) => `<div><dt>${dt}</dt><dd>${dd}</dd></div>`;
    return `<a class="bh-card" href="#/gallery/${o.id}" aria-label="${esc(o.name)}: open orbit and binary details">
      <div class="card-head"><h3>${esc(o.name)}</h3><div class="detail-badges">${BHO.directionBadge(o)}${BHO.populationBadge(o)}</div></div>
      <svg class="thumb" data-id="${o.id}" role="img" aria-label="Orbit of ${esc(o.name)} in the X–Y and X–Z planes"></svg>
      <dl class="card-stats">
        ${stat("z<sub>max</sub>", BHO.withErrHTML(o.z_max, o.z_max_err, (v) => BHO.sig(v, 2), " kpc"))}
        ${stat("e", BHO.withErrHTML(o.ecc_gal, o.ecc_gal_err, (v) => BHO.fmt(v, 2)))}
        ${stat("L<sub>z</sub>/L<sub>z,⊙</sub>", BHO.withErrHTML(o.Lz, o.Lz_err, (v) => BHO.fmt(v, 2)))}
        ${stat("M<sub>BH</sub>", `${BHO.sig(o.m_bh, 3)} M<sub>⊙</sub>`)}
      </dl>
    </a>`;
  }

  async function showBH(id) {
    const o = byId.get(id);
    if (!o || o.type !== "bh") { location.hash = "#/gallery"; return; }
    galleryIndex.hidden = true;
    bhDetail.hidden = false;
    bhDetail.querySelector(".detail-name").textContent = o.name;
    bhDetail.querySelector(".detail-badges").innerHTML = BHO.directionBadge(o) + BHO.populationBadge(o) +
      `<a class="pill pill-link" href="#/explore/${o.id}">Show in explorer →</a>`;
    bhDetail.querySelector(".info-groups").innerHTML = BHO.infoGroupsHTML(o);
    const list = sortedBHs(), i = list.findIndex((b) => b.id === id);
    const prev = list[(i - 1 + list.length) % list.length], next = list[(i + 1) % list.length];
    bhDetail.querySelector(".pager").innerHTML = list.length > 1
      ? `<a class="btn btn-sm btn-outline-main" href="#/gallery/${prev.id}">‹ ${esc(prev.name)}</a><a class="btn btn-sm btn-outline-main" href="#/gallery/${next.id}">${esc(next.name)} ›</a>` : "";
    window.scrollTo(0, 0);
    binaryView.show(o);
    galleryViewer.setLoading();
    try {
      const orbit = await BHO.loadOrbit(id);
      galleryViewer.show(o, orbit, { autoplay: true });
    } catch (err) {
      console.error(err);
    }
  }

  // ================================================================ routing
  let galleryRendered = false;
  function route() {
    const parts = location.hash.replace(/^#\/?/, "").split("/").map(decodeURIComponent);
    const view = parts[0] === "explore" ? "explore" : "gallery";  // the gallery is the landing view
    document.querySelectorAll(".view-tabs a").forEach((a) => {
      a.classList.toggle("active", a.dataset.view === view);
      if (a.dataset.view === view) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    });
    exploreEl.hidden = view !== "explore";
    galleryEl.hidden = view !== "gallery";
    BHO.tooltip.hide();

    if (view === "explore") {
      galleryViewer.pause();
      binaryView.stop();
      const id = parts[1];
      if (id && byId.has(id)) { if (id !== state.selected) select(id, { updateHash: false }); }
      else if (!state.selected && bhs.length) select(bhs[0].id, { updateHash: false });
    } else {
      exploreViewer.pause();
      if (parts[1]) {
        showBH(parts[1]);
      } else {
        galleryViewer.pause();
        binaryView.stop();
        bhDetail.hidden = true;
        galleryIndex.hidden = false;
        if (!galleryRendered) { galleryRendered = true; renderGallery(); }
      }
    }
  }
  window.addEventListener("hashchange", route);

  // integration length in the footer comes from the exported data
  const intEl = document.getElementById("integration-length");
  if (intEl) intEl.textContent = `${d3.format("~g")(CAT.meta.integration_Myr / 1000)} Gyr`;

  applyVisibility();
  route();
})();
