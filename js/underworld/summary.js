// Summary-across-variations explorer (Figures 6, 9, F1).
// Reads data/underworld/summary.json (one record per model) and draws a grid of
// scatter panels -- one per summary statistic -- with models grouped by category
// on the y-axis and a dashed line marking the fiducial value. The user chooses
// which panels to show (1 to all), and can hover any point for its value.

// Display metadata per metric column. Panels are only built for columns that are
// actually present in the loaded data, so extra columns (e.g. the Table E1 binary
// counts) light up automatically once they appear in summary.json.
const SUM_METRICS = [
    { key: 'N_BH', label: 'Number of BHs', log: true, fmt: (v) => sciFmt(v) },
    { key: 'M_BH', label: 'Total BH mass', unit: 'M<sub>☉</sub>', log: true, fmt: (v) => sciFmt(v) + ' M⊙' },
    { key: 'h_z', label: 'Scale height', unit: 'pc', log: true, fmt: (v) => Math.round(v) + ' pc' },
    { key: 'f_esc', label: 'Escaped fraction', log: false, fmt: (v) => (v * 100).toFixed(1) + '%' },
    { key: 'med_lo', label: 'Median mass, |z| < 1 kpc', unit: 'M⊙', log: false, fmt: (v) => v.toFixed(1) + ' M⊙' },
    { key: 'med_hi', label: 'Median mass, |z| ≥ 1 kpc', unit: 'M⊙', log: false, fmt: (v) => v.toFixed(1) + ' M⊙' },
    { key: 'f_bound', label: 'Bound-binary fraction', log: false, fmt: (v) => (v * 100).toFixed(1) + '%' },
    { key: 'f_merger', label: 'Merger-product fraction', log: false, fmt: (v) => (v * 100).toFixed(1) + '%' },
    { key: 'N_BHstar', label: 'BH–star binaries', log: true, fmt: (v) => sciFmt(v) },
    { key: 'N_BHWD', label: 'BH–WD binaries', log: true, fmt: (v) => sciFmt(v) },
    { key: 'N_BHNS', label: 'BH–NS binaries', log: true, fmt: (v) => sciFmt(v) },
    { key: 'N_BHBH', label: 'BH–BH binaries', log: true, fmt: (v) => sciFmt(v) },
]

const SUM_CAT_SHORT = {
    Fiducial: 'Fiducial',
    'Supernova natal kicks': 'SN kicks',
    'Remnant mass prescriptions': 'Remnant mass',
    'Maltsev fallback mass fraction': 'Maltsev f_fb',
    'Maltsev partial fallback probability': 'Maltsev P(pf)',
    'Galactic gravitational potential': 'Potential',
    'Single star evolution': 'Single star',
    'Initial mass function': 'IMF',
    'Initial mass ratio distribution': 'Mass ratio',
    'Initial orbital period distribution': 'Orbital period',
}

const SUM_CAT_COLOURS = ['#5b6ee1', '#6ec42d', '#d1495b', '#f68e1e', '#8a6fd4', '#00bcd4', '#e84393', '#e6a80c', '#2d98da', '#26a69a', '#9b59b6', '#95a5a6']

const SUM = { rows: [], fiducial: null, cats: [], catIndex: {}, yPos: [], metrics: [] }

// Strip LaTeX from a label for the hover tooltip (Plotly hover doesn't run
// MathJax; the y-axis ticks keep the raw LaTeX, which renders fine).
function plainLabel(s) {
    if (!s) return s
    return String(s)
        .replace(/\$/g, '')
        .replace(/\\rm\s*/g, '')
        .replace(/\\text\{([^}]*)\}/g, '$1')
        .replace(/\\[,;! ]/g, ' ')
        .replace(/\\alpha/g, 'α')
        .replace(/\\beta/g, 'β')
        .replace(/\\gamma/g, 'γ')
        .replace(/\\kappa/g, 'κ')
        .replace(/\\pi/g, 'π')
        .replace(/\\sigma/g, 'σ')
        .replace(/\\mu/g, 'μ')
        .replace(/\\lambda/g, 'λ')
        .replace(/\\infty/g, '∞')
        .replace(/\\odot/g, '☉')
        .replace(/\^\{([^}]*)\}/g, '^$1')
        .replace(/_\{([^}]*)\}/g, '_$1')
        .replace(/[{}]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
}

