$(function () {
    animateCSS(".masthead h1", "fadeInUp");
    setTimeout(function () {
        animateCSS(".masthead .h-33", "fadeInDown");
    }, 100);

    $("#about .img-fluid").on("click", function (e) {
        let ouch = this.parentElement.querySelector(".ouch");
        animateCSS(e.target, "swing", function() {
            ouch.classList.remove("hide");
            animateCSS(ouch, "zoomInDown", function() {
                setTimeout(function() {
                    animateCSS(ouch, "zoomOutUp", function() {
                        ouch.classList.add("hide");
                    });
                }, 800);
            });
        });
    });

    $("#research_carousel").carousel({
        interval: false,
        touch: false
    });
    $(".portfolio-item").on("click", function () {
        animateCSS(this, "rubberBand");
        $("#research_carousel").carousel(parseInt(this.getAttribute("data-to")));
    });
    $(".carousel-item .return").on("click", function () {
        $("#research_carousel").carousel(2);
    });

    document.querySelectorAll(".card.slider .front, .card.slider .overlay").forEach(function (el) {
        el.addEventListener("click", function () {
            this.parentElement.classList.add("active");
        });
    });

    document.querySelectorAll(".card.slider .back .btn").forEach(function (el) {
        el.addEventListener("click", function () {
            document.querySelector(this.getAttribute("data-mycard")).classList.remove("active");
        });
    });

    document.querySelectorAll(".btn-linker").forEach(function (el) {
        el.addEventListener("click", function () {
            this.querySelector("a").click();
        });
    });

    // Closes the sidebar menu
    $(".menu-toggle").click(function (e) {
        e.preventDefault();
        $("#sidebar-wrapper").toggleClass("active");
        $(".menu-toggle > .fa-bars, .menu-toggle > .fa-times").toggleClass("fa-bars fa-times");
        $(this).toggleClass("active");
    });

    // Smooth scrolling using jQuery easing
    $('a.js-scroll-trigger[href*="#"]:not([href="#"])').click(function () {
        if (location.pathname.replace(/^\//, '') == this.pathname.replace(/^\//, '') && location.hostname == this.hostname) {
            var target = $(this.hash);
            target = target.length ? target : $('[name=' + this.hash.slice(1) + ']');
            if (target.length) {
                $('html, body').animate({
                    scrollTop: target.offset().top
                }, 1000, "easeInOutExpo");
                return false;
            }
        }
    });
    $('#research_carousel').on('slid.bs.carousel', function (e) {
        console.log(e.relatedTarget);
        if (e.relatedTarget.querySelector(".container-fluid")) {
            e.relatedTarget = e.relatedTarget.querySelector(".container-fluid");
        }
        $('html, body').animate({
            scrollTop: $(e.relatedTarget).offset().top
        }, 1000, "easeInOutExpo");
    })

    // Closes responsive menu when a scroll trigger link is clicked
    $('#sidebar-wrapper .js-scroll-trigger').click(function () {
        $("#sidebar-wrapper").removeClass("active");
        $(".menu-toggle").removeClass("active");
        $(".menu-toggle > .fa-bars, .menu-toggle > .fa-times").toggleClass("fa-bars fa-times");
    });

    // Scroll to top button appear
    $(document).scroll(function () {
        var scrollDistance = $(this).scrollTop();
        if (scrollDistance > 100) {
            $('.scroll-to-top').fadeIn();
        } else {
            $('.scroll-to-top').fadeOut();
        }
    });

    document.querySelectorAll(".social-link").forEach(function(el) {
        el.addEventListener("click", function() {
            this.children[0].click();
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

function normalizeSlideHeights() {
    $('.carousel').each(function () {
        var items = $('.carousel-item', this);
        // reset the height
        items.css('min-height', 0);
        // set the height
        var maxHeight = Math.max.apply(null,
            items.map(function () {
                return $(this).outerHeight()
            }).get());
        items.css('min-height', maxHeight + 'px');
    })
}

$(window).on(
    'load resize orientationchange',
    normalizeSlideHeights);

document.addEventListener('DOMContentLoaded', function () {
    var trigger = new ScrollTrigger({
        once: true,
        // addHeight: true
    });
});