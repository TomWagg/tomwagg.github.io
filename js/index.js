// flip the profile image every time the mouse 'flicks' it
document.querySelector("img.profile").addEventListener("mouseout", function (e) {
    this.classList.toggle("flip");
});

// make projects bounce in, in sequence
let i = 0;
document.querySelectorAll(".project").forEach(function (el) {
    setTimeout(function() {
        el.classList.add("visible")
        animateCSS(el, "fadeIn");
    }, i * 100);
    i += 1;
});

// social link clickers
document.querySelectorAll(".social-link").forEach(function(el) {
    el.addEventListener("click", function() {
        this.children[0].click();
    });
});

document.querySelectorAll(".research-projects .project").forEach(function(el) {
    el.addEventListener("click", function() {
        const research_details = document.getElementById("research_details");
        if (research_details.classList.contains("show")) {
            research_details.classList.remove("show");

            // if it was a different details then switch
            if (research_details.querySelector(".details:not(.hide)") !== document.getElementById(el.getAttribute("data-details"))) {
                setTimeout(() => {
                    el.click()
                }, 1000);
            }
        } else {
            // remove old details if they exist
            const old_details = document.querySelector("#research_details .details:not(.hide)")
            if (old_details !== null) {
                old_details.classList.add("hide");
            }
            
            // switch to new details
            document.getElementById(el.getAttribute("data-details")).classList.remove("hide");
            research_details.classList.add("show");
            console.log($("#projects").offset().top + $("#projects").outerHeight(true))
            $('html, body').animate({
                scrollTop: $("#projects").position().top + $("#projects").outerHeight(true)
            }, 1000);
        }
    });
});

document.querySelectorAll("#research_details button").forEach(function(el) {
    el.addEventListener("click", function() {
        document.getElementById("research_details").classList.remove("show");
        setTimeout(() => {
            const old_details = document.querySelector("#research_details .details:not(.hide)")
            if (old_details !== null) {
                old_details.classList.add("hide");
            }
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
    if (typeof (element) == "string") {
        nodes = document.querySelectorAll(element);
    } else {
        nodes = [element];
    }
    nodes.forEach(function (node) {
        node.classList.add('animated', animationName);
        $(node).one("animationend", function () {
            this.classList.remove('animated', animationName);
            if (typeof callback === 'function') callback();
        });
    });
}

// let oReq = new XMLHttpRequest();
// oReq.addEventListener("load", reqListener);
// oReq.open("GET", "html/test.html");
// oReq.send();

// function reqListener() {
//     console.log(this.responseText);
//     document.getElementById("test").innerHTML = this.responseText;
// }