// Interactive BH mass distribution for the Galactic Underworld paper.
//
// Data: data/underworld/bh-mass.h5 holds, per model, a flattened 4-D histogram
//   counts[pop, esc, mass_bin, z_bin]   (C-order)
//     pop: 0 = binary (sep>0), 1 = merger (sep==0), 2 = disruption (sep==-1)
//     esc: 0 = bound, 1 = escaped
// Every control is a cheap reduction of this array computed in the browser:
//   - |z| range  -> sum over a contiguous range of z bins
//   - escaped    -> pick/sum the esc axis
//   - stacked    -> keep the 3 pop slices; "Total" collapses them into one bar
//   - model      -> swap the model's slice (mass bins are shared, so bars tween)

// ---- colours -------------------------------------------------------------
const POP_COLOURS = ['#d1495b', '#edae49', '#8a6fd4'] // binary / merger / disruption
const POP_LABELS = ['Binary at present day', 'Isolated (merger)', 'Isolated (disruption)']

// ---- state ---------------------------------------------------------------
const state = {
    model: 'fiducial',
    escMode: 'both', // 'both' | 'bound' | 'escaped'
    stacked: true,
    logY: false,
    normalised: false, // false = counts, true = probability density
    scaleMode: 'mw', // 'mw' | 'raw'
    loEdge: 0, // lower |z| edge index
    hiEdge: null, // upper |z| edge index (set to nZ once data loads)
    yRange: [0, 1], // current y-axis range (kept fixed across model switches)
    cdfSplit: false, // |z| CDF: false = combined curve, true = split by channel
}

// last y-axis range pushed to the plot, and the in-flight animation frame id.
let lastYRange = null
let rafId = null
let cdfPlotCreated = false
let cdfRaf = null

// ---- data (filled once loaded) -------------------------------------------
const D = {
    massCentres: null,
    massWidths: null,
    zEdges: null,
    scaleToMw: 1,
    modelNames: [],
    modelLabels: [],
    modelCategories: [],
    counts: {}, // model -> flat typed array
    nMass: 0,
    nZ: 0,
}

let plotCreated = false

// -------------------------------------------------------------------------
fetch('../../data/underworld/bh-mass.h5')
    .then((r) => r.arrayBuffer())
    .then((buffer) => {
        const f = new hdf5.File(buffer, 'bh-mass.h5')
        loadData(f)
        buildSwitcher()
        wireControls()
        recomputeYRange()
        render(false)
        renderCDF(false)
    })
    .catch((err) => {
        console.error('Failed to load bh-mass.h5', err)
        document.getElementById('bh-mass').innerHTML =
            '<p class="text-center mt-5">Could not load the black hole data. Please try refreshing.</p>'
    })

function toStrings(val) {
    // jsfive returns fixed-length (S64/S128) string datasets null-padded, e.g.
    // "fiducial" comes back with trailing NUL bytes; strip them (keep real spaces).
    const arr = Array.isArray(val) ? val : [val]
    return arr.map((s) => String(s).replace(new RegExp(String.fromCharCode(0), 'g'), ''))
}

function loadData(f) {
    D.massCentres = Array.from(f.get('mass_bin_centres').value)
    D.massWidths = Array.from(f.get('mass_bin_widths').value)
    D.zEdges = Array.from(f.get('z_bin_edges').value)
    D.nMass = D.massCentres.length
    D.nZ = D.zEdges.length - 1
    D.scaleToMw = f.get('/').attrs['scale_to_mw'] || f.attrs?.['scale_to_mw'] || 1

    D.modelNames = toStrings(f.get('model_names').value)
    D.modelLabels = toStrings(f.get('model_labels').value)
    D.modelCategories = toStrings(f.get('model_categories').value)

    D.modelNames.forEach((name) => {
        D.counts[name] = f.get('counts/' + name).value
    })

    state.model = D.modelNames[0]
    state.hiEdge = D.nZ
    state.loEdge = 0
}

