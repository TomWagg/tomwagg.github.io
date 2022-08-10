let tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
let tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
    return new bootstrap.Tooltip(tooltipTriggerEl);
});

// flip the profile image every time the mouse 'flicks' it
document.querySelector("img.profile").addEventListener("mouseout", function (e) {
    this.classList.toggle("flip");
});

// make projects bounce in, in sequence
let i = 0;
document.querySelectorAll(".project").forEach(function (el) {
    setTimeout(function () {
        el.classList.add("visible");
        animateCSS(el, "fadeIn");
    }, i * 100);
    i += 1;
});

// social link clickers
document.querySelectorAll(".social-link").forEach(function (el) {
    el.addEventListener("click", function () {
        this.children[0].click();
    });
});

document.querySelectorAll(".research-projects .project").forEach(function (el) {
    el.addEventListener("click", function () {
        const research_details = document.getElementById("research_details");
        if (research_details.classList.contains("show")) {
            research_details.classList.remove("show");
            document.getElementById("research_details").style.height = "0px";

            // if it was a different details then switch
            if (research_details.querySelector(".details:not(.hide)") !== document.getElementById(el.getAttribute("data-details"))) {
                setTimeout(() => {
                    el.click();
                }, 1000);
            }
        } else {
            // remove old details if they exist
            const old_details = document.querySelector("#research_details .details:not(.hide)");
            if (old_details !== null) {
                old_details.classList.add("hide");
            }

            // switch to new details
            details = document.getElementById(el.getAttribute("data-details"));
            research_details.classList.add("show");
            resizeDetails(details);

            $("html, body").animate(
                {
                    scrollTop: $("#projects").position().top + $("#projects").outerHeight(true),
                },
                1000,
                "swing",
                function () {
                    console.log(document.body.scrollHeight);
                    document.querySelector("#matrix-box").height = document.body.scrollHeight;
                }
            );
        }
    });
});

function resizeDetails(details) {
    details.classList.remove("hide");

    let height = 32;
    for (let i = 0; i < details.children.length; i++) {
        height += details.children[i].offsetHeight;
    }
    research_details.style.height = height.toString() + "px";
}

window.addEventListener("resize", function (event) {
    details = document.querySelector("#research_details .details:not(.hide)");
    if (details !== null) {
        resizeDetails(details);
        console.log(document.body.scrollHeight);
        document.querySelector("#matrix-box").height = document.body.scrollHeight;
    }
});

