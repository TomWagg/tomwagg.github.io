let intervalID;
let direction = 1;

make_plot();

this.window.addEventListener("load", function () {
    document.getElementById("dark-mode-checkbox").addEventListener("change", make_plot);
    
    const range = document.getElementById("profile-slider");
    const bubble = document.getElementById("profile-slider-bubble");

    range.addEventListener("input", function () {
        const val = range.value;
        const min = range.min ? range.min : 0;
        const max = range.max ? range.max : 100;
        const fraction = Number(((val - min)) / (max - min));
        bubble.innerText = String(val).padStart(3, " ");
    
        const range_width = range.getBoundingClientRect().width - 36;
        const range_left = range.getBoundingClientRect().left;
        let left = range_left + fraction * range_width;
        if (val < 10) {
            left += 6;
        } else if (val < 100) {
            left += 3;
        }
        bubble.style.left = `${left}px`;
        document.getElementById("profile-age").innerText = val
    });
    range.addEventListener("mouseover", function () {
        bubble.style.opacity = 1;
    });
    range.addEventListener("mouseout", function () {
        bubble.style.opacity = 0;
    });
    range.dispatchEvent(new Event("input"));

    const play = document.getElementById("profile-play");
    const pause = document.getElementById("profile-pause");

    play.addEventListener("click", function () {
        intervalID = setInterval(function () {
            let new_value = parseInt(range.value) + direction;
            if (new_value < 0 || new_value > 300) {
                direction *= -1;
                new_value += direction
            }
            range.value = new_value;
            range.dispatchEvent(new Event("input"));
        }, 50);
        this.disabled = true;
        pause.disabled = false;
    });

    pause.addEventListener("click", function () {
        clearInterval(intervalID);
        play.disabled = false;
        this.disabled = true;
    });
});


function deepClone(obj) {
    if (typeof obj !== "object" || obj === null) {
      return obj;
    }
  
    let clone = {};
    for (let key in obj) {
      clone[key] = deepClone(obj[key]);
    }
  
    return clone;
  }

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
        xh_frames.push({name: "t_" + i, data: [{x: s_mass, y: s_xh}, {x: mg_mass, y: mg_xh}]});
        bv_frames.push({name: "t_" + i, data: [{x: s_mass, y: s_bv}, {x: mg_mass, y: mg_bv}]});
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
        title: "Hydrogen mass fraction profile",
        xaxis: {
            title: {
                text: "${\\rm Mass} \\, [\\rm M_{\\odot}]$",
                standoff: 10,
            },
            hoverformat: "1.2f",
            zerolinecolor: grey,
            gridcolor: grey,
            range: [0.0, 1.0],
            automargin: true,
        },
        yaxis: {
            title: {
                text: "$X_{\\rm H}$",
                standoff: 10,
            },
            hoverformat: "1.3f",
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
        showlegend: false,
        margin: {
            t: 30,
            b: 0,
            l: 0,
            r: 0,
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

    document.getElementById("profile-slider").addEventListener("input", function () {
        Plotly.animate("xh-profile", xh_frames[this.value], {
            mode: 'immediate',
            transition: {duration: 0},
            frame: {duration: 0, redraw: false},
        });
        Plotly.animate("bv-profile", bv_frames[this.value], {
            mode: 'immediate',
            transition: {duration: 0},
            frame: {duration: 0, redraw: false},
        });
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

    let new_layout = deepClone(layout);
    new_layout.yaxis = {
        title: {
            text: "$\\log_{10} (N / {\\rm day^{-1}})$",
            standoff: 10,
        },
        hoverformat: "1.3e",
        zerolinecolor: grey,
        gridcolor: "none",
        ticklen: 5,
        tickcolor: bg,
        range: [2.0, 3.7],
        automargin: true,
    },
    new_layout.title = "Brunt-Väisälä frequency profile";
    new_layout.xaxis.range = [0.0, 3.5];

    Plotly.newPlot("bv-profile", data, new_layout, config).then(function () {
        Plotly.addFrames('bv-profile', bv_frames);
    });
}