// ---- reduction: counts -> per-population y arrays ------------------------
// Sum the 4-D histogram for `modelName` over the current escaped filter and
// |z| range, returning three per-mass-bin arrays (binary / merger / disruption).
function reduceModel(modelName) {
    const { nMass, nZ } = D
    const flat = D.counts[modelName]
    const escList = state.escMode === 'both' ? [0, 1] : state.escMode === 'bound' ? [0] : [1]
    const scale = state.scaleMode === 'mw' ? D.scaleToMw : 1
    const lo = state.loEdge
    const hi = state.hiEdge // bins lo .. hi-1 are included

    const yByPop = [new Array(nMass).fill(0), new Array(nMass).fill(0), new Array(nMass).fill(0)]
    for (let p = 0; p < 3; p++) {
        for (let m = 0; m < nMass; m++) {
            let s = 0
            for (const e of escList) {
                const base = ((p * 2 + e) * nMass + m) * nZ
                for (let z = lo; z < hi; z++) {
                    s += flat[base + z]
                }
            }
            yByPop[p][m] = s * scale
        }
    }
    return yByPop
}

// Normalise so the whole distribution integrates to 1 (probability density).
// Divides by the grand total across all three populations, so a stacked view
// still sums to the overall density and each model is directly comparable.
function normaliseInPlace(yByPop) {
    let total = 0
    for (let p = 0; p < 3; p++) for (let m = 0; m < D.nMass; m++) total += yByPop[p][m]
    if (total <= 0) return
    for (let p = 0; p < 3; p++) {
        for (let m = 0; m < D.nMass; m++) {
            yByPop[p][m] = yByPop[p][m] / (total * D.massWidths[m])
        }
    }
}

// Decide the y-axis range for the current mode.
//  - counts:     fit the CURRENT model so it fills the plot (refits per model,
//                but the range is animated so the change is smooth, not a snap).
//  - normalised: fit the tallest of ALL models for the current filter, so the
//                axis stays FIXED across model switches (the point of this mode).
function recomputeYRange() {
    const models = state.normalised ? D.modelNames : [state.model]
    let gmax = 0
    for (const name of models) {
        const yByPop = reduceModel(name)
        if (state.normalised) normaliseInPlace(yByPop)
        for (let m = 0; m < D.nMass; m++) {
            const col = yByPop[0][m] + yByPop[1][m] + yByPop[2][m]
            if (col > gmax) gmax = col
        }
    }
    gmax = gmax > 0 ? gmax : 1
    state.yRange = state.logY ? [Math.log10(gmax / 1e4), Math.log10(gmax * 1.6)] : [0, gmax * 1.1]
}

function computeTraces() {
    const yByPop = reduceModel(state.model)
    if (state.normalised) normaliseInPlace(yByPop)
    const x = D.massCentres
    const w = D.massWidths
    const valFmt = state.normalised ? '%{y:.3f}' : '%{y:,.0f}'
    const unit = state.normalised ? ' /M<sub>☉</sub>' : ' BHs'

    if (state.stacked) {
        return [0, 1, 2].map((p) => ({
            x: x,
            y: yByPop[p],
            width: w,
            type: 'bar',
            name: POP_LABELS[p],
            marker: { color: POP_COLOURS[p], line: { width: 0 } },
            showlegend: true,
            hovertemplate: POP_LABELS[p] + '<br>' + valFmt + unit + '<extra></extra>',
        }))
    }

    // Total mode: everything in trace 0, traces 1 & 2 zeroed (keeps 3 traces so
    // switching to/from stacked mode tweens smoothly).
    const total = D.massCentres.map((_, m) => yByPop[0][m] + yByPop[1][m] + yByPop[2][m])
    const zeros = new Array(D.nMass).fill(0)
    const allColour = darkMode() ? '#e6e6e6' : '#333'
    return [
        {
            x: x,
            y: total,
            width: w,
            type: 'bar',
            name: 'All BHs',
            marker: { color: allColour, line: { width: 0 } },
            showlegend: true,
            hovertemplate: 'All BHs<br>' + valFmt + unit + '<extra></extra>',
        },
        { x: x, y: zeros, width: w, type: 'bar', name: '', marker: { color: allColour }, showlegend: false, hoverinfo: 'skip' },
        { x: x, y: zeros, width: w, type: 'bar', name: '', marker: { color: allColour }, showlegend: false, hoverinfo: 'skip' },
    ]
}

function darkMode() {
    const cb = document.getElementById('dark-mode-checkbox')
    return cb ? cb.checked : false
}

