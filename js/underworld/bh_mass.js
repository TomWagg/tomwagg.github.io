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
// median-line colours: darkened channel hues (visible over the stacked bars),
// plus a contrasting accent for the single "Total" median line.
const MEDIAN_SPLIT = ['#7a1f30', '#c98511', '#4821bb']
const MEDIAN_COMBINED = '#5b6ee1'

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
let piesCreated = false
let pieRaf = null

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
        renderPies(false)
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

// Median BH mass of a per-bin histogram, interpolated within the crossing bin so
// it moves smoothly as the distribution shifts. Returns null for an empty set.
function medianMass(y) {
    let total = 0
    for (let m = 0; m < y.length; m++) total += y[m]
    if (total <= 0) return null
    const half = total / 2
    let c = 0
    for (let m = 0; m < y.length; m++) {
        if (c + y[m] >= half) {
            const frac = y[m] > 0 ? (half - c) / y[m] : 0
            return D.massCentres[m] - D.massWidths[m] / 2 + frac * D.massWidths[m]
        }
        c += y[m]
    }
    return D.massCentres[D.massCentres.length - 1]
}

// Target x-position, visibility and colour of the three median lines for the
// current view: one line at the total median (Total), or one per channel (Split).
function medianTargets() {
    const t = computeTraces()
    let x
    if (state.stacked) {
        x = [medianMass(t[0].y), medianMass(t[1].y), medianMass(t[2].y)]
    } else {
        const mc = medianMass(t[0].y)
        x = [mc, mc, mc] // hidden lines 1&2 sit on the total median, so they fan out on Split
    }
    return {
        x: x,
        visible: state.stacked ? [true, true, true] : [true, false, false],
        colour: state.stacked ? MEDIAN_SPLIT : [MEDIAN_COMBINED, MEDIAN_SPLIT[1], MEDIAN_SPLIT[2]],
    }
}

function medianShape(x, colour, visible) {
    return { type: 'line', xref: 'x', x0: x, x1: x, yref: 'paper', y0: 0, y1: 1, line: { color: colour, width: 3, dash: '-' }, visible: visible, layer: 'above' }
}

// Median value label, e.g. "7.1 M⊙".
function medLabel(x) {
    return `${x.toFixed(1)} M<sub>☉</sub>`
}

// Stagger the label y-heights (paper coords) so medians that sit close together
// in mass don't overlap: sort the visible ones by x and step downward within a
// cluster of nearby values.
function annotationYLevels(xs, visible) {
    const top = 0.96
    const step = 0.09
    const thr = 4 // M⊙ within which two labels are treated as overlapping
    const ay = [top, top, top]
    const order = [0, 1, 2].filter((i) => visible[i] && xs[i] != null).sort((a, b) => xs[a] - xs[b])
    let level = 0
    let prevX = -Infinity
    for (const i of order) {
        level = xs[i] - prevX < thr ? level + 1 : 0
        ay[i] = top - level * step
        prevX = xs[i]
    }
    return ay
}

function medianAnnotation(x, colour, visible, ay, text) {
    const dark = darkMode()
    return {
        x: x,
        y: ay,
        xref: 'x',
        yref: 'paper',
        yanchor: 'bottom',
        text: text,
        showarrow: false,
        font: { size: 0.62 * fs, color: "white" },
        bgcolor: colour,//dark ? 'rgba(51,51,51,0.72)' : 'rgba(255,255,255,0.72)',
        bordercolor: colour,
        borderwidth: 1,
        borderpad: 2,
        visible: visible,
    }
}

