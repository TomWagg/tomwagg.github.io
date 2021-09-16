const circle_radius = 35;
let stop_signal = 0;

$(function () {
    document.getElementById("reset").addEventListener('click', function () {
        $("#fitness").val(0);
        $("#mutation_mu").val(0);
        $("#mutation_nu").val(0);
        $(".linked-input").trigger("input");
    });
    document.getElementById("stop").addEventListener("click", function () {
        stop_signal = 1;
    })

    $(".linked-input").on("input", function () {
        $("#" + this.getAttribute("data-linked")).val(this.value);
    });

    $(".linked-input").on("blur", function () {
        this.value = parseInt(this.value) > parseInt(this.max) ? this.max : this.value;
    });

    $("#main-carousel").carousel({
        interval: false,
        keyboard: false,
        touch: false
    });
    $("#help_link").on("click", function () {
        $("#main-carousel").carousel(1);
    });
    $(".btn-back").on("click", function () {
        $("#main-carousel").carousel(0);
    });

    $("#new_run").on("click", function() {
        new_run();
    })
    new_run();
});

function modelled_change(n, N, s, mu, nu) {
    const mean_fitness = (n * (1 + s) + (N - n)) / N
    const up = (n * (1 + s) * (1 - mu) * (N - n) + (N - n) * nu * (N - n)) / (N ** 2 * mean_fitness);
    const down = ((N - n) * (1 - nu) * n + n * (1 + s) * mu * n) / (N ** 2 * mean_fitness);
    const same = 1 - up - down;
    return(chance.weighted([1, 0, -1], [up, same, down]))
}

function new_run() {
    // create new circles
    let container = document.querySelector("#circle_cont");
    container.innerHTML = "";
    let circles = [];
    let primary = [];
    let secondary = [];
    const max_height = container.offsetHeight;

    // add circles until the box is full
    while (container.offsetHeight < max_height + 10) {
        // add half to each allele
        let circle = document.createElement("span");
        if (Math.round(Math.random())) {
            circle.classList.add("circle", "bg-primary");
        } else {
            circle.classList.add("circle", "bg-info");
        }

        // randomly space them out
        circle.style.marginBottom = Math.floor(Math.random() * circle_radius);
        circle.style.marginLeft = Math.floor(Math.random() * circle_radius);
        container.appendChild(circle);

        if (container.offsetHeight > max_height) {
            console.log("trigger now")
            container.removeChild(circle);
            break;
        } else {
            circles.push(circle);
            if (circle.classList.contains("bg-primary")) {
                primary.push(circle);
            } else {
                secondary.push(circle);
            }
        }
    }
    circles[circles.length - 1].parentElement.removeChild(circles[circles.length - 1]);
    console.log(circles, primary, secondary);

    // start simulation by disabling controls
    document.getElementById("new_run").disabled = true;
    $(".linked-input").trigger("blur");

    let n = primary.length;
    let t = 0;
    const N = circles.length;
    const n0 = n;
    let s = parseFloat($("#fitness_typing").val());
    let mu = parseFloat($("#mutation_mu_typing").val());
    let nu = parseFloat($("#mutation_nu_typing").val());

    function step() {
        if (n <= 0 || n >= N || stop_signal == 1) {
            document.getElementById("new_run").disabled = false;
            stop_signal = 0;
        } else {
            if ($("#fitness_typing").val() !== "") {
                s = parseFloat($("#fitness_typing").val());
            }
            if ($("#mutation_mu_typing").val() !== "") {
                mu = parseFloat($("#mutation_mu_typing").val());
            }
            if ($("#mutation_nu_typing").val() !== "") {
                nu = parseFloat($("#mutation_nu_typing").val());
            }
            const change = modelled_change(n, N, s, mu, nu);
            if (change == 1) {
                let traitor = secondary.splice(Math.floor(Math.random() * secondary.length), 1)[0];
                traitor.classList.remove("bg-info");
                traitor.classList.add("bg-primary", "pulse");
                setTimeout(function() {
                    traitor.classList.remove("pulse");
                }, 500);
                primary.push(traitor);
            } else if (change == -1) {
                let traitor = primary.splice(Math.floor(Math.random() * primary.length), 1)[0];
                traitor.classList.remove("bg-primary");
                traitor.classList.add("bg-info", "pulse");
                setTimeout(function() {
                    traitor.classList.remove("pulse");
                }, 500);
                secondary.push(traitor);
            } else {
                let neutral = circles[Math.floor(Math.random() * primary.length)];
                neutral.classList.add("pulse");
                setTimeout(function() {
                    neutral.classList.remove("pulse");
                }, 500);
            }
            n += change;
            t += 1;
            document.getElementById("primary_count").innerText = n;
            document.getElementById("secondary_count").innerText = N - n;
            document.getElementById("generation_count").innerText = t;
            console.log(n, N, change);
            window.requestAnimationFrame(step);
        }
    }
    window.requestAnimationFrame(step);
}