function yTitle() {
    if (state.normalised) return 'Probability density'
    return state.scaleMode === 'mw' ? 'Number of BHs in the Milky Way' : 'Number of BHs (simulated)'
}

// ---- rendering -----------------------------------------------------------
// The plot's layout is created ONCE. Updates only push trace data (and the
// y-axis range, and only when it actually changed). This keeps the x-axis zoom
// intact between clicks and lets bar heights tween without a snap.
function render(smooth) {
    const traces = computeTraces()

    if (!plotCreated) {
        const dark = darkMode()
        const layout = {
            barmode: 'stack',
            bargap: 0.0,
            bargroupgap: 0.0,
            title: '',
            margin: { t: 20, r: 20, b: 70, l: 90 },
            xaxis: {
                title: { text: '$m_{\\rm BH} \\; [{\\rm M_\\odot}]$', standoff: 12, font: { size: fs } },
                range: [2, 60],
                tickfont: { size: 0.8 * fs },
            },
            yaxis: {
                title: { text: yTitle(), standoff: 12, font: { size: fs } },
                type: state.logY ? 'log' : 'linear',
                range: state.yRange.slice(),
                tickfont: { size: 0.8 * fs },
                rangemode: 'tozero',
            },
            legend: { x: 0.98, y: 0.98, xanchor: 'right', yanchor: 'top', orientation: 'v' },
            paper_bgcolor: dark ? '#333' : 'white',
            plot_bgcolor: dark ? '#333' : 'white',
            font: { color: dark ? 'white' : '#333' },
        }
        const config = {
            responsive: true,
            modeBarButtonsToRemove: ['zoomIn2d', 'zoomOut2d', 'select2d', 'lasso2d', 'autoScale2d'],
            displaylogo: false,
        }
        Plotly.newPlot('bh-mass', traces, layout, config).then(() => {
            plotCreated = true
        })
        lastYRange = state.yRange.join(',')
        return
    }

    // Non-animatable trace props (colour/name/legend/hover) are applied instantly.
    Plotly.restyle('bh-mass', {
        'marker.color': traces.map((t) => t.marker.color),
        name: traces.map((t) => t.name),
        showlegend: traces.map((t) => t.showlegend),
        hovertemplate: traces.map((t) => t.hovertemplate || false),
    })

    const gd = document.getElementById('bh-mass')
    const fromY = gd.data.map((t) => Array.from(t.y))
    const toY = traces.map((t) => t.y)
    const fromR = gd.layout.yaxis.range.slice()
    const toR = state.yRange.slice()
    lastYRange = toR.join(',')

    // We hand-roll the tween (bar heights AND y-axis range together) because
    // Plotly.animate snaps the axis range at the end instead of interpolating it.
    if (rafId) cancelAnimationFrame(rafId)
    const dur = smooth ? 500 : 0
    if (dur <= 0) {
        Plotly.update('bh-mass', { y: toY }, { 'yaxis.range': toR })
        return
    }
    const start = performance.now()
    const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
    function step(now) {
        const p = Math.min(1, (now - start) / dur)
        const e = ease(p)
        const y = toY.map((arr, ti) => arr.map((v, i) => fromY[ti][i] + (v - fromY[ti][i]) * e))
        const r = [fromR[0] + (toR[0] - fromR[0]) * e, fromR[1] + (toR[1] - fromR[1]) * e]
        Plotly.update('bh-mass', { y: y }, { 'yaxis.range': r })
        rafId = p < 1 ? requestAnimationFrame(step) : null
    }
    rafId = requestAnimationFrame(step)
}

// Relayout the non-animatable axis attributes (type + title) after a mode change.
function applyAxisStyle() {
    if (!plotCreated) return
    Plotly.relayout('bh-mass', {
        'yaxis.type': state.logY ? 'log' : 'linear',
        'yaxis.title.text': yTitle(),
    })
}

// expose for the dark-mode toggle in general.js
window.rerenderBHMass = function () {
    if (plotCreated) render(false)
}

// ==========================================================================
// |z| CUMULATIVE DISTRIBUTION (Figure 4) -- companion plot below the histogram
// Reuses the same counts[pop, esc, mass, z] array: marginalise over mass to get
// the |z| distribution per channel, then form the cumulative fraction. Shares
// the model + escapee selection with the histogram above.
// ==========================================================================