// ---- rendering -----------------------------------------------------------
// The plot's layout is created ONCE. Updates only push trace data (and the
// y-axis range, and only when it actually changed). This keeps the x-axis zoom
// intact between clicks and lets bar heights tween without a snap.
function render(smooth) {
    const traces = computeTraces()
    const med = medianTargets()

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
            legend: { x: 0.98, y: 0.02, xanchor: 'right', yanchor: 'bottom', orientation: 'v', bgcolor: dark ? 'rgba(51,51,51,0.6)' : 'rgba(255,255,255,0.6)' },
            shapes: [0, 1, 2].map((i) => medianShape(med.x[i] == null ? D.massCentres[0] : med.x[i], med.colour[i], med.visible[i])),
            annotations: (() => {
                const mx0 = med.x.map((m) => (m == null ? D.massCentres[0] : m))
                const ay0 = annotationYLevels(mx0, med.visible)
                return [0, 1, 2].map((i) => medianAnnotation(mx0[i], med.colour[i], med.visible[i], ay0[i], medLabel(mx0[i])))
            })(),
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

    // Median lines: colour/visibility applied instantly, x-position tweened below.
    const prevX = (gd.layout.shapes || []).map((s) => s.x0)
    const toMed = med.x.map((m, i) => (m == null ? (prevX[i] != null ? prevX[i] : D.massCentres[0]) : m))
    const fromMed = [0, 1, 2].map((i) => (prevX[i] != null ? prevX[i] : toMed[i]))
    const ay = annotationYLevels(toMed, med.visible)
    const dark = darkMode()
    const abg = dark ? 'rgba(51,51,51,0.72)' : 'rgba(255,255,255,0.72)'
    const styleUpdate = {}
    for (let i = 0; i < 3; i++) {
        styleUpdate[`shapes[${i}].visible`] = med.visible[i]
        styleUpdate[`shapes[${i}].line.color`] = med.colour[i]
        styleUpdate[`annotations[${i}].visible`] = med.visible[i]
        styleUpdate[`annotations[${i}].y`] = ay[i]
        styleUpdate[`annotations[${i}].font.color`] = 'white'
        styleUpdate[`annotations[${i}].bordercolor`] = med.colour[i]
        styleUpdate[`annotations[${i}].bgcolor`] = med.colour[i]
    }
    Plotly.relayout('bh-mass', styleUpdate)

    // x-position of the lines AND their value labels, tweened together
    const lineUpdate = (mx) => {
        const u = {}
        for (let i = 0; i < 3; i++) {
            u[`shapes[${i}].x0`] = mx[i]
            u[`shapes[${i}].x1`] = mx[i]
            u[`annotations[${i}].x`] = mx[i]
            u[`annotations[${i}].text`] = medLabel(mx[i])
        }
        return u
    }

    // We hand-roll the tween (bar heights, y-axis range AND median lines together)
    // because Plotly.animate snaps the axis range at the end instead of interpolating.
    if (rafId) cancelAnimationFrame(rafId)
    // rAF is paused while the tab is hidden, so fall back to an instant update
    // (otherwise a model switch on a backgrounded tab would leave stale data).
    const dur = smooth && !document.hidden ? 500 : 0
    if (dur <= 0) {
        Plotly.update('bh-mass', { y: toY }, Object.assign({ 'yaxis.range': toR }, lineUpdate(toMed)))
        return
    }
    const start = performance.now()
    const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
    function step(now) {
        const p = Math.min(1, (now - start) / dur)
        const e = ease(p)
        const y = toY.map((arr, ti) => arr.map((v, i) => fromY[ti][i] + (v - fromY[ti][i]) * e))
        const r = [fromR[0] + (toR[0] - fromR[0]) * e, fromR[1] + (toR[1] - fromR[1]) * e]
        const mx = toMed.map((tm, i) => fromMed[i] + (tm - fromMed[i]) * e)
        Plotly.update('bh-mass', { y: y }, Object.assign({ 'yaxis.range': r }, lineUpdate(mx)))
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
// the model selection with the histogram. Escaped BHs are always excluded here
// (esc index 0 only) -- their |z| is enormous and would swamp the scale height.
// ==========================================================================

// Per-channel |z| histograms for BOUND BHs only (summed over all masses).
function zHistByPop(modelName) {
    const flat = D.counts[modelName]
    const { nMass, nZ } = D
    const E_BOUND = 0
    const byPop = [new Array(nZ).fill(0), new Array(nZ).fill(0), new Array(nZ).fill(0)]
    for (let p = 0; p < 3; p++) {
        const arr = byPop[p]
        for (let m = 0; m < nMass; m++) {
            const base = ((p * 2 + E_BOUND) * nMass + m) * nZ
            for (let z = 0; z < nZ; z++) arr[z] += flat[base + z]
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
        'annotations[0].text': hz ? `Scale height ≈ ${parseFloat((hz * 1000).toPrecision(3))} pc` : '',
        'annotations[0].x': hz ? Math.log10(hz) : 0,
        showlegend: state.cdfSplit,
    })

    // Hand-rolled tween of the curve y-values (Plotly.animate doesn't reliably
    // commit line data here; Plotly.restyle per frame does, same as the histogram).
    const gd = document.getElementById('bh-z-cdf')
    const fromY = gd.data.map((t) => Array.from(t.y))
    const toY = traces.map((t) => t.y)
    if (cdfRaf) cancelAnimationFrame(cdfRaf)
    const dur = smooth && !document.hidden ? 500 : 0
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
            { x: hz ? Math.log10(hz) : 0, y: 0.06, xref: 'x', yref: 'paper', text: hz ? `Scale height ≈ ${parseFloat((hz * 1000).toPrecision(3))} pc` : '', showarrow: false, font: { size: 0.8 * fs, color: anti }, bgcolor: dark ? 'rgba(51,51,51,0.7)' : 'rgba(255,255,255,0.7)' },
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

// ==========================================================================
// DOUGHNUT CHARTS (Figure 1) -- channel breakdown by number and by mass, with
// the running total in the centre. Both are derived from the same reduced
// counts (number = sum over mass; mass = sum of count * mass), so they respond
// to the model, escapee filter and |z| range, and animate smoothly.
// ==========================================================================

// Per-channel number and total mass for the current model/filter (scaled counts).
function pieData() {
    const yByPop = reduceModel(state.model)
    const num = [0, 0, 0]
    const mass = [0, 0, 0]
    for (let p = 0; p < 3; p++) {
        for (let m = 0; m < D.nMass; m++) {
            num[p] += yByPop[p][m]
            mass[p] += yByPop[p][m] * D.massCentres[m]
        }
    }
    return { num: num, mass: mass }
}

// Compact "1.7×10⁸" style label; appends a unit if given.
function fmtBig(n, unit) {
    if (!(n > 0)) return '0' + (unit ? ' ' + unit : '')
    const exp = Math.floor(Math.log10(n))
    const mant = n / Math.pow(10, exp)
    const m = exp >= 3 ? `${mant.toFixed(1)}×10<sup>${exp}</sup>` : Math.round(n).toLocaleString()
    return unit ? `${m} ${unit}` : m
}

function pieTrace(values, lineColour) {
    return {
        type: 'pie',
        values: values,
        labels: POP_LABELS,
        hole: 0.62,
        marker: { colors: POP_COLOURS, line: { color: lineColour, width: 2 } },
        textinfo: 'none',
        sort: false,
        direction: 'clockwise',
        hovertemplate: '%{label}<br>%{percent}<extra></extra>',
        domain: { x: [0, 1], y: [0, 1] },
    }
}

function pieLayout(centreText, dark) {
    return {
        margin: { t: 8, r: 8, b: 8, l: 8 },
        showlegend: false,
        // transparent so the pie floats over the histogram; the centre value gets
        // a translucent pill so it stays readable over gridlines
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)',
        font: { color: dark ? 'white' : '#333' },
        annotations: [
            {
                text: centreText,
                x: 0.5,
                y: 0.5,
                xref: 'paper',
                yref: 'paper',
                showarrow: false,
                font: { size: 0.7 * fs, color: dark ? 'white' : '#333' },
                bgcolor: dark ? 'rgba(51,51,51,0.7)' : 'rgba(255,255,255,0.7)',
                borderpad: 2,
            },
        ],
    }
}

function renderPies(smooth) {
    const { num, mass } = pieData()
    const dark = darkMode()
    const bg = dark ? '#333' : 'white'
    const centreNum = "<b>" + fmtBig(num[0] + num[1] + num[2]) + "</b><br>Number of BHs"
    const centreMass = "<b>" + fmtBig(mass[0] + mass[1] + mass[2], 'M<sub>☉</sub>') + "</b><br>Total BH mass"

    if (!piesCreated) {
        const config = { responsive: true, displayModeBar: false }
        Plotly.newPlot('bh-pie-num', [pieTrace(num, bg)], pieLayout(centreNum, dark), config)
        Plotly.newPlot('bh-pie-mass', [pieTrace(mass, bg)], pieLayout(centreMass, dark), config)
        piesCreated = true
        return
    }

    // keep slice separators + centre-text colour in sync with the theme
    Plotly.restyle('bh-pie-num', { 'marker.line.color': bg })
    Plotly.restyle('bh-pie-mass', { 'marker.line.color': bg })

    const gN = document.getElementById('bh-pie-num')
    const gM = document.getElementById('bh-pie-mass')
    const fromN = gN.data[0].values.slice()
    const fromM = gM.data[0].values.slice()
    const sum = (a) => a[0] + a[1] + a[2]

    if (pieRaf) cancelAnimationFrame(pieRaf)
    const dur = smooth && !document.hidden ? 500 : 0
    const fc = dark ? 'white' : '#333'
    const pill = dark ? 'rgba(51,51,51,0.7)' : 'rgba(255,255,255,0.7)'
    const apply = (nv, mv) => {
        Plotly.update('bh-pie-num', { values: [nv] }, { 'annotations[0].text': "<b>" + fmtBig(sum(nv)) + "</b><br>Number of BHs", 'annotations[0].font.color': fc, 'annotations[0].bgcolor': pill })
        Plotly.update('bh-pie-mass', { values: [mv] }, { 'annotations[0].text': "<b>" + fmtBig(sum(mv), 'M<sub>☉</sub>') + "</b><br>Total BH mass", 'annotations[0].font.color': fc, 'annotations[0].bgcolor': pill })
    }
    if (dur <= 0) {
        apply(num, mass)
        return
    }
    const start = performance.now()
    const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
    function step(now) {
        const e = ease(Math.min(1, (now - start) / dur))
        const nv = num.map((v, i) => fromN[i] + (v - fromN[i]) * e)
        const mv = mass.map((v, i) => fromM[i] + (v - fromM[i]) * e)
        apply(nv, mv)
        pieRaf = (now - start) / dur < 1 ? requestAnimationFrame(step) : null
    }
    pieRaf = requestAnimationFrame(step)
}

window.rerenderBHPies = function () {
    if (piesCreated) renderPies(false)
}

// ---- model switcher (grouped by category) --------------------------------
// Build the model buttons into every switcher container. The two sets (one by
// the histogram, one by the CDF) are linked: buttons carry data-model + the
// .bh-model-btn class, and selectModel() drives the active state on all of them.
function buildSwitcher() {
    document.querySelectorAll('.bh-model-switcher').forEach((rootEl) => buildSwitcherInto(rootEl))
}

function buildSwitcherInto(rootEl) {
    const container = rootEl.querySelector('.row') || rootEl
    const catColours = ['var(--primary)', '#6ec42d', '#d1495b', '#f68e1e', '#5b86cb', '#00bcd4']
    let lastCat = null
    let catIndex = -1
    const row = document.createElement('div')
    row.className = 'col-12'
    container.appendChild(row)

    D.modelNames.forEach((name, i) => {
        if (D.modelCategories[i] !== lastCat) {
            catIndex++
            lastCat = D.modelCategories[i]
        }
        const btn = document.createElement('button')
        btn.className = 'btn sn-dists-btn bh-model-btn'
        btn.style.backgroundColor = catColours[catIndex % catColours.length]
        btn.style.color = 'white'
        btn.setAttribute('data-model', name)
        btn.innerHTML = D.modelLabels[i]
        if (name === state.model) btn.classList.add('active')
        btn.addEventListener('click', () => selectModel(name))
        row.appendChild(btn)
    })

    if (window.MathJax && MathJax.Hub) {
        MathJax.Hub.Queue(['Typeset', MathJax.Hub, container])
    }
}

// Switch model from either button set and keep both sets' active state in sync.
function selectModel(name) {
    if (name === state.model) return
    state.model = name
    document.querySelectorAll('.bh-model-btn').forEach((b) => b.classList.toggle('active', b.getAttribute('data-model') === name))
    recomputeYRange() // counts: refit this model; normalised: unchanged (fixed)
    render(true) // smooth transition between models
    renderCDF(true)
    renderPies(true)
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

    // escaped filter -- affects the histogram only (the CDF is always bound-only)
    document.querySelectorAll('#bh-esc-switcher button').forEach((btn) => {
        btn.addEventListener('click', function () {
            state.escMode = this.getAttribute('data-esc')
            document.querySelectorAll('#bh-esc-switcher button').forEach((e) => e.classList.remove('active'))
            this.classList.add('active')
            recomputeYRange()
            render(true)
            renderPies(true)
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
        renderPies(true)
    })
    rawBtn.addEventListener('click', function () {
        state.scaleMode = 'raw'
        rawBtn.classList.add('active')
        mwBtn.classList.remove('active')
        applyAxisStyle()
        recomputeYRange()
        render(false)
        renderPies(true)
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
        renderPies(false)
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
        renderPies(false)
    }
    loSlider.addEventListener('input', onLo)
    hiSlider.addEventListener('input', onHi)
    updateZUI()
}
