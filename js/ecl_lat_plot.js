make_plot();
document.getElementById("dark-mode-checkbox").addEventListener("change", make_plot);

document.getElementById("goto-me").addEventListener("click", function () {
    window.location.href = "../../index.html";
});

function make_plot() {
    fetch("./ecl_lat_data.csv")
        .then((response) => response.text())
        .then((datastring) => {
            setup_plot(datastring);
        });
}

function setup_plot(datastring) {
    const dark_mode = document.getElementById("dark-mode-checkbox").checked;

    let bg = dark_mode ? "#333" : "white";
    let anti_bg = dark_mode ? "white" : "#333";
    let grey = dark_mode ? "#595656" : "#eee";

    let lines = datastring.split("\n");
    let cutoffs = lines[0].split(",").map(parseFloat);
    let traffic = lines[1].split(",").map(parseFloat);
    let purity = lines[2].split(",").map(parseFloat);
    var trace1 = {
        x: cutoffs,
        y: traffic,
        name: "Traffic",
        type: "line",
        hovertemplate: "~%{y:1.1f} objects submitted<extra></extra>",
    };

    var trace2 = {
        x: cutoffs,
        y: purity,
        name: "Purity",
        yaxis: "y2",
        type: "line",
        line: {
            color: "rgb(148, 103, 189)",
        },
        hovertemplate: "~%{y:1.1f}% are NEOs<extra></extra>",
    };

    var data = [trace1, trace2];

    var layout = {
        xaxis: {
            title: "Absolute Ecliptic Latitude Cutoff in Degrees",
            hoverformat: "1.1f",
            zerolinecolor: grey,
            gridcolor: grey,
        },
        yaxis: {
            title: "Average Nightly Traffic",
            titlefont: {color: "#1f75b1"},
            tickfont: {color: "#1f75b1"},
            type: "log",
            hoverformat: "1.1f",
            zerolinecolor: grey,
            gridcolor: grey,
            ticklen: 5,
            tickcolor: bg,
            tickvals: [0.01, 0.1, 1, 10, 100, 1000],
            ticktext: [0.01, 0.1, 1, 10, 100, 1000],
        },
        yaxis2: {
            title: "Average Purity [%]",
            titlefont: {color: "rgb(148, 103, 189)"},
            tickfont: {color: "rgb(148, 103, 189)"},
            overlaying: "y",
            side: "right",
            zerolinecolor: grey,
            gridcolor: grey,
            ticklen: 5,
            tickcolor: bg,
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

    Plotly.newPlot("graph", data, layout, {responsive: true});
}