function sciFmt(n) {
    if (n == null || !(n > 0)) return String(n)
    const exp = Math.floor(Math.log10(n))
    if (exp < 3 && exp > -2) return (+n.toPrecision(3)).toLocaleString()
    const mant = n / Math.pow(10, exp)
    return `${mant.toFixed(1)}×10<sup>${exp}</sup>`
}

fetch('../../data/underworld/summary.json')
    .then((r) => r.json())
    .then((rows) => {
        loadSummary(rows)
        buildSummaryToggles()
        buildCategoryToggles()
        renderSummaryPanels()
    })
    .catch((err) => console.error('Failed to load summary.json', err))

const SUM_GAP = 1.6 // vertical gap (in rows) inserted between category groups

function loadSummary(rows) {
    SUM.rows = rows
    SUM.fiducial = rows.find((r) => r.fiducial) || rows.find((r) => /^fiducial$/i.test(r.label || '')) || rows.find((r) => /^fiducial$/i.test(r.category || '')) || null

    // categories in first-seen order; all shown initially
    SUM.cats = []
    rows.forEach((r) => {
        if (!SUM.cats.includes(r.category)) SUM.cats.push(r.category)
    })
    SUM.activeCats = new Set(SUM.cats)

    // metrics that actually have data
    SUM.metrics = SUM_METRICS.filter((m) => rows.some((r) => r[m.key] != null))
    computeLayout()
}

// Assign a y-row to every model in an active category (others get null and are
// dropped), inserting a gap between groups so we can draw a separator + header.
// Recomputed whenever the set of visible categories changes, so panels shorten.
function computeLayout() {
    let y = 0
    let prev = null
    SUM.yPos = new Array(SUM.rows.length).fill(null)
    SUM.groups = []
    SUM.rows.forEach((r, i) => {
        if (!SUM.activeCats.has(r.category)) return
        if (r.category !== prev) {
            if (prev !== null) y += SUM_GAP
            SUM.groups.push({ cat: r.category, top: y, sepY: SUM.groups.length === 0 ? null : y - SUM_GAP / 2 })
            prev = r.category
        }
        SUM.yPos[i] = y
        SUM.groups[SUM.groups.length - 1].bottom = y
        y += 1
    })
    SUM.maxY = Math.max(0, y - 1)
}

// Panel pixel height scales with the number of visible rows so panels shorten
// when categories are removed.
function panelHeight() {
    return 60 + (SUM.maxY + 2) * 22
}

function redrawAllPanels() {
    const h = panelHeight() + 'px'
    SUM.metrics.forEach((m) => {
        const div = document.getElementById('bh-sum-' + m.key)
        const cell = document.getElementById('bh-sum-cell-' + m.key)
        if (!div) return
        div.style.height = h
        // only redraw panels that are actually visible; hidden ones are marked
        // stale and redrawn lazily when re-shown (keeps category toggles snappy)
        if (cell && cell.style.display === 'none') {
            div.dataset.stale = '1'
        } else {
            drawSummaryPanel(m, div)
        }
    })
}

// Show/hide a metric panel; redraw it if it went stale while hidden.
function showPanel(key, show) {
    const cell = document.getElementById('bh-sum-cell-' + key)
    const div = document.getElementById('bh-sum-' + key)
    if (!cell || !div) return
    cell.style.display = show ? '' : 'none'
    if (!show) return
    if (div.dataset.stale) {
        delete div.dataset.stale
        div.style.height = panelHeight() + 'px'
        const m = SUM.metrics.find((mm) => mm.key === key)
        if (m) drawSummaryPanel(m, div)
    } else {
        Plotly.Plots.resize(div)
    }
}

