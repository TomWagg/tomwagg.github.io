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
    fetch('../../data/asteroseismology/hrd.h5')
        .then((response) => response.arrayBuffer())
        .then(function (buffer) {
            var f = new hdf5.File(buffer, 'hrd.h5')
            hrd(f)
        })
    fetch('../../data/asteroseismology/profile_data.h5')
        .then((response) => response.arrayBuffer())
        .then(function (buffer) {
            var f = new hdf5.File(buffer, 'profile_data.h5')
            profile_plots(f)
        })
    fetch('../../data/asteroseismology/psp.h5')
        .then((response) => response.arrayBuffer())
        .then(function (buffer) {
            var f = new hdf5.File(buffer, 'psp.h5')
            psp(f)
        })
}

function hrd(f) {
    const dark_mode = document.getElementById('dark-mode-checkbox').checked
    let bg = dark_mode ? '#333' : 'white'
    let anti_bg = dark_mode ? 'white' : '#333'
    let grey = dark_mode ? '#595656' : '#eee'

    let data = [
        {
            x: f.get('donor_no_detach/log_Teff').value,
            y: f.get('donor_no_detach/log_L').value,
            customdata: f.get('donor_no_detach/star_age').value,
            mode: 'markers',
            marker: {
                size: 5,
                color: f.get('donor_no_detach/log_abs_mdot').value,
                colorscale: plasma,
                colorbar: {
                    title: 'Log Mass Loss Rate<br>[Msun / year]',
                    titleside: 'right',
                },
            },
            hovertemplate: 'Donor<br>Teff: 10^%{x:1.2f} K<br>L: 10^%{y:1.2f} Lsun<br>Mdot: 10^%{marker.color:1.2f} Msun / year<br>Age: %{customdata:1.2f} Myr<extra></extra>',
            name: 'Donor',
            showlegend: false,
        },
        {
            x: f.get('accretor/log_Teff').value,
            y: f.get('accretor/log_L').value,
            type: 'line',
            line: { color: '#86d934', width: 8 },
            hoverinfo: 'none',
            showlegend: false,
        },
        {
            x: f.get('accretor/log_Teff').value,
            y: f.get('accretor/log_L').value,
            customdata: f.get('accretor/star_age').value,
            mode: 'markers',
            marker: {
                size: 5,
                color: f.get('accretor/log_abs_mdot').value,
                colorscale: plasma,
            },
            hovertemplate: 'Accretor<br>Teff: 10^%{x:1.2f} K<br>L: 10^%{y:1.2f} Lsun<br>Mdot: 10^%{marker.color:1.2f} Msun / year<br>Age: %{customdata:1.2f} Myr<extra></extra>',
            name: 'Accretor',
            showlegend: false,
        },
        {
            x: [4.168956386113182],
            y: [2.3750136585921697],
            mode: 'markers',
            marker: {
                size: 15,
                color: 'rgba(0, 0, 0, 0)',
                line: { color: 'red', width: 3 },
            },
            hovertemplate: 'Zero-age main sequence<extra></extra>',
            name: 'Donor marker',
        },
        {
            x: [4.0851762555044555],
            y: [1.902796758284236],
            mode: 'markers',
            marker: {
                size: 15,
                color: 'rgba(0, 0, 0, 0)',
                symbol: 'diamond',
                line: { color: 'red', width: 3 },
            },
            hovertemplate: 'Zero-age main sequence<extra></extra>',
            name: 'Accretor marker',
        },
    ]

    // Ms = [3.0, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 4.0]
    // for (let i = 0; i < Ms.length; i++) {
    //     data.push({
    //         x: f.get('single_' + Ms[i].toFixed(1) + '/log_Teff').value,
    //         y: f.get('single_' + Ms[i].toFixed(1) + '/log_L').value,
    //         type: 'line',
    //         line: { color: 'lightgrey', width: 1 },
    //         hoverinfo: 'none',
    //         showlegend: false,
    //     })
    // }

    var layout = {
        xaxis: {
            title: {
                text: '$\\log_{10} (T_{\\rm eff} / {\\rm K})$',
                standoff: 10,
            },
            hoverformat: '1.2f',
            zerolinecolor: grey,
            gridcolor: grey,
            range: [4.6, 3.55],
            automargin: true,
        },
        yaxis: {
            title: {
                // text: '$X_{\\rm H}$',
                text: '$\\log_{10} (L / L_{\\odot})$',
                standoff: 10,
            },
            hoverformat: '1.3f',
            zerolinecolor: grey,
            gridcolor: grey,
            ticklen: 5,
            tickcolor: bg,
            range: [1.65, 3],
            automargin: true,
        },
        paper_bgcolor: bg,
        plot_bgcolor: bg,
        font: {
            color: anti_bg,
        },
        showlegend: true,
        legend: {
            x: 0.4,
            xanchor: 'right',
            y: 0,
        },
        margin: {
            t: 30,
            b: 0,
            l: 0,
            r: 0,
        },
        hovermode: 'closest',
    }

    config = {
        responsive: true,
        modeBarButtonsToRemove: ['zoomIn2d', 'zoomOut2d', 'select2d', 'lasso2d', 'autoScale2d'],
        displaylogo: false,
    }

    Plotly.newPlot('hrd', data, layout, config)

    const group_ids = [
        ['hrd-d-movers', 3],
        ['hrd-a-movers', 4],
    ]
    for (let i = 0; i < group_ids.length; i++) {
        let group_id = group_ids[i][0]
        let trace_id = group_ids[i][1]
        console.log(group_id, trace_id)
        document.querySelectorAll('#' + group_id + ' button').forEach((el) => {
            el.addEventListener('click', () => {
                document.querySelectorAll('#' + group_id + ' button').forEach((mover) => {
                    mover.classList.remove('active')
                })
                el.classList.add('active')
                Plotly.animate('hrd', [
                    {
                        data: [{ x: [el.getAttribute('data-x')], y: [el.getAttribute('data-y')], hovertemplate: el.innerText + '<extra></extra>' }],
                        traces: [trace_id],
                    },
                    {
                        transition: {
                            duration: 1000,
                            easing: 'cubic-in-out',
                        },
                        frame: {
                            duration: 1000,
                            redraw: false,
                        },
                    },
                ])
            })
        })
    }
}

