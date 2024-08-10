let tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'))
let tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
    return new bootstrap.Tooltip(tooltipTriggerEl)
})

// Globals for animations
let intervalID
let direction = 1
let interval_time = 70
const time_range = [
    0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118, 119, 120,
    121, 122, 123, 124, 125, 126, 127, 128, 129, 130, 131, 132, 133, 134, 135, 136, 137, 138, 139, 140, 141, 142, 143, 144, 145, 146, 147, 148, 149, 150, 151, 152, 153, 154, 155, 156, 157, 158, 159, 160, 161, 161.7, 161.71, 161.72, 161.73, 161.74, 161.75, 161.76, 161.77, 161.78, 161.79, 161.8, 161.81, 161.82, 161.83, 161.84, 161.85, 161.86, 161.87, 161.88, 161.89, 161.9, 161.91, 161.92, 161.93, 161.94, 161.95, 161.96, 161.97, 161.98, 161.99, 162, 163, 164, 165, 166, 167, 168, 169, 170, 171, 172,
    173, 174, 175, 176, 177, 178, 179, 180, 181, 182, 183, 184, 185, 186, 187, 188, 189, 190, 191, 192, 193, 194, 195, 196, 197, 198, 199, 200, 201, 202, 203, 204, 205, 206, 207, 208, 209, 210, 211, 212, 213, 214, 215, 216, 217, 218, 219, 220, 221, 222, 223, 224, 225, 226, 227, 228, 229, 230, 231, 232, 233, 234, 235, 236, 237, 238, 239, 240, 241, 242, 243, 244, 245, 246, 247, 248, 249, 250, 251, 252, 253, 254, 255, 256, 257, 258, 259, 260, 261, 262, 263, 264, 265, 266, 267, 268, 269, 270, 271,
    272, 273, 274, 275, 276, 277, 278, 279, 280, 281, 282, 283, 284, 285, 286, 287, 288, 289, 290, 291, 292, 293, 294, 295, 296, 297, 298, 299, 300,
]

const xc_range = ['0.69905', '0.53', '0.47', '0.3', '0.1', '0.01']

const plasma = [
    ['0.0', 'rgb(13, 8, 135)'],
    ['0.1', 'rgb(65, 4, 157)'],
    ['0.2', 'rgb(106, 0, 168)'],
    ['0.3', 'rgb(143, 13, 164)'],
    ['0.4', 'rgb(177, 42, 144)'],
    ['0.5', 'rgb(204, 71, 120)'],
    ['0.6', 'rgb(225, 100, 98)'],
    ['0.7', 'rgb(242, 132, 75)'],
    ['0.8', 'rgb(252, 166, 54)'],
    ['0.9', 'rgb(252, 206, 37)'],
    ['1.0', 'rgb(240, 249, 33)'],
]

make_plot()

this.window.addEventListener('load', function () {
    document.getElementById('dark-mode-checkbox').addEventListener('change', function () {
        // TODO: different plot names
        const plots = ['hrd', 'xh-profile', 'bv-profile', 'psp']
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

    range.addEventListener('input', function () {
        const val = range.value
        const min = range.min ? range.min : 0
        const max = range.max ? range.max : 100
        const fraction = Number((val - min) / (max - min))
        bubble.innerText = String(time_range[val]).padStart(3, ' ')

        const range_width = range.getBoundingClientRect().width - 36
        const range_left = range.getBoundingClientRect().left
        let left = range_left + fraction * range_width
        if (val < 10) {
            left += 6
        } else if (val < 100) {
            left += 3
        }
        bubble.style.left = `${left}px`
        document.getElementById('profile-age').innerText = time_range[val]
        if (time_range[val] > 161.7 && time_range[val] <= 162) {
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

    let data = []
    const unique_types = [...new Set(types)]
    const colours = ['#ffd700', '#44bf70', '#2a788e', '#87ceeb']
    const labels = ['Merger Product', 'Secondary', 'Primary', 'Effectively Single']
    for (let i = 0; i < unique_types.length; i++) {
        let type = unique_types[i]
        let type_indices = types.map((x) => x === type)
        let type_dists = dists.filter((_, i) => type_indices[i])
        let type_times = times.filter((_, i) => type_indices[i])

        // apply log10 to the distances
        type_dists = type_dists.map((x) => Math.log10(x))

        console.log(Math.log10(2), Math.log10(2e3))

        data.push({
            x: type_dists,
            type: 'histogram',
            name: labels[type],
            nbinsx: 150,
            // xbins: {
            //     start: 0,
            //     end: 3.5,
            //     size: 75,
            // },
            marker: { color: colours[i] },
        })
    }

    let layout = {
        xaxis: {
            title: {
                text: 'Distance from parent cluster (pc)',
                standoff: 10,
            },
            // use a log scale
            // type: 'log',
            // set the range to be the same as the data
            range: [0, 3.5],
        },
        yaxis: {
            title: {
                text: 'Number of supernovae',
                standoff: 10,
            },
            range: [0, 2500],
        },
        barmode: 'stack',
    }

    // var layout = {
    //     xaxis: {
    //         title: {
    //             text: '$\\log_{10} (T_{\\rm eff} / {\\rm K})$',
    //             standoff: 10,
    //         },
    //         hoverformat: '1.2f',
    //         zerolinecolor: grey,
    //         gridcolor: grey,
    //         range: [4.6, 3.55],
    //         automargin: true,
    //     },
    //     yaxis: {
    //         title: {
    //             // text: '$X_{\\rm H}$',
    //             text: '$\\log_{10} (L / L_{\\odot})$',
    //             standoff: 10,
    //         },
    //         hoverformat: '1.3f',
    //         zerolinecolor: grey,
    //         gridcolor: grey,
    //         ticklen: 5,
    //         tickcolor: bg,
    //         range: [1.65, 3],
    //         automargin: true,
    //     },
    //     paper_bgcolor: bg,
    //     plot_bgcolor: bg,
    //     font: {
    //         color: anti_bg,
    //     },
    //     showlegend: true,
    //     legend: {
    //         x: 0.4,
    //         xanchor: 'right',
    //         y: 0,
    //     },
    //     margin: {
    //         t: 30,
    //         b: 0,
    //         l: 0,
    //         r: 0,
    //     },
    //     hovermode: 'closest',
    // }

    // config = {
    //     responsive: true,
    //     modeBarButtonsToRemove: ['zoomIn2d', 'zoomOut2d', 'select2d', 'lasso2d', 'autoScale2d'],
    //     displaylogo: false,
    // }

    Plotly.newPlot('histograms', data, layout)
}