// ---- panel toggles -------------------------------------------------------
function buildSummaryToggles() {
    const box = document.getElementById('bh-sum-toggles')
    if (!box) return
    SUM.metrics.forEach((m) => {
        const btn = document.createElement('button')
        btn.className = 'btn btn-primary sn-dists-btn active'
        btn.setAttribute('data-metric', m.key)
        btn.innerText = m.label
        btn.addEventListener('click', function () {
            this.classList.toggle('active')
            showPanel(m.key, this.classList.contains('active'))
        })
        box.appendChild(btn)
    })
    const setAll = (on) => {
        document.querySelectorAll('#bh-sum-toggles .sn-dists-btn').forEach((b) => {
            b.classList.toggle('active', on)
            showPanel(b.getAttribute('data-metric'), on)
        })
    }
    document.getElementById('bh-sum-all').addEventListener('click', () => setAll(true))
    document.getElementById('bh-sum-none').addEventListener('click', () => setAll(false))
}

// ---- category toggles (which variation groups appear as rows) ------------
// Toggling a group only STAGES the choice (redrawing every panel per click is
// slow); the change is committed when the user clicks "Apply".
function buildCategoryToggles() {
    const box = document.getElementById('bh-sum-cat-toggles')
    if (!box) return
    SUM.cats.forEach((cat) => {
        const btn = document.createElement('button')
        btn.className = 'btn btn-primary sn-dists-btn active'
        btn.setAttribute('data-cat', cat)
        btn.innerText = cat
        btn.addEventListener('click', function () {
            this.classList.toggle('active')
            updateApplyState()
        })
        box.appendChild(btn)
    })
    const allBtn = document.getElementById('bh-sum-cat-all')
    if (allBtn)
        allBtn.addEventListener('click', () => {
            document.querySelectorAll('#bh-sum-cat-toggles .sn-dists-btn').forEach((b) => b.classList.add('active'))
            updateApplyState()
        })
    const applyBtn = document.getElementById('bh-sum-cat-apply')
    if (applyBtn) applyBtn.addEventListener('click', applyCategories)
    updateApplyState()
}

function stagedCats() {
    return new Set(Array.from(document.querySelectorAll('#bh-sum-cat-toggles .sn-dists-btn.active')).map((b) => b.getAttribute('data-cat')))
}

// Highlight "Apply" when the staged selection differs from what's shown, and
// disable it if nothing is selected (at least one group must be shown).
function updateApplyState() {
    const applyBtn = document.getElementById('bh-sum-cat-apply')
    if (!applyBtn) return
    const staged = stagedCats()
    const same = staged.size === SUM.activeCats.size && [...staged].every((c) => SUM.activeCats.has(c))
    applyBtn.classList.toggle('bh-apply-pending', !same && staged.size > 0)
    applyBtn.disabled = staged.size === 0
}

function applyCategories() {
    const staged = stagedCats()
    if (staged.size === 0) return
    SUM.activeCats = staged
    computeLayout()
    redrawAllPanels()
    updateApplyState()
}

// ---- panels --------------------------------------------------------------
function renderSummaryPanels() {
    const grid = document.getElementById('bh-sum-grid')
    if (!grid) return
    SUM.metrics.forEach((m) => {
        const cell = document.createElement('div')
        cell.className = 'bh-sum-cell'
        cell.id = 'bh-sum-cell-' + m.key
        const h3 = document.createElement('h3')
        h3.className = 'bh-sum-title'
        h3.innerText = m.label
        cell.appendChild(h3)
        const div = document.createElement('div')
        div.id = 'bh-sum-' + m.key
        div.style.height = panelHeight() + 'px' // scales with the number of visible rows
        cell.appendChild(div)
        grid.appendChild(cell)
        drawSummaryPanel(m, div)
    })
}

