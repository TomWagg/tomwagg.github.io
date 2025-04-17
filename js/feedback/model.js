this.window.addEventListener('load', function () {
    const range = document.getElementById('model-slider')
    const bubble = document.getElementById('model-slider-bubble')

    range.addEventListener('input', function () {
        console.log(range.value)
        const val = range.value
        const min = range.min ? range.min : 0
        const max = range.max ? range.max : 100
        const fraction = Number((val - min) / (max - min))
        bubble.innerText = String(val).padStart(2, ' ')

        const range_width = range.getBoundingClientRect().width - 36
        const range_left = range.getBoundingClientRect().left
        let left = range_left + fraction * range_width
        if (val < 10) {
            left += 6
        } else if (val < 100) {
            left += 3
        }
        bubble.style.left = `${left}px`
        document.getElementById('model-feh').innerText = bubble.innerText
    })
    range.addEventListener('mouseover', function () {
        bubble.style.opacity = 1
    })
    range.addEventListener('mouseout', function () {
        bubble.style.opacity = 0
    })
    range.dispatchEvent(new Event('input'))
})

function getRateParameters(FeH = 0, a1 = 0.38, a2 = 0.47, a3 = 0.22, a4 = 0.13, a5 = 0.1, a6 = 0.175, t1 = 3.5, t2 = 6, t3 = 23, t4 = 28, t5 = 45.5, t6 = 200) {
    a1 += 0.13 * FeH
    a2 += 0.05 * FeH
    a3 += 0.02 * FeH
    a6 += 0.05 * FeH
    t3 -= 6.5 * FeH
    t4 -= 6.5 * FeH
    t5 -= 16.5 * FeH

    const a = [a1, a2, a3, a4, a5, a6]
    const ts = [t1, t2, t3, t4, t5, t6]

    const psi = []
    for (let i = 0; i < a.length - 1; i++) {
        psi.push(Math.log(a[i + 1] / a[i]) / Math.log(ts[i + 1] / ts[i]))
    }

    return { a, ts, psi }
}

function analytic_model_time_pdf(t, FeH = Math.log10(0.017 / 0.0142)) {
    const { a, ts, psi } = getRateParameters(FeH)

    if (t < ts[0] || t > ts[ts.length - 1]) {
        return 0.0
    } else if (t < ts[1]) {
        return a[0] * Math.pow(t / ts[0], psi[0])
    } else if (t < ts[2]) {
        return a[1] * Math.pow(t / ts[1], psi[1])
    } else if (t < ts[3]) {
        return a[2] * Math.pow(t / ts[2], psi[2])
    } else if (t < ts[4]) {
        return a[3] * Math.pow(t / ts[3], psi[3])
    } else if (t < ts[5]) {
        return a[5] * Math.exp(-t / ts[4])
    } else {
        return 0.0
    }
}

function analytic_model_vel_pdf(v, FeH) {
    const f_no_MT = 0.14 - 0.12 * FeH
    const f_caseA = 0.12 + 0.035 * FeH
    const f_caseB = 0.67 + 0.12 * FeH
    const f_CE = 0.06 - 0.03 * FeH

    const factor = -1.8 + Math.sqrt(Math.abs(FeH)) * 0.5
    const f1 = factor + 1

    const no_mt_fit = Math.pow((Math.pow(100, f1) - Math.pow(5, f1)) / f1, -1) * Math.pow(v, factor)

    const mu_caseA = 22 - 8 * FeH
    const sigma_caseA = 6 - 3 * FeH
    const caseA_fit = normal(v, mu_caseA, sigma_caseA)

    const alpha_caseB = 1.5 - 1.5 * FeH
    const beta_caseB = 18 + 5 * FeH

    const vmin = 5
    const vmax = 95
    const caseB_fit = beta(v, alpha_caseB, beta_caseB, vmin, vmax)

    const CE_fit = beta(v, 5 - 4 * FeH, 10, vmin, vmax)

    return f_no_MT * no_mt_fit + f_caseA * caseA_fit + f_caseB * caseB_fit + f_CE * CE_fit
}

