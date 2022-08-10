this.window.addEventListener("load", function () {
    examples = this.document.querySelectorAll(".example");
    examples.forEach((element) => {
        element.addEventListener("click", function () {
            navigator.clipboard.writeText(this.innerText).then(() => {
                const tooltip = bootstrap.Tooltip.getInstance(element);
                tooltip.hide();
                animateCSS(element, "bounce");
            });
        });

        new bootstrap.Tooltip(element, {
            title: "<i class='fa fa-clipboard'></i>",
            html: true,
        });
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