function escList() {
    return state.escMode === 'both' ? [0, 1] : state.escMode === 'bound' ? [0] : [1]
}

// Per-channel |z| histograms (summed over the escapee filter and all masses).
function zHistByPop(modelName) {
    const flat = D.counts[modelName]
    const { nMass, nZ } = D
    const escArr = escList()
    const byPop = [new Array(nZ).fill(0), new Array(nZ).fill(0), new Array(nZ).fill(0)]
    for (let p = 0; p < 3; p++) {
        const arr = byPop[p]
        for (const e of escArr) {
            for (let m = 0; m < nMass; m++) {
                const base = ((p * 2 + e) * nMass + m) * nZ
                for (let z = 0; z < nZ; z++) arr[z] += flat[base + z]
            }
        }
    }
    return byPop
}

// Cumulative fraction aligned with zEdges[1..nZ] (drop the leading 0 edge so the
// curve starts at the first positive |z| for the log x-axis).
function toCDF(zHist) {
    const total = zHist.reduce((a, b) => a + b, 0)
    const y = new Array(D.nZ)
    let c = 0
    for (let z = 0; z < D.nZ; z++) {
        c += zHist[z]
        y[z] = total > 0 ? c / total : null
    }
    return y
}

// Effective scale height: the |z| at which the combined CDF reaches 1 - 1/e,
// interpolated in log-space (matches the paper's h_z,eff definition).
function combinedScaleHeight() {
    const byPop = zHistByPop(state.model)
    const tot = byPop[0].map((_, z) => byPop[0][z] + byPop[1][z] + byPop[2][z])
    const cdf = toCDF(tot)
    const target = 1 - 1 / Math.E
    const x = D.zEdges.slice(1)
    for (let k = 1; k < cdf.length; k++) {
        if (cdf[k - 1] != null && cdf[k] != null && cdf[k - 1] < target && cdf[k] >= target) {
            const lx0 = Math.log10(x[k - 1]),
                lx1 = Math.log10(x[k])
            const f = (target - cdf[k - 1]) / (cdf[k] - cdf[k - 1])
            return Math.pow(10, lx0 + f * (lx1 - lx0))
        }
    }
    return null
}

// Always three traces (like the histogram) so transitions tween cleanly. Every
// trace carries real (numeric) y so there is never a null->number interpolation:
//  - combined: trace 0 = summed CDF (dark line); traces 1 & 2 hidden.
//  - split:    trace 0 = binary CDF; traces 1 & 2 = merger / disruption, shown.
function computeCDFTraces() {
    const x = D.zEdges.slice(1)
    const byPop = zHistByPop(state.model)
    const tot = byPop[0].map((_, z) => byPop[0][z] + byPop[1][z] + byPop[2][z])
    const split = state.cdfSplit
    const line = (y, color, name, show, vis) => ({
        x: x,
        y: y,
        type: 'scatter',
        mode: 'lines',
        line: { color: color, width: 3 },
        name: name,
        showlegend: show,
        visible: vis,
        hovertemplate: name + ': %{y:.1%} within |z|<%{x:.2f} kpc<extra></extra>',
    })
    return [
        line(toCDF(split ? byPop[0] : tot), split ? POP_COLOURS[0] : darkMode() ? '#e6e6e6' : '#333', split ? POP_LABELS[0] : 'All BHs', split, true),
        line(toCDF(byPop[1]), POP_COLOURS[1], POP_LABELS[1], split, split),
        line(toCDF(byPop[2]), POP_COLOURS[2], POP_LABELS[2], split, split),
    ]
}