function build_model_line_plot() {
    const dark_mode = document.getElementById('dark-mode-checkbox').checked
    let bg = dark_mode ? '#333' : 'white'
    let anti_bg = dark_mode ? 'white' : '#333'

    const FeH_vals = []
    for (let FeH = -2.0; FeH <= 0.2; FeH += 0.01) {
        FeH_vals.push(parseFloat(FeH.toFixed(2)))
    }

    // array t_vals is from 0 to 200 with spacing of 0.01
    const t_vals = Array.from({ length: 20000 }, (_, i) => i * 0.01)

    // array v_vals is from 5 to 100 with spacing of 0.01
    const v_vals = Array.from({ length: 9500 }, (_, i) => 5 + i * 0.01)
    const initialFeH = FeH_vals[0]

    const trace_f = {
        x: t_vals,
        y: t_vals.map((t) => analytic_model_time_pdf(t, initialFeH)),
        mode: 'lines',
        line: { color: '#b21117', width: 3 },
        name: 'Core-collapse SN Rate',
        xaxis: 'x1',
        yaxis: 'y1',
        fill: 'tozeroy',
    }

    const trace_g = {
        x: v_vals,
        y: v_vals.map((v) => analytic_model_vel_pdf(v, initialFeH)),
        mode: 'lines',
        line: { color: '#b21117', width: 3 },
        name: 'Ejection velocity PDF',
        xaxis: 'x2',
        yaxis: 'y2',
        fill: 'tozeroy',
    }

    const frames = FeH_vals.map((FeH) => ({
        name: `${FeH}`,
        data: [
            {
                x: t_vals,
                y: t_vals.map((t) => analytic_model_time_pdf(t, FeH)),
            },
            {
                x: v_vals,
                y: v_vals.map((v) => analytic_model_vel_pdf(v, FeH)),
            },
        ],
        layout: {
            title: `PDFs at [Fe/H] = ${FeH}`,
        },
    }))

    const layout = {
        grid: { rows: 1, columns: 2, pattern: 'independent' },
        xaxis: {
            title: {
                text: 'Time since starburst [Myr]',
                standoff: 10,
                font: {
                    size: 1.2 * fs,
                },
            },
            tickfont: {
                size: fs,
            },
            range: [0, 200],
        },
        yaxis: {
            title: {
                text: '$\\Large \\mathcal{R}_{\\rm CCSN}(t, Z)$',
                standoff: 10,
                font: {
                    size: 1.2 * fs,
                },
            },
            range: [0, 0.5],
            tickfont: {
                size: fs,
            },
        },
        xaxis2: {
            title: {
                text: 'Ejection velocity [km/s]',
                standoff: 10,
                font: {
                    size: 1.2 * fs,
                },
            },
            tickfont: {
                size: fs,
            },
            range: [5, 100],
        },
        yaxis2: {
            title: {
                text: '$\\Large p_{\\rm ejected}(v, Z)$',
                standoff: 10,
                font: {
                    size: 1.2 * fs,
                },
            },
            range: [0, 0.11],
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
        showlegend: false,
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

    Plotly.newPlot('model', [trace_f, trace_g], layout, config).then(() => {
        Plotly.addFrames('model', frames)

        document.getElementById('model-slider').addEventListener('input', () => {
            val = document.getElementById('model-slider').value
            Plotly.animate('model', frames[FeH_vals.indexOf(parseFloat(val))], {
                mode: 'immediate',
                transition: { duration: 0 },
                frame: { duration: 0, redraw: true },
            })
        })
    })
}

build_model_line_plot()

// Distributions

function normal(x, mean, stdDev) {
    const exponent = -0.5 * Math.pow((x - mean) / stdDev, 2)
    const coefficient = 1 / (stdDev * Math.sqrt(2 * Math.PI))
    return coefficient * Math.exp(exponent)
}

function beta(x, a, b, loc = 0, scale = 1) {
    // Transform x to [0, 1] range
    const z = (x - loc) / scale
    if (z < 0 || z > 1) return 0

    // Gamma function using Lanczos approximation
    function gamma(z) {
        const g = 7
        const p = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7]

        if (z < 0.5) {
            return Math.PI / (Math.sin(Math.PI * z) * gamma(1 - z))
        }

        z -= 1
        let x = p[0]
        for (let i = 1; i < g + 2; i++) {
            x += p[i] / (z + i)
        }

        const t = z + g + 0.5
        return Math.sqrt(2 * Math.PI) * Math.pow(t, z + 0.5) * Math.exp(-t) * x
    }

    function betaFunc(a, b) {
        return (gamma(a) * gamma(b)) / gamma(a + b)
    }

    // Scaled beta pdf
    return ((1 / scale) * Math.pow(z, a - 1) * Math.pow(1 - z, b - 1)) / betaFunc(a, b)
}

function sample_from_pdf(pdf, x_min, x_max, n_samples = 1, num_points = 1000) {
    // Step 1: Create x grid
    const dx = (x_max - x_min) / (num_points - 1)
    const x_values = Array.from({ length: num_points }, (_, i) => x_min + i * dx)

    // Step 2: Evaluate PDF and normalize
    const pdf_values = x_values.map((x) => pdf(x))
    const total = pdf_values.reduce((sum, val) => sum + val, 0)
    const normalized_pdf = pdf_values.map((p) => p / total)

    // Step 3: Build CDF
    const cdf = []
    let cum_sum = 0
    for (let i = 0; i < normalized_pdf.length; i++) {
        cum_sum += normalized_pdf[i]
        cdf.push(cum_sum)
    }

    // Step 4: Draw all samples
    const samples = []
    for (let k = 0; k < n_samples; k++) {
        const u = Math.random()

        // Binary search to find the right bin in CDF
        let low = 0
        let high = cdf.length - 1
        while (low < high) {
            const mid = Math.floor((low + high) / 2)
            if (cdf[mid] < u) {
                low = mid + 1
            } else {
                high = mid
            }
        }

        // Interpolate within the bin
        const i = Math.max(1, low)
        const x0 = x_values[i - 1]
        const x1 = x_values[i]
        const c0 = cdf[i - 1]
        const c1 = cdf[i]
        const t = (u - c0) / (c1 - c0)
        samples.push(x0 + t * (x1 - x0))
    }

    return samples
}

// const FeH = Math.log10(0.017 / 0.0142)
// const t_sample = sample_from_pdf((t) => analytic_model_time_pdf(t, FeH), 0, 200, 100000)
// console.log('Time sample:', t_sample)
