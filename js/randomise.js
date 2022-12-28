methods = ["Describe", "Act", "Draw"];
times = [30, 60, 90];

function roll() {
    const rand_id = Math.floor(Math.random() * methods.length);
    const method = methods[rand_id];
    const time = times[rand_id];

    document.getElementById("method").innerText = method;
    document.getElementById("time").innerText = time;

    document.querySelectorAll(".lucky-number").forEach((el) => {
        el.innerText = Math.floor(Math.random() * 3) + 1;
    });
}

document.getElementById("randomise").addEventListener("click", function () {
    animateCSS("#random_things", "heartBeat");

    const interval = setInterval(function () {
        roll();
    }, 100);

    setTimeout(function () {
        clearInterval(interval);
    }, 2000);
});

document.getElementById("go").addEventListener("click", function () {
    const timer = document.getElementById("timer");
    const timer_value = document.getElementById("timer_value");

    timer_value.innerText = document.getElementById("time").innerText;
    timer.classList.remove("hide");

    const timer_interval = setInterval(function () {
        const new_value = parseInt(timer_value.innerText) - 1;

        if (new_value == 2) {
            animateCSS(timer_value, "wobble");
        }

        if (new_value < 0) {
            clearInterval(timer_interval);
            timer.classList.add("hide");
        } else {
            timer_value.innerText = new_value;
        }
    }, 1000);
});

document.getElementById("boys_up").addEventListener("click", function () {
    document.getElementById("boys_score").innerText = parseInt(document.getElementById("boys_score").innerText) + 1;
});

document.getElementById("boys_down").addEventListener("click", function () {
    document.getElementById("boys_score").innerText = parseInt(document.getElementById("boys_score").innerText) - 1;
});

document.getElementById("girls_up").addEventListener("click", function () {
    document.getElementById("girls_score").innerText = parseInt(document.getElementById("girls_score").innerText) + 1;
});

document.getElementById("girls_down").addEventListener("click", function () {
    document.getElementById("girls_score").innerText = parseInt(document.getElementById("girls_score").innerText) - 1;
});

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
