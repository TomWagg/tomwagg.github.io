make_plot();
document.getElementById("dark-mode-checkbox").addEventListener("change", make_plot);

function make_plot() {
    fetch('profile_data.h5')
        .then((response) => response.arrayBuffer())
        .then(function (buffer) {
            var f = new hdf5.File(buffer, 'test.h5');
            setup_plot(f);
        })
}

function setup_plot(f) {
    const dark_mode = document.getElementById("dark-mode-checkbox").checked;

    let frames = []
    for (let i = 0; i <= 300; i++) {
        let s_mass = f.get('t_' + i + '/s/mass').value;
        let s_xh = f.get('t_' + i + '/s/xh').value;
        let mg_mass = f.get('t_' + i + '/mg/mass').value;
        let mg_xh = f.get('t_' + i + '/mg/xh').value;
        frames.push({data: [{x: s_mass, y: s_xh}, {x: mg_mass, y: mg_xh}]});
    }

    let slider_steps = [];

    for (i = 0; i < frames.length; i++) {
        slider_steps.push({
            method: 'animate',
            label: i,
            args: [[frames[i]], {
                mode: 'immediate',
                transition: {duration: 0},
                frame: {duration: 0, redraw: false},
            }]
        });
    }

    let bg = dark_mode ? "#333" : "white";
    let anti_bg = dark_mode ? "white" : "#333";
    let grey = dark_mode ? "#595656" : "#eee";

    var trace1 = {
        x: frames[0].data[0].x,
        y: frames[0].data[0].y,
        name: "Single",
        type: "line",
        line: {"width": 5, "color": "#fe9f6d"},
    };

    var trace2 = {
        x: frames[0].data[1].x,
        y: frames[0].data[1].y,
        name: "Mass-gainer",
        type: "line",
        line: {"width": 5, "color": "#641a80"},
    };

    var data = [trace1, trace2];

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
        sliders: [{
            // currentvalue: {
            //   visible: true,
            //   prefix: 'Age [Myr]:',
            //   xanchor: 'center',
            //   offset: -100,
            //   font: {size: 20, color: '#666'}
            // },      
            steps: slider_steps
          }]
    };

    config = {
        responsive: true,
        modeBarButtonsToRemove: ['zoomIn2d', 'zoomOut2d'],
        displaylogo: false,
    }

    Plotly.newPlot("graph", data, layout, config).then(function () {
        Plotly.addFrames('graph', frames);
    });
}