function renderCDF(smooth) {
    const dark = darkMode()
    const traces = computeCDFTraces()
    const hz = combinedScaleHeight()
    const bandX0 = Math.max(D.zEdges[state.loEdge], D.zEdges[1] * 0.8)
    const bandX1 = Math.min(D.zEdges[state.hiEdge], 300)

    if (!cdfPlotCreated) {
        const config = {
            responsive: true,
            modeBarButtonsToRemove: ['zoomIn2d', 'zoomOut2d', 'select2d', 'lasso2d', 'autoScale2d'],
            displaylogo: false,
        }
        Plotly.newPlot('bh-z-cdf', traces, cdfLayout(dark, hz, bandX0, bandX1), config).then(() => {
            cdfPlotCreated = true
        })
        return
    }

    // instant, non-tweenable props (visibility / colour / legend)
    Plotly.restyle('bh-z-cdf', {
        visible: traces.map((t) => t.visible),
        'line.color': traces.map((t) => t.line.color),
        name: traces.map((t) => t.name),
        showlegend: traces.map((t) => t.showlegend),
    })
    Plotly.relayout('bh-z-cdf', {
        'shapes[1].x0': bandX0,
        'shapes[1].x1': bandX1,
        'annotations[0].text': hz ? `Scale height ≈ ${fmtZ(hz)} kpc` : '',
        'annotations[0].x': hz ? Math.log10(hz) : 0,
        showlegend: state.cdfSplit,
    })

    // Hand-rolled tween of the curve y-values (Plotly.animate doesn't reliably
    // commit line data here; Plotly.restyle per frame does, same as the histogram).
    const gd = document.getElementById('bh-z-cdf')
    const fromY = gd.data.map((t) => Array.from(t.y))
    const toY = traces.map((t) => t.y)
    if (cdfRaf) cancelAnimationFrame(cdfRaf)
    const dur = smooth ? 500 : 0
    if (dur <= 0) {
        Plotly.restyle('bh-z-cdf', { y: toY }, [0, 1, 2])
        return
    }
    const start = performance.now()
    const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
    function step(now) {
        const e = ease(Math.min(1, (now - start) / dur))
        const y = toY.map((arr, ti) => arr.map((v, i) => (typeof v === 'number' && typeof fromY[ti][i] === 'number' ? fromY[ti][i] + (v - fromY[ti][i]) * e : v)))
        Plotly.restyle('bh-z-cdf', { y: y }, [0, 1, 2])
        cdfRaf = (now - start) / dur < 1 ? requestAnimationFrame(step) : null
    }
    cdfRaf = requestAnimationFrame(step)
}

function cdfLayout(dark, hz, bandX0, bandX1) {
    const grey = dark ? '#666' : '#bbb'
    const anti = dark ? 'white' : '#333'
    const target = 1 - 1 / Math.E
    return {
        margin: { t: 20, r: 20, b: 60, l: 70 },
        xaxis: {
            title: { text: '$|z| \\; [{\\rm kpc}]$', standoff: 10, font: { size: fs } },
            type: 'log',
            range: [Math.log10(0.01), Math.log10(200)],
            tickfont: { size: 0.8 * fs },
        },
        yaxis: {
            title: { text: 'Cumulative fraction of BHs', standoff: 10, font: { size: 0.9 * fs } },
            range: [0, 1.03],
            tickfont: { size: 0.8 * fs },
        },
        shapes: [
            { type: 'line', xref: 'paper', x0: 0, x1: 1, yref: 'y', y0: target, y1: target, line: { color: grey, width: 1.5, dash: 'dot' } },
            { type: 'rect', xref: 'x', x0: bandX0, x1: bandX1, yref: 'paper', y0: 0, y1: 1, fillcolor: 'var(--primary)', opacity: 0.12, line: { width: 0 } },
        ],
        annotations: [
            { x: hz ? Math.log10(hz) : 0, y: 0.06, xref: 'x', yref: 'paper', text: hz ? `Scale height ≈ ${fmtZ(hz)} kpc` : '', showarrow: false, font: { size: 0.8 * fs, color: anti }, bgcolor: dark ? 'rgba(51,51,51,0.7)' : 'rgba(255,255,255,0.7)' },
            { xref: 'paper', yref: 'y', x: 0.01, y: target, yanchor: 'bottom', text: '$1 - 1/e$', showarrow: false, font: { size: 0.7 * fs, color: grey } },
        ],
        legend: { x: 0.98, y: 0.02, xanchor: 'right', yanchor: 'bottom' },
        showlegend: state.cdfSplit,
        paper_bgcolor: dark ? '#333' : 'white',
        plot_bgcolor: dark ? '#333' : 'white',
        font: { color: anti },
    }
}

// Update just the shaded |z| band when the histogram's range slider moves.
function updateCdfBand() {
    if (!cdfPlotCreated) return
    Plotly.relayout('bh-z-cdf', {
        'shapes[1].x0': Math.max(D.zEdges[state.loEdge], D.zEdges[1] * 0.8),
        'shapes[1].x1': Math.min(D.zEdges[state.hiEdge], 300),
    })
}

