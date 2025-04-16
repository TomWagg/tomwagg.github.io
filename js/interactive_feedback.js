let tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'))
let tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
    return new bootstrap.Tooltip(tooltipTriggerEl)
})

// Globals for animations
let intervalID
let direction = 1
let interval_time = 70

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

build_sn_dists_histogram('fiducial')
build_percentiles_plots()

this.window.addEventListener('load', function () {
    document.getElementById('dark-mode-checkbox').addEventListener('change', function () {
        const plots = ['histograms']
        plots.forEach((plot) => {
            Plotly.relayout(plot, {
                paper_bgcolor: this.checked ? '#333' : 'white',
                plot_bgcolor: this.checked ? '#333' : 'white',
                'font.color': this.checked ? 'white' : '#333',
                'xaxis.zerolinecolor': this.checked ? '#595656' : '#eee',
                'xaxis.gridcolor': this.checked ? '#595656' : '#eee',
                'yaxis.zerolinecolor': this.checked ? '#595656' : '#eee',
                'yaxis.gridcolor': this.checked ? '#595656' : '#eee',
            })
        })
    })

    const range = document.getElementById('sn-dists-slider')
    const bubble = document.getElementById('sn-dists-slider-bubble')
    const max_times = [
        4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10, 10.5, 11, 11.5, 12, 12.5, 13, 13.5, 14, 14.5, 15, 15.5, 16, 16.5, 17, 17.5, 18, 18.5, 19, 19.5, 20, 20.5, 21, 21.5, 22, 22.5, 23, 23.5, 24, 24.5, 25, 25.5, 26, 26.5, 27, 27.5, 28, 28.5, 29, 29.5, 30, 30.5, 31, 31.5, 32, 32.5, 33, 33.5, 34, 34.5, 35, 35.5, 36, 36.5, 37, 37.5, 38, 38.5, 39, 39.5, 40, 40.5, 41, 41.5, 42, 42.5, 43, 43.5, 44, 44.5, 45, 45.5, 46, 46.5, 47, 47.5, 48, 48.5, 49, 49.5, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100,
        105, 110, 115, 120, 125, 130, 135, 140, 145, 150, 155, 160, 165, 170, 175, 180, 185, 190, 195, 200,
    ]
    range.max = max_times.length - 1

    range.addEventListener('input', function () {
        const val = range.value
        const min = range.min ? range.min : 0
        const max = range.max ? range.max : 100
        const fraction = Number((val - min) / (max - min))
        bubble.innerText = String(max_times[val].toFixed(1)).padStart(2, ' ')

        const range_width = range.getBoundingClientRect().width - 36
        const range_left = range.getBoundingClientRect().left
        let left = range_left + fraction * range_width
        if (val < 10) {
            left += 6
        } else if (val < 100) {
            left += 3
        }
        bubble.style.left = `${left}px`
        document.getElementById('sn-dists-age').innerText = bubble.innerText
        if (max_times[val] >= 50) {
            bubble.style.backgroundColor = 'var(--primary-dark)'
        } else {
            bubble.style.backgroundColor = 'var(--primary)'
        }
    })
    range.addEventListener('mouseover', function () {
        bubble.style.opacity = 1
    })
    range.addEventListener('mouseout', function () {
        bubble.style.opacity = 0
    })
    range.dispatchEvent(new Event('input'))

    const play = document.getElementById('sn-dists-play')
    const pause = document.getElementById('sn-dists-pause')

    play.addEventListener('click', function () {
        intervalID = setInterval(function () {
            let new_value = parseInt(range.value) + direction
            if (new_value < 0 || new_value > max_times.length - 1) {
                direction *= -1
                new_value += direction
            }
            range.value = new_value
            range.dispatchEvent(new Event('input'))
        }, interval_time)
        this.disabled = true
        pause.disabled = false
    })

    pause.addEventListener('click', function () {
        clearInterval(intervalID)
        play.disabled = false
        this.disabled = true
    })

    document.getElementById('sn-dists-slower').addEventListener('click', function () {
        interval_time = Math.round(Math.min(1000, interval_time * 2))
        pause.click()
        play.click()
    })

    document.getElementById('sn-dists-faster').addEventListener('click', function () {
        interval_time = Math.round(Math.max(15, interval_time / 2))
        pause.click()
        play.click()
    })

    models.forEach((model) => {
        let el = document.createElement('button')
        el.classList.add('btn', 'btn', 'sn-dists-btn')
        const i = models.indexOf(model)
        if (i < 11) {
            el.style.backgroundColor = 'rgb(97, 201, 206)'
        } else if (i < 22) {
            el.style.backgroundColor = 'var(--primary-light)'
        } else if (i < 25) {
            el.style.backgroundColor = 'var(--primary)'
        }
        el.setAttribute('id', 'sn-dists-' + model)
        el.addEventListener('click', function () {
            build_sn_dists_histogram(model)
            document.querySelectorAll('.sn-dists-btn').forEach((e) => {
                e.classList.remove('active')
            })
            this.classList.add('active')
        })
        el.innerText = model_labels[i]
        if (model === 'fiducial') {
            el.classList.add('active')
        }
        document.getElementById('sn-dists-switcher').appendChild(el)
    })

    document.getElementById('home').addEventListener('click', function () {
        window.location.href = '../../index.html'
    })
})

