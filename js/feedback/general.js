let tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'))
let tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
    return new bootstrap.Tooltip(tooltipTriggerEl)
})

const fs = 20

const models = ['fiducial', 'ce-0.1', 'ce-10.0', 'qcritB-0.0', 'qcritB-1000.0', 'beta-0.0', 'beta-0.5', 'beta-1.0', 'ccsn-20', 'ecsn-265', 'no-fallback', 'singles', 'imf-1.9', 'imf-2.7', 'porb-0', 'porb-minus1', 'q-plus1', 'q-minus1', 'Z-0.5', 'Z-0.2', 'Z-0.1', 'Z-0.05', 'v-disp-0.5', 'v-disp-5']
const model_labels = [
    '$\\rm Fiducial$',
    '$\\alpha_{\\rm CE} = 0.1$',
    '$\\alpha_{\\rm CE} = 10.0$',
    '$\\rm Case \\ B \\ Unstable$',
    '$\\rm Case \\ B \\ Stable$',
    '$\\beta = 0.0$',
    '$\\beta = 0.5$',
    '$\\beta = 1.0$',
    '$\\sigma_{\\rm CC} = 20 \\, {\\rm km/s}$',
    '$\\sigma_{\\rm low} = 265 \\, {\\rm km/s}$',
    '$\\rm No \\ fallback$',
    '$f_{\\rm bin} = 0.0$',
    '$\\alpha_{\\rm IMF} = -1.9$',
    '$\\alpha_{\\rm IMF} = -2.7$',
    '$\\pi = 0$',
    '$\\pi = -1$',
    '$\\kappa = 1$',
    '$\\kappa = -1$',
    '$\\bar{Z} = 0.5 \\, \\bar{Z}_{\\rm m11h}$',
    '$\\bar{Z} = 0.2 \\, \\bar{Z}_{\\rm m11h}$',
    '$\\bar{Z} = 0.1 \\, \\bar{Z}_{\\rm m11h}$',
    '$\\bar{Z} = 0.05 \\, \\bar{Z}_{\\rm m11h}$',
    '$v_{\\rm disp} = 0.5 \\, {\\rm km/s}$',
    '$v_{\\rm disp} = 5 \\, {\\rm km/s}$',
]

this.window.addEventListener('load', function () {
    document.getElementById('dark-mode-checkbox').addEventListener('change', function () {
        const plots = ['histograms', 'percentiles', 'model']
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