window.rerenderBHCDF = function () {
    if (cdfPlotCreated) renderCDF(false)
}

// ---- model switcher (grouped by category) --------------------------------
function buildSwitcher() {
    const container = document.getElementById('bh-model-switcher').querySelector('.row')
    let lastCat = null
    const catColours = ['var(--primary)', '#6ec42d', '#d1495b', '#f68e1e', '#5b86cb', '#00bcd4']
    let catIndex = -1
    const row = document.createElement('div')
    row.className = 'col-12'
    // row.setAttribute('data-cat', cat)
    container.appendChild(row)

    D.modelNames.forEach((name, i) => {
        const cat = D.modelCategories[i]
        if (cat !== lastCat) {
            catIndex++
            lastCat = cat
        }
        const row = container.lastChild
        const btn = document.createElement('button')
        btn.className = 'btn sn-dists-btn'
        btn.style.backgroundColor = catColours[catIndex % catColours.length]
        btn.style.color = 'white'
        btn.setAttribute('id', 'bh-model-' + name)
        btn.innerHTML = D.modelLabels[i]
        if (name === state.model) btn.classList.add('active')
        btn.addEventListener('click', function () {
            state.model = name
            document.querySelectorAll('#bh-model-switcher .sn-dists-btn').forEach((e) => e.classList.remove('active'))
            this.classList.add('active')
            recomputeYRange() // counts: refit this model; normalised: unchanged (fixed)
            render(true) // smooth transition between models
            renderCDF(true)
        })
        row.appendChild(btn)
    })

    if (window.MathJax && MathJax.Hub) {
        MathJax.Hub.Queue(['Typeset', MathJax.Hub, container])
    }
}

// ---- other controls ------------------------------------------------------
// The Milky Way / Simulated scaling has no effect once the histogram is
// normalised, so grey those buttons out in that mode.
function updateScaleButtons() {
    ;['bh-scale-mw', 'bh-scale-raw'].forEach((id) => {
        const b = document.getElementById(id)
        if (!b) return
        b.disabled = state.normalised
        b.classList.toggle('disabled', state.normalised)
    })
}

function fmtZ(kpc) {
    if (kpc >= 1000) return '∞'
    if (kpc === 0) return '0'
    if (kpc < 0.1) return kpc.toFixed(3)
    if (kpc < 10) return kpc.toFixed(2)
    return kpc.toFixed(1)
}

function updateZLabels() {
    const lo = D.zEdges[state.loEdge]
    const hi = D.zEdges[state.hiEdge]
    document.getElementById('bh-z-range-label').innerHTML = `${fmtZ(lo)} &le; |z| &lt; ${fmtZ(hi)} kpc`
}

// Position the fill and the two value bubbles for the dual-handle slider.
// Handle centres travel across (100% - thumbWidth) + half a thumb, so we use a
// calc() offset (thumb = 36px) that stays correct at any container width.
function updateZUI() {
    const loFrac = state.loEdge / D.nZ
    const hiFrac = state.hiEdge / D.nZ
    const pos = (frac) => `calc(${frac} * (100% - 36px) + 18px)`
    const fill = document.getElementById('bh-z-fill')
    fill.style.left = pos(loFrac)
    fill.style.width = `calc(${hiFrac - loFrac} * (100% - 36px))`
    const loB = document.getElementById('bh-z-lo-bubble')
    const hiB = document.getElementById('bh-z-hi-bubble')
    loB.style.left = pos(loFrac)
    hiB.style.left = pos(hiFrac)
    loB.innerText = fmtZ(D.zEdges[state.loEdge])
    hiB.innerText = fmtZ(D.zEdges[state.hiEdge])
    updateZLabels()
}

