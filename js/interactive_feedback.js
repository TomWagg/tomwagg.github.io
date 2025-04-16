let tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'))
let tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
    return new bootstrap.Tooltip(tooltipTriggerEl)
})

// Globals for animations
let intervalID
let direction = 1
let interval_time = 70

make_plot()

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

function make_plot() {
    fetch('../../data/feedback/plotly-feedback-sn-dists-by-time.h5')
        .then((response) => response.arrayBuffer())
        .then(function (buffer) {
            var f = new hdf5.File(buffer, 'plotly-feedback-sn-dists-by-time.h5')
            histograms(f)
        })
}

function histograms(f) {
    const dark_mode = document.getElementById('dark-mode-checkbox').checked
    let bg = dark_mode ? '#333' : 'white'
    let anti_bg = dark_mode ? 'white' : '#333'
    let grey = dark_mode ? '#595656' : '#eee'

    // logs the keys in the HDF5 file
    console.log(f.get('fiducial').keys)

    let bin_centres = f.get('fiducial/bin_centres').value
    let bin_widths = f.get('fiducial/bin_widths').value
    let max_times = f.get('fiducial/max_times').value
    let hists = reshapeTo3D(f.get('fiducial/histograms').value, 4, max_times.length, bin_centres.length)

    const colours = ['#b778d5', '#4eb89d', '#2a788e', '#87ceeb']
    const labels = ['Merger Product', 'Secondary', 'Primary', 'Effectively Single']
    const n_types = hists.length
    const n_times = hists[0].length
    const n_bins = hists[0][0].length

    console.log(bin_centres)

    // let traces = []
    // for (let i = 0; i < labels.length; i++) {
    //     traces.push({
    //         x: bin_centres,
    //         y: hists[i][122],
    //         name: labels[i],
    //         marker: { color: colours[i] },
    //         type: 'bar',
    //         hovertemplate: labels[i] + `<br>Distance (pc): %{x}<br> N_SN: %{y}<extra></extra>`,
    //     })
    // }// Initial traces for the first time (max_times[0]), stacked by type
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

    // Define the slider
    const sliderSteps = max_times.map((time, t_idx) => ({
        method: 'animate',
        label: `t ≤ ${time}`,
        args: [
            [`t${t_idx}`],
            {
                mode: 'immediate',
                transition: { duration: 0 },
                frame: { duration: 0, redraw: true },
            },
        ],
    }))

    const fs = 20

    const layout = {
        title: 'Stacked Histograms of SN Distances',
        barmode: 'stack',
        bargap: 0.0,
        bargroupgap: 0.0,
        xaxis: {
            title: {
                // label with latex as log10(distance)
                text: '$\\Large \\mathrm{Distance\\ from\\ parent\\ cluster, } \\log_{10}(d / {\\rm pc})$)',
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

    Plotly.newPlot('histograms', data, layout, config).then(() => {
        Plotly.addFrames('histograms', frames)

        const range = document.getElementById('profile-slider')
        const bubble = document.getElementById('profile-slider-bubble')
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
            document.getElementById('profile-age').innerText = bubble.innerText
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

        const play = document.getElementById('profile-play')
        const pause = document.getElementById('profile-pause')

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

        document.getElementById('profile-slower').addEventListener('click', function () {
            interval_time = Math.round(Math.min(1000, interval_time * 2))
            pause.click()
            play.click()
        })

        document.getElementById('profile-faster').addEventListener('click', function () {
            interval_time = Math.round(Math.max(15, interval_time / 2))
            pause.click()
            play.click()
        })

        // actual plot animation

        document.getElementById('profile-slider').addEventListener('input', function () {
            Plotly.animate('histograms', frames[this.value], {
                mode: 'immediate',
                transition: { duration: 0 },
                frame: { duration: 0, redraw: true },
            })
        })

        document.getElementById('stack-mode').addEventListener('click', function () {
            Plotly.relayout('histograms', {
                barmode: 'stack',
                yaxis: {
                    range: [0, 15000],
                },
            })
            Plotly.restyle('histograms', { opacity: [1, 1, 1, 1] })
            this.classList.add('active')
            document.getElementById('separate-mode').classList.remove('active')
        })
        document.getElementById('separate-mode').addEventListener('click', function () {
            Plotly.relayout('histograms', {
                barmode: 'group',
                yaxis: {
                    range: [0, 8000],
                },
            })
            Plotly.restyle('histograms', { opacity: [0.6, 0.6, 0.6, 0.6] })
            this.classList.add('active')
            document.getElementById('stack-mode').classList.remove('active')
        })
        document.getElementById('profile-play').click()
        setTimeout(function () {
            document.getElementById('profile-pause').click()
        }, 100)
    })
}

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
