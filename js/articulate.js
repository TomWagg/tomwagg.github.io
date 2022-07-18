const sizes = [25, 10, 15, 10];
let totalSizes = 0;
let cumulative_normalised_sizes = [0, 0, 0, 0];

for (let i = 0; i < sizes.length; i++) {
    totalSizes += sizes[i];
}

cumulative_normalised_sizes[0] = sizes[0] / totalSizes;
for (let i = 1; i < sizes.length; i++) {
    cumulative_normalised_sizes[i] = sizes[i] / totalSizes + cumulative_normalised_sizes[i - 1];
}

const labels = ["big green", "red", "small green", "orange"];
const explanations = ["you move 2 forward, or they move 2 back", "nothing", "you move 3 forward, or they move 3 back", "nothing"];

const css_colour = ["darkgreen", "darkred", "darkgreen", "orange"];

window.addEventListener("load", function () {
    drawWheel();
    animateCSS("canvas", "rotateIn", function () {
        document.getElementById("spin").classList.remove("hide");
        animateCSS("#spin", "bounceIn");
    });

    document.getElementById("spin").addEventListener("click", spinWheel);
});

async function spinWheel() {
    document.getElementById("result").classList.add("hide-content");
    let list = [];
    const n_seg = 24;
    const n_group = 6;
    const groups = Math.floor(Math.random() * 2 * n_group);
    const ind = randomColour();
    const size_total = sizes.reduce((x, y) => x + y);
    console.log(size_total);
    for (let i = 0; i <= groups * sizes.length + ind; i++) {
        list.push(randomColour());
        drawWheel(i % n_seg);
        await sleep((10 * sizes[i % sizes.length]) / size_total);
    }
    document.getElementById("colour").innerText = labels[ind];
    document.getElementById("colour").style = "color:" + css_colour[ind];
    document.getElementById("explanation").innerText = explanations[ind];
    document.getElementById("result").classList.remove("hide");
    document.getElementById("result").classList.remove("hide-content");
    animateCSS("#result", "bounceInRight");
}

function drawWheel(segment = undefined) {
    let canvas = document.getElementById("spinner");
    let ctx = canvas.getContext("2d");
    canvas.height = 5000;
    canvas.width = 5000;
    let lastend = 0;
    let sizes = [25, 10, 15, 10];
    let myTotal = 0;
    let myColor = ["green", "red", "green", "orange"];

    for (let e = 0; e < sizes.length; e++) {
        myTotal += sizes[e];
    }

    const spinRadius = (canvas.width - 200) / 2;
    const outlineWidth = 15;
    const outlineColour = "gold";
    const highlightWidth = 50;
    const highlightColour = "yellow";

    ctx.strokeStyle = outlineColour;
    ctx.lineWidth = outlineWidth;
    const repeats = 6;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let j = 0; j < repeats; j++) {
        for (let i = 0; i < sizes.length; i++) {
            ctx.fillStyle = myColor[i];
            ctx.beginPath();
            ctx.moveTo(canvas.width / 2, canvas.height / 2);
            // Arc Parameters: x, y, radius, startingAngle (radians), endingAngle (radians), antiClockwise (boolean)
            ctx.arc(canvas.width / 2, canvas.height / 2, spinRadius, lastend, lastend + Math.PI * 2 * (sizes[i] / myTotal / repeats), false);
            ctx.lineTo(canvas.width / 2, canvas.height / 2);
            ctx.fill();

            ctx.beginPath();
            ctx.moveTo(canvas.width / 2, canvas.height / 2);
            // Arc Parameters: x, y, radius, startingAngle (radians), endingAngle (radians), antiClockwise (boolean)
            ctx.arc(canvas.width / 2, canvas.height / 2, spinRadius, lastend, lastend + Math.PI * 2 * (sizes[i] / myTotal / repeats), false);
            ctx.lineTo(canvas.width / 2, canvas.height / 2);
            ctx.stroke();

            lastend += Math.PI * 2 * (sizes[i] / myTotal / repeats);
        }
    }

    ctx.beginPath();
    ctx.arc(canvas.width / 2, canvas.height / 2, spinRadius, 0, Math.PI * 2, false);
    ctx.stroke();

    if (segment != undefined) {
        var starting_angle = Math.floor(segment / sizes.length) * 60;

        if (segment % sizes.length != 0) {
            for (let i = 0; i < segment % sizes.length; i++) {
                starting_angle += sizes[i];
            }
        }
        var ending_angle = starting_angle + sizes[segment % sizes.length];

        ctx.strokeStyle = highlightColour;
        ctx.lineWidth = highlightWidth;

        ctx.beginPath();
        ctx.moveTo(canvas.width / 2, canvas.height / 2);
        // Arc Parameters: x, y, radius, startingAngle (radians), endingAngle (radians), antiClockwise (boolean)
        ctx.arc(canvas.width / 2, canvas.height / 2, spinRadius, (starting_angle * Math.PI) / 180, (ending_angle * Math.PI) / 180, false);
        ctx.lineTo(canvas.width / 2, canvas.height / 2);
        ctx.stroke();
    }

    ctx.fillStyle = "black";
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, canvas.height / 2);
    ctx.arc(canvas.width / 2, canvas.height / 2, spinRadius / 5, 0, Math.PI * 2, false);
    ctx.lineTo(canvas.width / 2, canvas.height / 2);
    ctx.fill();

    ctx.strokeStyle = outlineColour;
    ctx.lineWidth = outlineWidth;

    ctx.beginPath();
    ctx.arc(canvas.width / 2, canvas.height / 2, spinRadius / 5, 0, Math.PI * 2, false);
    ctx.stroke();

    if (segment != undefined) {
        ctx.strokeStyle = highlightColour;
        ctx.lineWidth = highlightWidth;

        ctx.beginPath();
        ctx.arc(canvas.width / 2, canvas.height / 2, spinRadius / 5, ((starting_angle - 3) * Math.PI) / 180, ((ending_angle + 3) * Math.PI) / 180, false);
        ctx.stroke();
    }
}

function randomColour() {
    const random = Math.random();
    for (let i = 0; i < cumulative_normalised_sizes.length; i++) {
        if (random < cumulative_normalised_sizes[i]) {
            return i;
        }
    }
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Add a CSS animation
 * @param {*} element element to animate
 * @param {*} animationName which animation
 * @param {*} callback what to do on completion
 */
function animateCSS(element, animationName, callback) {
    let nodes = null;
    if (typeof element == "string") {
        nodes = document.querySelectorAll(element);
    } else {
        nodes = [element];
    }
    nodes.forEach(function (node) {
        node.classList.add("animated", animationName);
        $(node).one("animationend", function () {
            this.classList.remove("animated", animationName);
            if (typeof callback === "function") callback();
        });
    });
}