document.querySelectorAll("#research_details .open-close").forEach(function (el) {
    el.addEventListener("click", function () {
        document.getElementById("research_details").classList.remove("show");
        document.getElementById("research_details").style.height = "0px";
        setTimeout(() => {
            const old_details = document.querySelector("#research_details .details:not(.hide)");
            if (old_details !== null) {
                old_details.classList.add("hide");
            }
            console.log(document.body.scrollHeight);
            document.querySelector("#matrix-box").height = document.body.scrollHeight;
        }, 1000);
    });
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

document.querySelector("#dark-mode-checkbox").addEventListener("change", function () {
    if (this.checked) {
        dark_mode("52");
    } else {
        light_mode();
    }
});

// define a series of SECRET cheat codes :D
const cheat_codes = [
    {
        code: ["\\", "d", "o", "o", "d", "l", "e"],
        index: 0,
        callback: megan_defaces_my_website,
    },
    {
        code: ["\\", "n", "y", "a", "n"],
        index: 0,
        callback: nyan_time,
    },
    {
        code: ["\\", "b", "a", "r", "r", "e", "l"],
        index: 0,
        callback: function () {
            document.querySelectorAll(".nyan").forEach((el) => {
                el.classList.add("barrel");
            });
        },
    },
    {
        code: ["\\", "m", "a", "t", "r", "i", "x"],
        index: 0,
        callback: matrix,
    },
    {
        code: ["\\", "d", "a", "r", "k"],
        index: 0,
        callback: function () {
            dark_mode("51");
        },
    },
    {
        code: ["\\", "l", "i", "g", "h", "t"],
        index: 0,
        callback: light_mode,
    },
    {
        code: ["\\", "r", "e", "s", "e", "t"],
        index: 0,
        callback: reset_cheats,
    },
    {
        code: ["\\", "a", "r", "t", "i", "c", "u", "l", "a", "t", "e"],
        index: 0,
        callback: function () {
            window.location.href = "html/articulate.html";
        },
    },
    {
        code: ["\\", "b", "a", "l", "l", "s"],
        index: 0,
        callback: function () {
            window.location.href = "html/balls.html";
        },
    },
];

// detect whether cheat codes are occurring
document.addEventListener("keydown", function (e) {
    cheat_codes.forEach((cheat_code) => {
        if (e.key == cheat_code["code"][cheat_code["index"]]) {
            cheat_code["index"] += 1;
            if (cheat_code["index"] == cheat_code["code"].length) {
                cheat_code["callback"]();
                cheat_code["index"] = 0;
            }
        } else {
            cheat_code["index"] = 0;
        }
    });
});

function megan_defaces_my_website() {
    // artistic talent courtesy of Megan Gialluca
    document.querySelector("img.profile").src = "img/circle_me_drawing.gif";
}

// nyan cats :D
let nyans_interval = undefined;
function nyan_time() {
    let num_nyans = 0;
    const max_nyans = 310;
    const rick = 10;

    document.querySelector("#nyans audio").play();
    document.querySelector("#nyans audio").classList.add("nyan-playing");
    document.body.classList.add("rainbow");

    setTimeout(function () {
        if (!document.querySelector("#nyans audio").classList.contains("nyan-playing")) {
            return;
        }
        nyans_interval = setInterval(function () {
            num_nyans += 1;

            const nyan = document.createElement("img");
            nyan.src = "img/nyan.gif";

            const div = document.createElement("div");
            div.style.position = "absolute";
            div.style.left = "0px";
            div.style.top = Math.floor(Math.random() * screen.height) + "px";
            div.className = "nyan";

            if (num_nyans % rick == 0) {
                const a = document.createElement("a");
                a.href = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
                a.target = "_blank";
                a.appendChild(nyan);
                div.appendChild(a);
                div.classList.add("rick");
            } else {
                div.appendChild(nyan);
            }

            if (matrix_interval !== undefined) {
                div.classList.add("nyan-matrix");
            }

            document.querySelector("#nyans").appendChild(div);

            if (num_nyans == max_nyans) {
                clearInterval(nyans_interval);
                nyans_interval = undefined;
                document.body.classList.remove("rainbow");
            }
        }, 300);
    }, 5500);
}

let matrix_interval = undefined;

function matrix() {
    dark_mode("0");
    document.documentElement.style.setProperty("--primary", "#14b31e");
    document.documentElement.style.setProperty("--primary-light", "#54b85b");
    document.documentElement.style.setProperty("--primary-dark", "#017809");

    document.querySelectorAll(".nyan:not(.nyan-matrix)").forEach((el) => {
        el.classList.add("nyan-matrix");
    });

    // the following is a slightly modified version of this codepen!
    // https://codepen.io/yaclive/pen/EayLYO?__cf_chl_tk=SYdhj77pFJIfZWJc2_jCh9DAIqJ5gn4W7DEBBrAAv2A-1655876564-0-gaNycGzNDH0

    // Initialising the canvas
    let canvas = document.querySelector("#matrix-box");
    const ctx = canvas.getContext("2d");

    // Setting the width and height of the canvas
    canvas.width = window.innerWidth;
    canvas.height = document.body.scrollHeight;

    // Setting up the letters
    let letters = "ABCDEFGHIJKLMNOPQRSTUVXYZABCDEFGHIJKLMNOPQRSTUVXYZABCDEFGHIJKLMNOPQRSTUVXYZABCDEFGHIJKLMNOPQRSTUVXYZABCDEFGHIJKLMNOPQRSTUVXYZABCDEFGHIJKLMNOPQRSTUVXYZ";
    letters = letters.split("");

    // Setting up the columns
    const fontSize = 10;
    const columns = canvas.width / fontSize;

    // Setting up the drops
    let drops = [];
    for (let i = 0; i < columns; i++) {
        drops[i] = (Math.random() * canvas.height) / fontSize;
    }

    // Setting up the draw function
    function draw() {
        ctx.fillStyle = "rgba(0, 0, 0, .1)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        for (let i = 0; i < drops.length; i++) {
            const text = letters[Math.floor(Math.random() * letters.length)];
            ctx.fillStyle = "#0f0";
            ctx.fillText(text, i * fontSize, drops[i] * fontSize);
            drops[i]++;
            if (drops[i] * fontSize > canvas.height && Math.random() > 0.95) {
                drops[i] = 0;
            }
        }
    }

    // Loop the animation
    matrix_interval = setInterval(draw, 33);
}

function light_mode() {
    document.body.style.backgroundColor = "white";
    document.body.style.color = "black";
    document.querySelectorAll(".dark-mode-label svg").forEach((el) => {
        el.style.filter = "";
    });
    document.querySelectorAll(".research-projects .project .project-description").forEach((el) => {
        el.style.backgroundColor = "rgba(255, 255, 255, 0.9)";
    });
}

function dark_mode(blackRGB = "0") {
    document.body.style.backgroundColor = "rgb(" + blackRGB + "," + blackRGB + "," + blackRGB + ")";
    document.body.style.color = "white";
    document.querySelectorAll(".dark-mode-label svg").forEach((el) => {
        el.style.filter = "invert(100%)";
    });
    document.querySelectorAll(".research-projects .project .project-description").forEach((el) => {
        el.style.backgroundColor = "rgba(" + blackRGB + "," + blackRGB + "," + blackRGB + ", 0.9)";
    });
}

const now = new Date();
if ((now.getHours() > 18) | (now.getHours() < 6)) {
    document.querySelector("#dark-mode-checkbox").click();
}

function reset_cheats() {
    document.body.classList.remove("rainbow");
    light_mode();
    document.documentElement.style.setProperty("--primary", "#1995c6bd");
    document.documentElement.style.setProperty("--primary-light", "#6cc7eaa3");
    document.documentElement.style.setProperty("--primary-dark", "#186280");
    if (matrix_interval != undefined) {
        clearInterval(matrix_interval);
        matrix_interval = undefined;

        let canvas = document.querySelector("#matrix-box");
        const ctx = canvas.getContext("2d");

        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    const audio = document.querySelector("#nyans audio");
    if (audio.classList.contains("nyan-playing")) {
        audio.pause();
        audio.currentTime = 0;
        audio.classList.remove("nyan-playing");
    }

    if (nyans_interval !== undefined) {
        clearInterval(nyans_interval);
        nyans_interval = undefined;
    }

    document.querySelector("img.profile").src = "img/circle_me.png";
}