function deepClone(obj) {
    /* Deep clone an object */
    if (typeof obj !== 'object' || obj === null) {
        return obj
    }
    let clone = {}
    for (let key in obj) {
        clone[key] = deepClone(obj[key])
    }
    return clone
}

function build_sn_dists_histogram(model) {
    fetch('../../data/feedback/plotly-feedback-sn-dists-by-time.h5')
        .then((response) => response.arrayBuffer())
        .then(function (buffer) {
            var f = new hdf5.File(buffer, 'plotly-feedback-sn-dists-by-time.h5')
            histograms(f, model)
        })
}

function histograms(f, model) {
    const dark_mode = document.getElementById('dark-mode-checkbox').checked
    let bg = dark_mode ? '#333' : 'white'
    let anti_bg = dark_mode ? 'white' : '#333'
    let grey = dark_mode ? '#595656' : '#eee'

    // logs the keys in the HDF5 file
    console.log(f.keys)

    let bin_centres = f.get('bin_centres').value
    let bin_widths = f.get('bin_widths').value
    let max_times = f.get('max_times').value
    let hists = reshapeTo3D(f.get(model).value, 4, max_times.length, bin_centres.length)

    const colours = ['#b778d5', '#4eb89d', '#2a788e', '#87ceeb']
    const labels = ['Merger Product', 'Secondary', 'Primary', 'Effectively Single']
    const n_types = hists.length
    const data = []
    for (let t = 0; t < n_types; t++) {
        data.push({
            x: bin_centres,
            y: hists[t][0], // First time index
            type: 'bar',
            name: labels[t],
            marker: { color: colours[t] },
            width: bin_widths,
        })
    }

    // Create frames, one for each max_time index
    const frames = max_times.map((time, t_idx) => {
        const frame_data = []
        for (let type_idx = 0; type_idx < n_types; type_idx++) {
            frame_data.push({
                x: bin_centres,
                y: hists[type_idx][t_idx],
                type: 'bar',
                name: labels[type_idx],
                marker: { color: colours[type_idx] },
                width: bin_widths,
            })
        }

        return {
            name: `t${t_idx}`,
            data: frame_data,
        }
    })

    const fs = 20

    const layout = {
        title: 'Stacked Histograms of SN Distances',
        barmode: 'stack',
        bargap: 0.0,
        bargroupgap: 0.0,
        xaxis: {
            title: {
                // label with latex as log10(distance)
                text: '$\\Large \\mathrm{Distance\\ from\\ parent\\ cluster, } \\log_{10}(d / {\\rm pc})$',
                standoff: 10,
                font: {
                    size: 50,
                },
            },
            tickfont: {
                size: fs,
            },
        },
        yaxis: {
            title: {
                text: 'Number of supernovae',
                standoff: 10,
                font: {
                    size: 1.2 * fs,
                },
            },
            range: [0, 15000],
            tickfont: {
                size: fs,
            },
        },
        legend: {
            x: 0.5,
            y: 1.0,
            xanchor: 'center',
            yanchor: 'top',
            orientation: 'h',
        },
        paper_bgcolor: bg,
        plot_bgcolor: bg,
        font: {
            color: anti_bg,
        },
    }

    const config = {
        responsive: true,
        modeBarButtonsToRemove: ['zoomIn2d', 'zoomOut2d', 'select2d', 'lasso2d', 'autoScale2d'],
        displaylogo: false,
    }

    function prep_hist_plot() {
        Plotly.addFrames('histograms', frames)

        document.getElementById('sn-dists-slider').removeEventListener('input', animate_hist)
        function animate_hist() {
            Plotly.animate('histograms', frames[this.value], {
                mode: 'immediate',
                transition: { duration: 0 },
                frame: { duration: 0, redraw: true },
            })
        }

        document.getElementById('sn-dists-slider').addEventListener('input', animate_hist)
    }

    // if the plot hasn't been created yet, create it
    if (document.getElementById('histograms').innerHTML === '') {
        Plotly.newPlot('histograms', data, layout, config).then(() => {
            // do the regular prep
            prep_hist_plot()

            // also setup the stack and separate buttons
            document.getElementById('stack-mode').addEventListener('click', function () {
                Plotly.relayout('histograms', {
                    barmode: 'stack',
                })
                Plotly.restyle('histograms', { opacity: [1, 1, 1, 1] })
                this.classList.add('active')
                document.getElementById('separate-mode').classList.remove('active')
            })

            document.getElementById('separate-mode').addEventListener('click', function () {
                Plotly.relayout('histograms', {
                    barmode: 'group',
                })
                Plotly.restyle('histograms', { opacity: [0.6, 0.6, 0.6, 0.6] })
                this.classList.add('active')
                document.getElementById('stack-mode').classList.remove('active')
            })
            document.getElementById('sn-dists-slider').value = 200
            document.getElementById('sn-dists-slider').dispatchEvent(new Event('input'))
            setTimeout(() => {
                document.getElementById('sn-dists-slider').dispatchEvent(new Event('input'))
            }, 500)
        })
    } else {
        // otherwise, just update the data and re-animate
        prep_hist_plot()
        Plotly.animate('histograms', frames[document.getElementById('sn-dists-slider').value], {
            mode: 'immediate',
            transition: { duration: 0 },
            frame: { duration: 0, redraw: true },
        })
    }
}

