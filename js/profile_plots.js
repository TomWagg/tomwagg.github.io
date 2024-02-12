make_plot();

this.window.addEventListener("load", function () {
    document.getElementById("dark-mode-checkbox").addEventListener("change", make_plot);
});

function make_plot() {
    fetch('profile_data.h5')
        .then((response) => response.arrayBuffer())
        .then(function (buffer) {
            var f = new hdf5.File(buffer, 'test.h5');
            profile_plots(f);
        })
}

function profile_plots(f) {
    const dark_mode = document.getElementById("dark-mode-checkbox").checked;
    let bg = dark_mode ? "#333" : "white";
    let anti_bg = dark_mode ? "white" : "#333";
    let grey = dark_mode ? "#595656" : "#eee";

    // transform data into frame lists for each plot
    let xh_frames = []
    let bv_frames = []
    for (let i = 0; i <= 300; i++) {
        let s_mass = f.get('t_' + i + '/s/mass').value;
        let s_xh = f.get('t_' + i + '/s/xh').value;
        let s_bv = f.get('t_' + i + '/s/N').value;
        let mg_mass = f.get('t_' + i + '/mg/mass').value;
        let mg_xh = f.get('t_' + i + '/mg/xh').value;
        let mg_bv = f.get('t_' + i + '/mg/N').value;
        xh_frames.push({data: [{x: s_mass, y: s_xh}, {x: mg_mass, y: mg_xh}]});
        bv_frames.push({data: [{x: s_mass, y: s_bv}, {x: mg_mass, y: mg_bv}]});
    }

    // create slider steps from frames
    let xh_slider_steps = [];
    let bv_slider_steps = [];
    for (i = 0; i < xh_frames.length; i++) {
        for (let [steps, frames] of [[xh_slider_steps, xh_frames], [bv_slider_steps, bv_frames]]) {
            steps.push({
                method: 'animate',
                label: i,
                args: [[frames[i]], {
                    mode: 'immediate',
                    transition: {duration: 0},
                    frame: {duration: 0, redraw: false},
                }]
            });
        }
    }
    console.log(bv_slider_steps)

    const labels = ["Single", "Mass-gainer"];
    const colours = ["#fe9f6d", "#641a80"];

    let data = [];
    for (let i = 0; i < 2; i++) {
        data.push({
            x: xh_frames[0].data[i].x,
            y: xh_frames[0].data[i].y,
            name: labels[i],
            type: "line",
            line: {"width": 5, "color": colours[i]},
        });
    }

    var layout = {
        xaxis: {
            title: "Mass",
            hoverformat: "1.2f",
            zerolinecolor: grey,
            gridcolor: grey,
            range: [0.0, 1],
        },
        yaxis: {
            title: "Hydrogen abundance",
            hoverformat: "1.3f",
            zerolinecolor: grey,
            gridcolor: grey,
            ticklen: 5,
            tickcolor: bg,
            range: [0.0, 1],
        },
        paper_bgcolor: bg,
        plot_bgcolor: bg,
        font: {
            color: anti_bg,
        },
        showlegend: false,
        margin: {
            t: 0,
        },
    };

    config = {
        responsive: true,
        modeBarButtonsToRemove: ['zoomIn2d', 'zoomOut2d'],
        displaylogo: false,
    }

    Plotly.newPlot("xh-profile", data, layout, config).then(function () {
        Plotly.addFrames('xh-profile', xh_frames);
    });

    data = [];
    for (let i = 0; i < 2; i++) {
        data.push({
            x: bv_frames[0].data[i].x,
            y: bv_frames[0].data[i].y,
            fill: "tozeroy",
            name: labels[i],
            type: "line",
            line: {"width": 3, "color": colours[i]},
            hovertemplate: "~%{y:1.3e} / day<extra></extra>"
        });
    }
    layout.yaxis = {
        title: "Brunt-Väisälä frequency",
        hoverformat: "1.3e",
        zerolinecolor: grey,
        gridcolor: "none",
        ticklen: 5,
        tickcolor: bg,
        type: "log",
        tickformat: "1.1e",
        tickvals: [1e2, 5e2, 1e3, 5e3],
        range: [2.0, 4],
    },
    layout.sliders = [{steps: bv_slider_steps}];
    layout.xaxis.range = [0.0, 3.5];

    Plotly.newPlot("bv-profile", data, layout, config).then(function () {
        Plotly.addFrames('bv-profile', bv_frames);
    });
}
