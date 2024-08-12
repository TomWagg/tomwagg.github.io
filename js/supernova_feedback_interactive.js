let tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'))
let tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
    return new bootstrap.Tooltip(tooltipTriggerEl)
})

// Globals for animations
let intervalID
let direction = 1
let interval_time = 70

const time_split = 50
const t_max = 250
let time_range = []
let t = 3
while (t <= t_max) {
    time_range.push(t)
    if (t < time_split) {
        t += 0.5
    } else {
        t += 5
    }
}

// time range is 0 to 50 with 0.25 steps, then 50 to 200 with 10 steps
// const time_range = Array.from({ length: 151 }, (_, i) => i / 4).concat(Array.from({ length: 15 }, (_, i) => i + 50))
console.log(time_range)

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

    const range = document.getElementById('profile-slider')
    const bubble = document.getElementById('profile-slider-bubble')
    range.max = time_range.length - 1

    range.addEventListener('input', function () {
        const val = range.value
        const min = range.min ? range.min : 0
        const max = range.max ? range.max : 100
        const fraction = Number((val - min) / (max - min))
        bubble.innerText = String(time_range[val].toFixed(2)).padStart(3, ' ')

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
        if (time_range[val] >= time_split) {
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
            if (new_value < 0 || new_value > time_range.length - 1) {
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
    fetch('../../data/feedback/dists_times.h5')
        .then((response) => response.arrayBuffer())
        .then(function (buffer) {
            var f = new hdf5.File(buffer, 'dists_times.h5')
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

    let dists = f.get('fiducial/dist').value
    let times = f.get('fiducial/time').value
    let types = f.get('fiducial/type').value

    const unique_types = [...new Set(types)]
    const colours = ['#ffd700', '#44bf70', '#2a788e', '#87ceeb']
    const labels = ['Merger Product', 'Secondary', 'Primary', 'Effectively Single']

    let frames = []
    for (let t_ind = time_range.length - 1; t_ind >= 0; t_ind--) {
        console.log(time_range[t_ind])
        // get all distances and types that occur before time, i
        let time_indices = times.map((x) => x < time_range[t_ind])

        dists = dists.filter((_, i) => time_indices[i])
        types = types.filter((_, i) => time_indices[i])
        times = times.filter((_, i) => time_indices[i])

        console.log(dists.length)

        let data = []

        for (let i = 0; i < unique_types.length; i++) {
            let type = unique_types[i]
            let type_indices = types.map((x) => x === type)
            let type_dists = dists.filter((_, i) => type_indices[i])

            // apply log10 to the distances
            type_dists = type_dists.map((x) => Math.log10(x))

            data.push({
                x: type_dists,
                type: 'histogram',
                name: labels[type],
                xbins: {
                    start: 0,
                    end: 3.5,
                    size: 3.5 / 75,
                },
                marker: { color: colours[i] },
            })
        }

        frames.unshift({
            name: 't_' + time_range[t_ind].toFixed(2),
            data: data,
        })
    }

    // create slider steps from frames
    let steps = []
    for (i = 0; i < frames.length; i++) {
        steps.push({
            method: 'animate',
            label: 't_' + i.toFixed(2),
            args: [
                [frames[i]],
                {
                    mode: 'immediate',
                    transition: { duration: 0 },
                    frame: { duration: 0, redraw: false },
                },
            ],
        })
    }

    data = frames[0].data

    let layout = {
        xaxis: {
            title: {
                text: 'Log10 Distance from parent cluster (pc)',
                standoff: 10,
            },
            range: [0, 3.5],
        },
        yaxis: {
            title: {
                text: 'Number of supernovae',
                standoff: 10,
            },
            range: [0, 2400],
        },
        paper_bgcolor: bg,
        plot_bgcolor: bg,
        font: {
            color: anti_bg,
        },
        barmode: 'stack',
        showlegend: true,
        legend: {
            x: 0.5,
            y: 1.0,
            xanchor: 'center',
            yanchor: 'top',
            orientation: 'h',
        },
    }

    config = {
        responsive: true,
        modeBarButtonsToRemove: ['zoomIn2d', 'zoomOut2d', 'select2d', 'lasso2d', 'autoScale2d'],
        displaylogo: false,
    }

    Plotly.newPlot('histograms', data, layout, config).then(function () {
        Plotly.addFrames('histograms', frames)
    })

    document.getElementById('profile-slider').addEventListener('input', function () {
        console.log(this.value)
        console.log(frames[this.value])
        Plotly.animate('histograms', frames[this.value], {
            mode: 'immediate',
            transition: { duration: 0 },
            frame: { duration: 0, redraw: true },
        })
    })

    document.getElementById('stack-mode').addEventListener('click', function () {
        Plotly.relayout('histograms', {
            barmode: 'stack',
        })
    })
    document.getElementById('separate-mode').addEventListener('click', function () {
        Plotly.relayout('histograms', {
            barmode: 'group',
        })
    })
    document.getElementById('profile-play').click()
}
