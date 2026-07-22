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
        const dark = this.checked
        ;['bh-mass', 'bh-z-cdf'].forEach((id) => {
            if (!document.getElementById(id) || !document.getElementById(id).data) return
            Plotly.relayout(id, {
                paper_bgcolor: dark ? '#333' : 'white',
                plot_bgcolor: dark ? '#333' : 'white',
                'font.color': dark ? 'white' : '#333',
                'xaxis.zerolinecolor': dark ? '#595656' : '#eee',
                'xaxis.gridcolor': dark ? '#595656' : '#eee',
                'yaxis.zerolinecolor': dark ? '#595656' : '#eee',
                'yaxis.gridcolor': dark ? '#595656' : '#eee',
            })
        })
        // curve colours (the "All BHs" line, and the 1-1/e guides) are theme-dependent
        if (window.rerenderBHMass) window.rerenderBHMass()
        if (window.rerenderBHCDF) window.rerenderBHCDF()
    })

    document.getElementById('home').addEventListener('click', function () {
        window.location.href = '../../index.html'
    })
})