function build_percentiles_plots() {
    fetch('../../data/feedback/plotly-stats.h5')
        .then((response) => response.arrayBuffer())
        .then(function (buffer) {
            var f = new hdf5.File(buffer, 'plotly-stats.h5')
            percentiles(f)
        })
}

function percentiles(f) {
    const dark_mode = document.getElementById('dark-mode-checkbox').checked
    let bg = dark_mode ? '#333' : 'white'
    let anti_bg = dark_mode ? 'white' : '#333'
    let grey = dark_mode ? '#595656' : '#eee'

    // logs the keys in the HDF5 file
    console.log(f.keys)

    const subset_colours = ['#c4c4c4', '#2a788e', '#4eb89d', '#b778d5']
    const subset_labels = ['Total', 'Primary', 'Secondary', 'Merger Product']
    const prefixes = ['', '_p', '_s', '_m']
    const percs = ['2.5', '25', '50', '75', '97.5']
    let files = f.get('file').value
    const x_vals = files.map((_, i) => i)
    let dist_percs = []
    for (let i = 0; i < prefixes.length; i++) {
        let subset = []
        for (let j = 0; j < percs.length; j++) {
            subset.push(f.get(`distance${prefixes[i]}_${percs[j]}`).value)
        }
        dist_percs.push(subset)
    }
    let time_percs = []
    for (let i = 0; i < prefixes.length; i++) {
        let subset = []
        for (let j = 0; j < percs.length; j++) {
            subset.push(f.get(`time${prefixes[i]}_${percs[j]}`).value)
        }
        time_percs.push(subset)
    }
    console.log(dist_percs)

    const full_bar_width = 0.8
    const bar_widths = [full_bar_width, full_bar_width / 3, full_bar_width / 3, full_bar_width / 3]
    const bar_starts = [0, -full_bar_width / 3, 0, full_bar_width / 3]

    const n_models = files.length

    function getMedianLine(p, pid, visible) {
        const lines = []
        subset_x_vals = x_vals.map((x) => x + bar_starts[pid])
        for (let i = 0; i < n_models; i++) {
            const line_col = darken_colour(subset_colours[pid], pid == 0 ? 1000 : 50)
            lines.push({
                x: [subset_x_vals[i]],
                y: [0.001], // Tiny height so it's not visible
                base: [p[pid][2][i]], // Position bar at the median
                width: bar_widths[pid] * (pid == 0 ? 1.18 : 1.1),
                type: 'bar',
                marker: {
                    color: line_col,
                    line: { width: 4, color: line_col },
                },
                legendgroup: subset_labels[pid],
                hoverinfo: 'skip',
                showlegend: false,
                visible: visible,
            })
        }
        return lines
    }

    perc_list = [
        { vals: dist_percs, visible: true, unit: 'pc' },
        { vals: time_percs, visible: false, unit: 'Myr' },
    ]
    traces = []
    for (let perc_ind = 0; perc_ind < perc_list.length; perc_ind++) {
        const percs = perc_list[perc_ind].vals
        for (let pid = 0; pid < prefixes.length; pid++) {
            iqr = []
            for (let i = 0; i < n_models; i++) {
                iqr.push(percs[pid][3][i] - percs[pid][1][i])
            }
            custom_data = []
            for (let i = 0; i < n_models; i++) {
                custom_data.push([percs[pid][2][i], files[i]])
            }
            subset_x_vals = x_vals.map((x) => x + bar_starts[pid])
            traces.push({
                x: subset_x_vals,
                y: iqr,
                base: percs[pid][1],
                type: 'bar',
                name: subset_labels[pid],
                marker: {
                    color: subset_colours[pid],
                    line: {
                        width: pid == 0 ? 3 : 0,
                        color: darken_colour(subset_colours[pid], 1000),
                    },
                },
                width: bar_widths[pid],
                customdata: custom_data,
                legendgroup: subset_labels[pid],
                visible: perc_list[perc_ind].visible,
                hovertemplate: `<b>%{customdata[1]}</b><br>Q25: %{base:.2f}` + perc_list[perc_ind].unit + `<br>Q50: %{customdata[0]:.2f}` + perc_list[perc_ind].unit + `<br>Q75: %{y:.2f}` + perc_list[perc_ind].unit + `<extra></extra>`,
            })
            traces.push(...getMedianLine(percs, pid, perc_list[perc_ind].visible))
        }
    }

    console.log(traces)

    const fs = 20

    const layout = {
        barmode: 'overlay',
        xaxis: {
            title: {
                text: 'Model',
                standoff: 10,
                font: {
                    size: 1.2 * fs,
                },
            },
            tickmode: 'array',
            tickvals: x_vals,
            ticktext: model_labels,
            tickangle: 70,
            automargin: true,
            // make ticks centered on the bars, horizontal alignment
            ticklabelposition: 'inside top',
            range: [-0.5, n_models - 0.5],
        },

        yaxis: {
            title: {
                // label with latex as log10(distance)
                text: '$\\Large \\mathrm{Distance\\ from\\ parent\\ cluster,} \\ d \\ [{\\rm pc}]$',
                standoff: 10,
            },
            tickfont: {
                size: fs,
            },
            range: [0, 270],
            automargin: true,
        },
        legend: {
            x: 0.5,
            y: 1.0,
            xanchor: 'center',
            yanchor: 'top',
            orientation: 'h',
        },

        bargap: 0.2,
        showlegend: true,
        paper_bgcolor: bg,
        plot_bgcolor: bg,
        font: {
            color: anti_bg,
        },
    }

    const config = {
        responsive: true,
        modeBarButtonsToRemove: ['zoomIn2d', 'zoomOut2d', 'select2d', 'lasso2d', 'autoScale2d'],
        displaylogo: false,
    }

    Plotly.newPlot('percentiles', traces, layout, config).then(() => {
        document.getElementById('percentiles-time').addEventListener('click', function () {
            Plotly.relayout('percentiles', {
                yaxis: {
                    title: {
                        // label with latex as log10(distance)
                        text: '$\\Large \\mathrm{Supernova\\ time,} \\ t \\ [{\\rm Myr}]$',
                        standoff: 10,
                    },
                    tickfont: {
                        size: fs,
                    },
                    range: [0, 110],
                    automargin: true,
                },
            })
            Plotly.restyle('percentiles', { visible: traces.map((_, i) => i >= traces.length / 2) })
            this.classList.add('active')
            document.getElementById('percentiles-dist').classList.remove('active')
        })
        document.getElementById('percentiles-dist').addEventListener('click', function () {
            Plotly.relayout('percentiles', {
                yaxis: {
                    title: {
                        // label with latex as log10(distance)
                        text: '$\\Large \\mathrm{Distance\\ from\\ parent\\ cluster,} \\ d \\ [{\\rm pc}]$',
                        standoff: 10,
                    },
                    tickfont: {
                        size: fs,
                    },
                    range: [0, 270],
                    automargin: true,
                },
            })
            Plotly.restyle('percentiles', { visible: traces.map((_, i) => i < traces.length / 2) })
            this.classList.add('active')
            document.getElementById('percentiles-time').classList.remove('active')
        })
        document.querySelectorAll('.perc-subset-switcher').forEach((el) => {
            el.addEventListener('click', function () {
                const x_min = parseInt(this.getAttribute('data-min'))
                const x_max = parseInt(this.getAttribute('data-max'))
                Plotly.relayout('percentiles', {
                    xaxis: {
                        title: {
                            text: 'Model',
                            standoff: 10,
                            font: {
                                size: 1.2 * fs,
                            },
                        },
                        tickmode: 'array',
                        tickvals: x_vals,
                        ticktext: model_labels,
                        tickangle: 70,
                        automargin: true,
                        // make ticks centered on the bars, horizontal alignment
                        ticklabelposition: 'inside top',
                        range: [x_min - 0.5, x_max - 0.5],
                    },
                })
                this.classList.add('active')
                document.querySelectorAll('.perc-subset-switcher').forEach((e) => {
                    if (e !== this) {
                        e.classList.remove('active')
                    }
                })
            })
        })
    })
}

