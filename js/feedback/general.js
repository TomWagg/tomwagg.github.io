let tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'))
let tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
    return new bootstrap.Tooltip(tooltipTriggerEl)
})

const fs = 20

const models = ['fiducial', 'ce-0.1', 'ce-10.0', 'qcritB-0.0', 'qcritB-1000.0', 'beta-0.0', 'beta-0.5', 'beta-1.0', 'ccsn-20', 'ecsn-265', 'no-fallback', 'singles', 'imf-1.9', 'imf-2.7', 'porb-0', 'porb-minus1', 'porb-max-3', 'q-plus1', 'q-minus1', 'Z-0.5', 'Z-0.2', 'Z-0.1', 'Z-0.05', 'v-disp-0.5', 'v-disp-5', 'r442-Zx2']
// Model labels as Plotly-native HTML (real sub/superscripts + Unicode Greek), so they
// render WITHOUT MathJax. Plotly.js only typesets $...$ LaTeX via the MathJax v2
// MathJax.Hub API, which MathJax 3 removed — hence these must be plain HTML now.
const model_labels = [
    'Fiducial',
    'α<sub>CE</sub> = 0.1',
    'α<sub>CE</sub> = 10.0',
    'Case B Unstable',
    'Case B Stable',
    'β = 0.0',
    'β = 0.5',
    'β = 1.0',
    'σ<sub>CC</sub> = 20 km/s',
    'σ<sub>low</sub> = 265 km/s',
    'No fallback',
    'f<sub>bin</sub> = 0.0',
    'α<sub>IMF</sub> = -1.9',
    'α<sub>IMF</sub> = -2.7',
    'π = 0',
    'π = -1',
    'P<sub>0,max</sub> = 10<sup>3</sup> days',
    'κ = 1',
    'κ = -1',
    'Z̄ = 0.5 Z̄<sub>m11h</sub>',
    'Z̄ = 0.2 Z̄<sub>m11h</sub>',
    'Z̄ = 0.1 Z̄<sub>m11h</sub>',
    'Z̄ = 0.05 Z̄<sub>m11h</sub>',
    'v<sub>disp</sub> = 0.5 km/s',
    'v<sub>disp</sub> = 5 km/s',
    'ChaNGa galaxy (r442)',
]

this.window.addEventListener('load', function () {
    document.getElementById('dark-mode-checkbox').addEventListener('change', function () {
        const plots = ['histograms', 'percentiles', 'model', 'medians', 'tails', 'totals']
        plots.forEach((plot) => {
            Plotly.relayout(plot, {
                paper_bgcolor: this.checked ? '#333' : 'white',
                plot_bgcolor: this.checked ? '#333' : 'white',
                'font.color': this.checked ? 'white' : '#333',
                'xaxis.zerolinecolor': this.checked ? '#595656' : '#eee',
                'xaxis.gridcolor': this.checked ? '#595656' : '#eee',
                'yaxis.zerolinecolor': this.checked ? '#595656' : '#eee',
                'yaxis.gridcolor': this.checked ? '#595656' : '#eee',
                'xaxis2.zerolinecolor': this.checked ? '#595656' : '#eee',
                'xaxis2.gridcolor': this.checked ? '#595656' : '#eee',
                'yaxis2.zerolinecolor': this.checked ? '#595656' : '#eee',
                'yaxis2.gridcolor': this.checked ? '#595656' : '#eee',
            })
        })
    })
})