function profile_plots(f) {
    const dark_mode = document.getElementById('dark-mode-checkbox').checked
    let bg = dark_mode ? '#333' : 'white'
    let anti_bg = dark_mode ? 'white' : '#333'
    let grey = dark_mode ? '#595656' : '#eee'

    // transform data into frame lists for each plot
    let xh_frames = []
    let bv_frames = []
    for (let i = 0; i < time_range.length; i++) {
        let s_mass = f.get('t_' + time_range[i].toFixed(2) + '/s/mass').value
        let s_xh = f.get('t_' + time_range[i].toFixed(2) + '/s/xh').value
        let s_bv = f.get('t_' + time_range[i].toFixed(2) + '/s/N').value
        let mg_mass = f.get('t_' + time_range[i].toFixed(2) + '/mg/mass').value
        let mg_xh = f.get('t_' + time_range[i].toFixed(2) + '/mg/xh').value
        let mg_bv = f.get('t_' + time_range[i].toFixed(2) + '/mg/N').value
        xh_frames.push({
            name: 't_' + time_range[i].toFixed(2),
            data: [
                { x: s_mass, y: s_xh },
                { x: mg_mass, y: mg_xh },
            ],
        })
        bv_frames.push({
            name: 't_' + time_range[i].toFixed(2),
            data: [
                { x: s_mass, y: s_bv },
                { x: mg_mass, y: mg_bv },
            ],
        })
    }

    // create slider steps from frames
    let xh_slider_steps = []
    let bv_slider_steps = []
    for (i = 0; i < xh_frames.length; i++) {
        for (let [steps, frames] of [
            [xh_slider_steps, xh_frames],
            [bv_slider_steps, bv_frames],
        ]) {
            steps.push({
                method: 'animate',
                label: time_range[i].toFixed(2),
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
    }

    const labels = ['Single', 'Mass-gainer']
    const colours = ['#fe9f6d', '#641a80']

    let data = []
    for (let i = 0; i < 2; i++) {
        data.push({
            x: xh_frames[0].data[i].x,
            y: xh_frames[0].data[i].y,
            name: labels[i],
            type: 'line',
            line: { width: 5, color: colours[i] },
        })
    }

    var layout = {
        title: 'Hydrogen mass fraction profile',
        xaxis: {
            title: {
                text: '${\\rm Mass} \\, [\\rm M_{\\odot}]$',
                standoff: 10,
            },
            hoverformat: '1.2f',
            zerolinecolor: grey,
            gridcolor: grey,
            range: [0.0, 1.0],
            automargin: true,
        },
        yaxis: {
            title: {
                text: '$X_{\\rm H}$',
                standoff: 10,
            },
            hoverformat: '1.3f',
            zerolinecolor: grey,
            gridcolor: grey,
            ticklen: 5,
            tickcolor: bg,
            range: [0.0, 0.75],
            automargin: true,
        },
        paper_bgcolor: bg,
        plot_bgcolor: bg,
        font: {
            color: anti_bg,
        },
        showlegend: true,
        legend: {
            x: 1,
            xanchor: 'right',
            y: 0,
        },
        margin: {
            t: 30,
            b: 0,
            l: 0,
            r: 0,
        },
    }

    config = {
        responsive: true,
        modeBarButtonsToRemove: ['zoomIn2d', 'zoomOut2d'],
        displaylogo: false,
    }

    Plotly.newPlot('xh-profile', data, layout, config).then(function () {
        Plotly.addFrames('xh-profile', xh_frames)
    })

    data = []
    for (let i = 0; i < 2; i++) {
        data.push({
            x: bv_frames[0].data[i].x,
            y: bv_frames[0].data[i].y,
            fill: 'tozeroy',
            name: labels[i],
            type: 'line',
            line: { width: 3, color: colours[i] },
            hovertemplate: 'N = 10^%{y:1.3f} / day<extra></extra>',
        })
    }

    let new_layout = deepClone(layout)
    new_layout.yaxis = {
        title: {
            text: '$\\log_{10} (N / {\\rm day^{-1}})$',
            standoff: 10,
        },
        hoverformat: '1.3e',
        zerolinecolor: grey,
        gridcolor: 'none',
        ticklen: 5,
        tickcolor: bg,
        range: [2.0, 3.7],
        automargin: true,
    }
    new_layout.title = 'Brunt-Väisälä frequency profile'
    new_layout.xaxis.range = [0.0, 3.5]
    new_layout.legend = { x: 1, y: 1, xanchor: 'right' }

    Plotly.newPlot('bv-profile', data, new_layout, config).then(function () {
        Plotly.addFrames('bv-profile', bv_frames)
    })

    document.getElementById('profile-slider').addEventListener('input', function () {
        Plotly.animate('xh-profile', xh_frames[this.value], {
            mode: 'immediate',
            transition: { duration: 0 },
            frame: { duration: 0, redraw: false },
        })
        Plotly.animate('bv-profile', bv_frames[this.value], {
            mode: 'immediate',
            transition: { duration: 0 },
            frame: { duration: 0, redraw: false },
        })
    })
}

function psp(f) {
    const dark_mode = document.getElementById('dark-mode-checkbox').checked
    let bg = dark_mode ? '#333' : 'white'
    let anti_bg = dark_mode ? 'white' : '#333'
    let grey = dark_mode ? '#595656' : '#eee'

    // transform data into frame lists for each plot
    let frames = []
    for (let i = 0; i < xc_range.length; i++) {
        let s_period = f.get('s/xc_' + xc_range[i] + '/periods').value
        let s_deltap = f.get('s/xc_' + xc_range[i] + '/delta_p').value
        let mg_period = f.get('mg/xc_' + xc_range[i] + '/periods').value
        let mg_deltap = f.get('mg/xc_' + xc_range[i] + '/delta_p').value
        let s_aps = f.get('s/xc_' + xc_range[i]).attrs['aps']
        let mg_aps = f.get('mg/xc_' + xc_range[i]).attrs['aps']
        frames.push({
            name: 'xc_' + xc_range[i],
            data: [
                { x: [0, 4.5], y: [s_aps, s_aps] },
                { x: [0, 4.5], y: [mg_aps, mg_aps] },
                { x: s_period, y: s_deltap },
                { x: mg_period, y: mg_deltap },
            ],
        })
    }

    // create slider steps from frames
    let steps = []
    for (i = 0; i < frames.length; i++) {
        steps.push({
            method: 'animate',
            label: xc_range[i],
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

    const labels = ['Single', 'Mass-gainer']
    const colours = ['#fe9f6d', '#641a80']

    let data = []
    for (let i = 0; i < 2; i++) {
        data.push({
            x: frames[0].data[i].x,
            y: frames[0].data[i].y,
            legendgroup: labels[i],
            name: 'Asymptotic Period Spacing (' + labels[i] + ')',
            mode: 'lines',
            line: { width: 1, color: colours[i], dash: 'dot' },
        })
    }
    for (let i = 2; i < 4; i++) {
        data.push({
            x: frames[0].data[i].x,
            y: frames[0].data[i].y,
            name: labels[i - 2],
            legendgroup: labels[i - 2],
            type: 'line',
            mode: 'lines+markers',
            line: { width: 1, color: colours[i - 2] },
            marker: { size: 10, color: colours[i - 2] },
        })
    }

    var layout = {
        xaxis: {
            title: {
                text: '${\\rm Period} \\, [\\rm days]$',
                standoff: 10,
            },
            hoverformat: '1.2f',
            zerolinecolor: grey,
            gridcolor: grey,
            range: [0.0, 4.1],
            automargin: true,
        },
        yaxis: {
            title: {
                text: '${\\rm Period \\, Spacing}, \\, \\Delta P \\, [\\rm days]$',
                standoff: 10,
            },
            hoverformat: '1.3f',
            zerolinecolor: grey,
            gridcolor: grey,
            ticklen: 5,
            tickcolor: bg,
            range: [0.02, 0.11],
            automargin: true,
        },
        paper_bgcolor: bg,
        plot_bgcolor: bg,
        font: {
            color: anti_bg,
        },
        showlegend: true,
        legend: {
            x: 0.5,
            y: 1.0,
            xanchor: 'center',
            yanchor: 'top',
            orientation: 'h',
        },
        margin: {
            t: 30,
            b: 0,
            l: 0,
            r: 0,
        },
        hovermode: 'closest',
    }

    config = {
        responsive: true,
        modeBarButtonsToRemove: ['zoomIn2d', 'zoomOut2d', 'select2d', 'lasso2d', 'autoScale2d'],
        displaylogo: false,
    }

    Plotly.newPlot('psp', data, layout, config).then(function () {
        Plotly.addFrames('psp', frames)
    })

    const psp_buttons = document.querySelectorAll('#psp-movers button')
    for (let i = 0; i < psp_buttons.length; i++) {
        psp_buttons[i].addEventListener('click', function () {
            document.querySelectorAll('#psp-movers button').forEach((mover) => {
                mover.classList.remove('arrow')
            })
            this.classList.add('arrow')
            Plotly.animate('psp', frames[i], {
                mode: 'immediate',
                transition: { duration: 500 },
                frame: { duration: 500, redraw: false },
            })
        })
    }
}
