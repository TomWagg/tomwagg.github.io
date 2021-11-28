window.addEventListener("scroll", function () {
    const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
    const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    const scrolled = (winScroll / height) * 100;
    document.getElementById("myBar").style.width = scrolled + "%";
});

let glossary = {
    "like this": "This will contain an explanation of the term",
    "electromagnetic spectrum": "A range of different types of 'light', such as microwaves and gamma rays",
    "accretion disc": "A disc of matter that spirals around and into a large object (e.g. a black hole), friction causes the disc to heat up and emit energy",
    "general relativity": "Einstein's theory of general relativity is a theory that describes gravity and applies more generally than Newton's Laws of Gravitation",
    "hubble constant": "The Hubble constant describes how quickly the Universe is expanding",
    "binary systems": "Systems in which two objects (such as two black holes) orbit one another",
    "stellar-mass": "A system with a mass roughly similar to that of the Sun. Compare to intermediate mass and supermassive black holes",
    "r-process enrichment": "The enrichment of matter with many heavy elements that are produced by a specific series of rapid nuclear reactions",
    "kilonovae": "Explosions similar to supernovae but less bright (typically from a merger involving a neutron star",
    "short gamma-ray bursts": "Bursts of gamma-rays that last fewer than about 2 seconds",
    "neutrinos": "Fundamental particle that is emitted during certain nuclear reactions",
    '"lower mass gap"': "No black holes have been detected between about 2 to 5 times the mass of the sun, forming a 'gap'",
    "black hole mass function": "A function that describes how many black holes exist at different masses",
    "pulsars": "A rapidly rotating compact object (usually a neutron star) with jets of radiation beaming out its poles",
    "square kilometre array": "A radio telescope that can be used to detect pulsars",
    "dco": "Double compact object",
    "compact object": "White dwarfs, neutron stars and black holes",
};

window.addEventListener("load", function () {
    document.getElementById("home").addEventListener("click", function () {
        window.location.href = "/";
    });

    document.querySelectorAll(".lipsum").forEach(function (el) {
        console.log(el);
        el.innerHTML = "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Aliquam varius feugiat urna, et venenatis ligula sodales a. Duis blandit elit id nunc rutrum consectetur. Donec lectus arcu, scelerisque vitae leo sit amet, ultricies lacinia mauris. Sed at hendrerit dolor, non gravida purus. Etiam bibendum mauris a erat consectetur dapibus. Pellentesque odio libero, cursus id finibus at, ultricies in nulla. Donec faucibus lorem risus, sit amet vulputate sapien varius condimentum. Ut eu elit magna. Vestibulum ut dictum nisl. Vestibulum eget mauris nisi. Phasellus sem metus, mollis quis interdum lobortis, porttitor nec massa. Aenean in lacus sed neque accumsan gravida. Pellentesque ut nulla eget nulla sodales vehicula. Aliquam congue pharetra enim eu tincidunt. Duis vitae elementum felis. Aliquam erat volutpat. Nullam posuere sodales magna id suscipit. Sed nibh felis, scelerisque eu lobortis id, consectetur at enim. In efficitur mauris nulla, quis fermentum justo tristique nec. Suspendisse ut tristique dui. Pellentesque posuere venenatis mauris sit amet sodales. Sed sagittis, ante suscipit molestie tristique, magna leo vehicula ante, quis congue diam tellus et ex. Sed ut eros commodo, pharetra justo non, vestibulum ipsum. Curabitur consequat magna ac diam venenatis, ut ornare purus pretium. Nunc sit amet fermentum dolor, a eleifend eros. Etiam et lectus ut dolor rutrum sodales. Vivamus eget accumsan magna, vitae sodales diam. Praesent nisi orci, pharetra sed egestas et, eleifend id purus. Aliquam erat volutpat. Mauris bibendum dignissim orci, a porta nisl accumsan sed. Vivamus feugiat laoreet euismod. Etiam nec purus ante. Vestibulum eu facilisis felis. Donec nec augue ac tortor dignissim auctor non id dolor. Morbi vehicula tellus sit amet fermentum lacinia. Morbi augue nibh, interdum viverra pulvinar in, facilisis vitae nibh. Maecenas sit amet dui sodales dui egestas semper. Donec hendrerit lorem eget sagittis tincidunt. Praesent suscipit purus vel diam auctor, at tempus erat sagittis. Donec est magna, pulvinar a efficitur sed, viverra ac tellus. Praesent scelerisque congue tellus vitae porttitor. Etiam ac neque et leo interdum sagittis. Praesent lobortis, eros vestibulum eleifend luctus, sapien mi egestas leo, nec blandit velit felis vel enim. Duis ut interdum eros. Duis eleifend quam odio, et suscipit lectus efficitur sed. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Suspendisse tempor venenatis fringilla. In volutpat metus sit amet ultricies fringilla. Maecenas tempus consequat tristique. Nunc tempus faucibus ipsum, cursus accumsan nisl interdum ut. Fusce a leo justo. Pellentesque cursus sapien vel lorem accumsan, id consectetur nulla scelerisque. Aenean placerat egestas diam vel interdum. Suspendisse gravida ligula nec nisi laoreet, non convallis lectus varius. Aenean vitae lacus dapibus, finibus dui eu, convallis mi. Nunc a sem et odio mattis aliquam. Morbi finibus malesuada turpis eget auctor.";
    });

    document.querySelectorAll(".jargon").forEach(function(el) {
        const jargon = el.innerText.toLowerCase().trim();
        let explanation = glossary[jargon];
        if (explanation === undefined) {
            explanation = "Tom messed up. There should be a definition here."
        }
        el.setAttribute("data-bs-toggle", "tooltip");
        el.setAttribute("data-bs-placement", "top");
        el.setAttribute("title", explanation);
        new bootstrap.Tooltip(el)
    });
});