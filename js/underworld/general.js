// Shared setup for the Galactic Underworld interactive page.

// Bootstrap tooltips
let tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'))
let tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
    return new bootstrap.Tooltip(tooltipTriggerEl)
})

// Shared font size for Plotly axes
const fs = 20

this.window.addEventListener('load', function () {
    document.getElementById('dark-mode-checkbox').addEventListener('change', function () {
        Plotly.relayout('bh-mass', {
            paper_bgcolor: this.checked ? '#333' : 'white',
            plot_bgcolor: this.checked ? '#333' : 'white',
            'font.color': this.checked ? 'white' : '#333',
            'xaxis.zerolinecolor': this.checked ? '#595656' : '#eee',
            'xaxis.gridcolor': this.checked ? '#595656' : '#eee',
            'yaxis.zerolinecolor': this.checked ? '#595656' : '#eee',
            'yaxis.gridcolor': this.checked ? '#595656' : '#eee',
        })
        // the "Total" bar colour is theme-dependent, so re-render its data too
        if (window.rerenderBHMass) {
            window.rerenderBHMass()
        }
    })

    document.getElementById('home').addEventListener('click', function () {
        window.location.href = '../../index.html'
    })
})
