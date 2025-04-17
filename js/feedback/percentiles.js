build_percentiles_plots()

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
    const star_forming_mass = f.get('star_forming_mass').value
    let totals_per_100msun = []
    for (let i = 0; i < prefixes.length; i++) {
        let totals = f.get(`total${prefixes[i]}`).value
        let subset = []
        for (let j = 0; j < totals.length; j++) {
            subset.push((totals[j] / star_forming_mass[j]) * 100)
        }
        totals_per_100msun.push(subset)
    }

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

    let perc_list = [
        { vals: dist_percs, visible: true, unit: 'pc' },
        { vals: time_percs, visible: false, unit: 'Myr' },
    ]
    let traces = []
    for (let perc_ind = 0; perc_ind < perc_list.length; perc_ind++) {
        const percs = perc_list[perc_ind].vals
        for (let pid = 0; pid < prefixes.length; pid++) {
            const line_col = darken_colour(subset_colours[pid], pid == 0 ? 1000 : 50)
            traces.push({
                x: [n_models / 2],
                y: [0.001],
                base: [percs[pid][2][0]],
                width: n_models,
                type: 'bar',
                marker: {
                    color: line_col,
                    line: { width: 1, color: line_col },
                },
                legendgroup: subset_labels[pid],
                hoverinfo: 'skip',
                showlegend: false,
                visible: perc_list[perc_ind].visible,
            })
        }
        for (let pid = 0; pid < prefixes.length; pid++) {
            iqr = []
            for (let i = 0; i < n_models; i++) {
                iqr.push(percs[pid][3][i] - percs[pid][1][i])
            }
            custom_data = []
            for (let i = 0; i < n_models; i++) {
                custom_data.push([percs[pid][2][i], files[i], totals_per_100msun[pid][i]])
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
                hovertemplate: `<b>%{customdata[1]}</b><br>P25: %{base:.2f}` + perc_list[perc_ind].unit + `<br>P50: %{customdata[0]:.2f}` + perc_list[perc_ind].unit + `<br>P75: %{y:.2f}` + perc_list[perc_ind].unit + `<br>N_SN per 100 Msun: %{customdata[2]:.2f}<extra></extra>`,
            })
            traces.push(...getMedianLine(percs, pid, perc_list[perc_ind].visible))
        }
    }

    let layout = {
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

    const stat_cs = ['#6b8e23', '#5f9ea0']

    function create_fiducial_band(fid_val, colour, legendgroup, xaxis = 'x1', yaxis = 'y1') {
        let band_traces = []
        // add a vertical line at the fiducial value
        repeat_fid_val = []
        for (let i = 0; i < n_models; i++) {
            repeat_fid_val.push(fid_val)
        }
        band_traces.push({
            x: repeat_fid_val,
            y: model_labels,
            mode: 'lines',
            type: 'scatter',
            orientation: 'h',
            line: {
                shape: 'linear',
                color: darken_colour(colour, 50),
                width: 1,
                dash: 'dot',
            },
            marker: {
                size: 10,
                color: colour,
            },
            legendgroup: legendgroup,
            showlegend: false,
            hoverinfo: 'skip',
            xaxis: xaxis,
            yaxis: yaxis,
        })

        // add a filled, semi-transparent area within 15% of the value of the first model
        rgb_col = hexToRgb(colour)
        transparent_col = 'rgba(' + rgb_col.r + ', ' + rgb_col.g + ', ' + rgb_col.b + ', 0.2)'
        let lower_bound = []
        let upper_bound = []
        for (let i = 0; i < n_models; i++) {
            lower_bound.push(repeat_fid_val[i] * 0.85)
            upper_bound.push(repeat_fid_val[i] * 1.15)
        }
        band_traces.push({
            x: lower_bound,
            y: model_labels,
            mode: 'lines',
            type: 'scatter',
            orientation: 'h',
            line: {
                shape: 'linear',
                width: 0,
            },
            legendgroup: legendgroup,
            showlegend: false,
            hoverinfo: 'skip',
            xaxis: xaxis,
            yaxis: yaxis,
        })
        band_traces.push({
            x: upper_bound,
            y: model_labels,
            mode: 'lines',
            type: 'scatter',
            orientation: 'h',
            line: {
                shape: 'linear',
                width: 0,
            },
            fill: 'tonextx',
            fillcolor: transparent_col,
            legendgroup: legendgroup,
            showlegend: false,
            hoverinfo: 'skip',
            xaxis: xaxis,
            yaxis: yaxis,
        })
        return band_traces
    }

    // Let's do a vertical two-panel line plot for the medians
    traces = [
        ...create_fiducial_band(time_percs[0][2][1], stat_cs[0], ''),
        {
            x: time_percs[0][2],
            y: model_labels,
            mode: 'lines+markers',
            type: 'scatter',
            orientation: 'h',
            line: {
                shape: 'linear',
                color: stat_cs[0],
                width: 2,
            },
            marker: {
                size: 10,
                color: stat_cs[0],
            },
            customdata: models,
            hovertemplate: `<b>%{customdata}</b><br>%{x:.2f}Myr<extra></extra>`,
            xaxis: 'x1',
            yaxis: 'y1',
        },
        ...create_fiducial_band(dist_percs[0][2][1], stat_cs[1], '', 'x2', 'y2'),
        {
            x: dist_percs[0][2],
            y: model_labels,
            mode: 'lines+markers',
            type: 'scatter',
            orientation: 'h',
            line: {
                shape: 'linear',
                color: stat_cs[1],
                width: 2,
            },
            marker: {
                size: 10,
                color: stat_cs[1],
            },
            customdata: models,
            hovertemplate: `<b>%{customdata}</b><br>%{x:.2f}pc<extra></extra>`,
            xaxis: 'x2',
            yaxis: 'y2',
        },
    ]

    layout = {
        grid: { rows: 1, columns: 2, pattern: 'independent' },
        xaxis: {
            title: {
                text: 'Median Time\n[Myr]',
                standoff: 10,
                font: {
                    size: fs,
                },
            },
            tickfont: {
                size: fs,
            },
        },
        yaxis: {
            title: '',
            type: 'category',
            autorange: 'reversed',
            automargin: true,
        },
        xaxis2: {
            title: {
                text: 'Median Distance\n[pc]',
                standoff: 10,
                font: {
                    size: fs,
                },
            },
            tickfont: {
                size: fs,
            },
        },
        yaxis2: {
            title: '',
            type: 'category',
            autorange: 'reversed',
            automargin: true,
            showticklabels: false,
        },
        showlegend: false,
        paper_bgcolor: bg,
        plot_bgcolor: bg,
        font: {
            color: anti_bg,
        },
    }

    Plotly.newPlot('medians', traces, layout, config)

    // Now for a vertical line plot of the totals
    traces = []
    for (let pid = 0; pid < prefixes.length; pid++) {
        traces.push(...create_fiducial_band(totals_per_100msun[pid][0], subset_colours[pid], subset_labels[pid]))
        traces.push({
            x: totals_per_100msun[pid],
            y: model_labels,
            mode: 'lines+markers',
            type: 'scatter',
            orientation: 'h',
            line: {
                shape: 'linear',
                color: subset_colours[pid],
                width: 2,
            },
            marker: {
                size: 10,
                color: subset_colours[pid],
            },
            name: subset_labels[pid],
            legendgroup: subset_labels[pid],
            customdata: models,
            hovertemplate: `<b>%{customdata}</b><br>%{x:.2f}<extra></extra>`,
            xaxis: 'x1',
            yaxis: 'y1',
        })
    }

    layout = {
        xaxis: {
            title: {
                text: '$\\Large \\mathrm{N_{SN}\\ per\\ 100\\ {\\rm M_\\odot}}$',
                standoff: 10,
                font: {
                    size: 1.2 * fs,
                },
            },
            tickfont: {
                size: fs,
            },
        },
        yaxis: {
            title: '',
            type: 'category',
            autorange: 'reversed',
            automargin: true,
        },
        legend: {
            x: 0.5,
            y: 1.1,
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

    Plotly.newPlot('totals', traces, layout, config)
}

// HELPER FUNCTIONS

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