function wireControls() {
    // stacked / total
    const stackBtn = document.getElementById('bh-stacked')
    const totalBtn = document.getElementById('bh-total')
    totalBtn.addEventListener('click', function () {
        state.stacked = false
        totalBtn.classList.add('active')
        stackBtn.classList.remove('active')
        render(true)
    })
    stackBtn.addEventListener('click', function () {
        state.stacked = true
        stackBtn.classList.add('active')
        totalBtn.classList.remove('active')
        render(true)
    })

    // escaped filter (changes the distribution -> refit the y-axis)
    document.querySelectorAll('#bh-esc-switcher button').forEach((btn) => {
        btn.addEventListener('click', function () {
            state.escMode = this.getAttribute('data-esc')
            document.querySelectorAll('#bh-esc-switcher button').forEach((e) => e.classList.remove('active'))
            this.classList.add('active')
            recomputeYRange()
            render(true)
            renderCDF(true)
        })
    })

    // |z| CDF: combined curve vs split by channel
    const cdfAllBtn = document.getElementById('bh-cdf-all')
    const cdfSplitBtn = document.getElementById('bh-cdf-split')
    if (cdfAllBtn && cdfSplitBtn) {
        cdfAllBtn.addEventListener('click', function () {
            state.cdfSplit = false
            cdfAllBtn.classList.add('active')
            cdfSplitBtn.classList.remove('active')
            renderCDF(true)
        })
        cdfSplitBtn.addEventListener('click', function () {
            state.cdfSplit = true
            cdfSplitBtn.classList.add('active')
            cdfAllBtn.classList.remove('active')
            renderCDF(true)
        })
    }

    // y-scale (linear / log)
    const linBtn = document.getElementById('bh-linear')
    const logBtn = document.getElementById('bh-log')
    linBtn.addEventListener('click', function () {
        state.logY = false
        linBtn.classList.add('active')
        logBtn.classList.remove('active')
        applyAxisStyle()
        recomputeYRange()
        render(false)
    })
    logBtn.addEventListener('click', function () {
        state.logY = true
        logBtn.classList.add('active')
        linBtn.classList.remove('active')
        applyAxisStyle()
        recomputeYRange()
        render(false)
    })

    // counts vs normalised (probability density)
    const absBtn = document.getElementById('bh-abs')
    const normBtn = document.getElementById('bh-norm')
    absBtn.addEventListener('click', function () {
        state.normalised = false
        absBtn.classList.add('active')
        normBtn.classList.remove('active')
        updateScaleButtons()
        applyAxisStyle()
        recomputeYRange()
        render(true)
    })
    normBtn.addEventListener('click', function () {
        state.normalised = true
        normBtn.classList.add('active')
        absBtn.classList.remove('active')
        updateScaleButtons()
        applyAxisStyle()
        recomputeYRange()
        render(true)
    })

    // scaling (Milky Way total vs raw simulated counts) -- irrelevant when normalised
    const mwBtn = document.getElementById('bh-scale-mw')
    const rawBtn = document.getElementById('bh-scale-raw')
    mwBtn.addEventListener('click', function () {
        state.scaleMode = 'mw'
        mwBtn.classList.add('active')
        rawBtn.classList.remove('active')
        applyAxisStyle()
        recomputeYRange()
        render(false)
    })
    rawBtn.addEventListener('click', function () {
        state.scaleMode = 'raw'
        rawBtn.classList.add('active')
        mwBtn.classList.remove('active')
        applyAxisStyle()
        recomputeYRange()
        render(false)
    })

    // |z| dual-handle range slider (two inputs sharing one 0..nZ edge scale)
    const loSlider = document.getElementById('bh-z-lo')
    const hiSlider = document.getElementById('bh-z-hi')
    loSlider.min = 0
    loSlider.max = D.nZ
    loSlider.value = 0
    hiSlider.min = 0
    hiSlider.max = D.nZ
    hiSlider.value = D.nZ

    function onLo() {
        let lo = parseInt(loSlider.value)
        const hi = parseInt(hiSlider.value)
        if (lo >= hi) {
            lo = hi - 1 // keep at least one bin; don't cross the upper handle
            loSlider.value = lo
        }
        state.loEdge = lo
        updateZUI()
        updateCdfBand()
        recomputeYRange()
        render(false)
    }
    function onHi() {
        let hi = parseInt(hiSlider.value)
        const lo = parseInt(loSlider.value)
        if (hi <= lo) {
            hi = lo + 1
            hiSlider.value = hi
        }
        state.hiEdge = hi
        updateZUI()
        updateCdfBand()
        recomputeYRange()
        render(false)
    }
    loSlider.addEventListener('input', onLo)
    hiSlider.addEventListener('input', onHi)
    updateZUI()
}