// HELPER FUNCTIONS

function reshapeTo3D(flatArray, d1, d2, d3) {
    if (flatArray.length !== d1 * d2 * d3) {
        throw new Error('Array length does not match specified dimensions')
    }

    const result = []
    let index = 0

    for (let i = 0; i < d1; i++) {
        const subArray2D = []
        for (let j = 0; j < d2; j++) {
            const subArray1D = []
            for (let k = 0; k < d3; k++) {
                subArray1D.push(flatArray[index++])
            }
            subArray2D.push(subArray1D)
        }
        result.push(subArray2D)
    }

    return result
}

function darken_colour(colour, amount) {
    const rgb = hexToRgb(colour)
    if (!rgb) {
        return colour
    }

    const darkenedRgb = {
        r: Math.max(0, rgb.r - amount),
        g: Math.max(0, rgb.g - amount),
        b: Math.max(0, rgb.b - amount),
    }

    return rgbToHex(darkenedRgb)
}

function hexToRgb(hex) {
    hex = hex.replace(/^#/, '')

    const bigint = parseInt(hex, 16)
    const r = (bigint >> 16) & 255
    const g = (bigint >> 8) & 255
    const b = bigint & 255

    return { r, g, b }
}

function rgbToHex(rgb) {
    return `#${componentToHex(rgb.r)}${componentToHex(rgb.g)}${componentToHex(rgb.b)}`
}

function componentToHex(c) {
    const hex = c.toString(16)
    return hex.length === 1 ? `0${hex}` : hex
}