function drawSummaryPanel(m, div) {
    const dark = darkMode()
    // rows in a currently-visible category (yPos assigned) ...
    const active = SUM.rows.map((_, i) => i).filter((i) => SUM.yPos[i] != null)
    // ... and, for the markers, those that also have a value for this metric
    const idxs = active.filter((i) => SUM.rows[i][m.key] != null)
    const trace = {
        x: idxs.map((i) => SUM.rows[i][m.key]),
        y: idxs.map((i) => SUM.yPos[i]),
        text: idxs.map((i) => `<b>${plainLabel(SUM.rows[i].label || SUM.rows[i].model)}</b><br>${m.label}: ${m.fmt(SUM.rows[i][m.key])}`),
        type: 'scatter',
        mode: 'markers',
        marker: { color: idxs.map((i) => SUM.rows[i].colour || '#5b6ee1'), size: 10, line: { color: dark ? '#333' : 'white', width: 1 } },
        hovertemplate: '%{text}<extra></extra>',
        showlegend: false,
    }

    const sepCol = dark ? '#666' : '#ccc'
    const headCol = dark ? '#ddd' : '#555'
    const shapes = []
    const annotations = []
    // category separators + on-plot group headers
    SUM.groups.forEach((g) => {
        if (g.sepY != null) shapes.push({ type: 'line', xref: 'paper', x0: 0, x1: 1, yref: 'y', y0: g.sepY, y1: g.sepY, line: { color: sepCol, width: 1 } })
        annotations.push({ x: 0.5, xref: 'paper', xanchor: 'center', y: g.top - 0.9, yref: 'y', yanchor: 'middle', text: '<b>' + g.cat + '</b>', showarrow: false, font: { size: 0.6 * fs, color: headCol }, bgcolor: dark ? 'rgba(51,51,51,1)' : 'rgba(255,255,255,1)' })
    })
    // fiducial reference line -- drawn BELOW the scatter points
    if (SUM.fiducial && SUM.fiducial[m.key] != null) {
        const fx = SUM.fiducial[m.key]
        shapes.push({ type: 'line', xref: 'x', x0: fx, x1: fx, yref: 'paper', y0: 0, y1: 1, layer: 'below', line: { color: dark ? '#aaa' : '#888', width: 1.5, dash: 'dash' } })
    }

    const layout = {
        margin: { t: 8, r: 14, b: 58, l: 160 },
        xaxis: {
            title: { text: m.label + (m.unit ? ' [' + m.unit + ']' : ''), font: { size: 0.62 * fs }, standoff: 6 },
            type: m.log ? 'log' : 'linear',
            tickfont: { size: 0.6 * fs },
            zeroline: false,
            automargin: true,
            gridcolor: dark ? '#4a4a4a' : '#eee',
        },
        yaxis: {
            tickvals: active.map((i) => SUM.yPos[i]),
            ticktext: active.map((i) => SUM.rows[i].label || SUM.rows[i].model),
            tickfont: { size: 0.56 * fs },
            range: [SUM.maxY + 0.6, -1.4], // reversed: first model at top, room for the top header
            zeroline: false,
            showgrid: false,
        },
        shapes: shapes,
        annotations: annotations,
        paper_bgcolor: dark ? '#333' : 'white',
        plot_bgcolor: dark ? '#333' : 'white',
        font: { color: dark ? 'white' : '#333' },
        hovermode: 'closest',
    }
    const config = { responsive: true, displayModeBar: false }
    Plotly.newPlot(div, [trace], layout, config)
}

window.rerenderSummary = function () {
    // shapes/annotations are theme-dependent and vary in count per panel, so a
    // full redraw is the simplest way to recolour everything consistently.
    SUM.metrics.forEach((m) => {
        const div = document.getElementById('bh-sum-' + m.key)
        if (div && div.data) drawSummaryPanel(m, div)
    })
}
