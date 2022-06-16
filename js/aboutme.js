$(function () {
    // open the bib file
    let rawFile = new XMLHttpRequest();
    rawFile.open("GET", "../html/papers.bib");
    rawFile.onreadystatechange = function () {
        if (rawFile.readyState === 4) {
            if (rawFile.status === 200 || rawFile.status == 0) {
                // convert file to json
                let papers = rawFile.responseText;
                let paper_json = bibtexParse.toJSON(papers);

                // for each publication
                for (let i = 0; i < paper_json.length; i++) {
                    // grab the template, clone, remove id and reveal
                    let publication = document.getElementById("pub_template").cloneNode(true);
                    publication.id = "";
                    publication.classList.remove("hide");

                    // get the title and link it to ADS
                    publication.querySelector(".title").innerHTML = paper_json[i]["entryTags"]["title"].replace(/[{}]/g, "");
                    publication.querySelector(".title").setAttribute("href", paper_json[i]["entryTags"]["adsurl"]);

                    // get journal information and add
                    publication.querySelector(".journal").innerHTML = expandJournal(paper_json[i]["entryTags"]["journal"]);
                    publication.querySelector(".journal-details").innerHTML = expandDetails(paper_json[i]["entryTags"]["volume"], paper_json[i]["entryTags"]["pages"], paper_json[i]["entryTags"]["number"]);
                    publication.querySelector(".date").innerHTML = paper_json[i]["entryTags"]["year"];

                    // add the abstract and link the collapse el
                    publication.querySelector(".abstract").innerHTML = paper_json[i]["entryTags"]["abstract"].replace("{", "").replace(/}([^}]*)$/, '$1')
                    publication.querySelector(".abstract").id = "abs_" + i.toString();
                    publication.querySelector(".expand").setAttribute("href", "#" + "abs_" + i.toString());

                    // do a bunch of stuff to get the authors formatted nicely
                    let authors = paper_json[i]["entryTags"]["author"].replace(/[{}]/g, "").replace(/[~]/g, "").split(" and ");
                    let author_list = "";
                    let found_tom = false;
                    let first_author = false;
                    for (let j = 0; j < authors.length; j++) {
                        let author = authors[j].split(", ");
                        let author_format = author.reverse().join(" ");
                        if (author_format == "Tom Wagg") {
                            author_list += "<b>" + author_format + "</b>, "
                            found_tom = true;
                            if (j == 0) {
                                first_author = true;
                            }
                        } else {
                            if (j == authors.length - 1) {
                                if (author_format != "et al.") {
                                    author_list = author_list.slice(0, author_list.length - 2) + " and " + author_format;
                                } else {
                                    author_list += author_format
                                }
                            } else {
                                author_list += author_format + ", "
                            }
                        }
                    }

                    // add my name if not included
                    if (!found_tom) {
                        author_list += " (incl. <b>Tom Wagg</b>)";
                    }
                    publication.querySelector(".authors").innerHTML = author_list;

                    // add the corresponding list depending on author order
                    if (first_author) {
                        document.getElementById("first_author_list").appendChild(publication);
                    } else {
                        document.getElementById("co_author_list").appendChild(publication);
                    }
                }
            }
        }
    }
    rawFile.send(null);


    animateCSS(".masthead h1", "fadeInUp");
    setTimeout(function () {
        animateCSS(".masthead .h-33", "fadeInDown");
    }, 100);

    $("#about .img-fluid").on("click", function (e) {
        let ouch = this.parentElement.querySelector(".ouch");
        animateCSS(e.target, "swing", function () {
            ouch.classList.remove("hide");
            animateCSS(ouch, "zoomInDown", function () {
                setTimeout(function () {
                    animateCSS(ouch, "zoomOutUp", function () {
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

    document.querySelectorAll(".social-link").forEach(function (el) {
        el.addEventListener("click", function () {
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
    if (window.innerWidth >= 768) {
        const trigger = new ScrollTrigger({
            once: true,
        });
    }
});

function expandJournal(journal) {
    journal = journal.replace("\\aap", "Astronomy and Astrophysics");
    journal = journal.replace("\\aapr", "Astronomy and Astrophysics, Reviews");
    journal = journal.replace("\\aaps", "Astronomy and Astrophysics, Supplement");
    journal = journal.replace("\\apj", "Astrophysical Journal");
    journal = journal.replace("\\apjl", "Astrophysical Journal, Letters");
    journal = journal.replace("\\apjs", "Astrophysical Journal, Supplement");
    journal = journal.replace("\\mnras", "Monthly Notices of the RAS");
    journal = journal.replace("\\aj", "Astronomical Journal");
    return journal;
}

function expandDetails(volume, pages, number) {
    if (volume === undefined && pages === undefined && number == undefined) {
        return undefined;
    } else if (volume === undefined && number == undefined) {
        return pages;
    } else if (number === undefined) {
        return pages + ":" + volume;
    } else {
        return volume + "(" + number + ")" + ":" + pages;
    }
}