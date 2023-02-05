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
    kilonovae: "Explosions similar to supernovae but less bright (typically from a merger involving a neutron star",
    "short gamma-ray bursts": "Bursts of gamma-rays that last fewer than about 2 seconds",
    neutrinos: "Fundamental particle that is emitted during certain nuclear reactions",
    '"lower mass gap"': "No black holes have been detected between about 2 to 5 times the mass of the sun, forming a 'gap'",
    "black hole mass function": "A function that describes how many black holes exist at different masses",
    pulsars: "A rapidly rotating compact object (usually a neutron star) with jets of radiation beaming out its poles",
    "square kilometre array": "A radio telescope that can be used to detect pulsars",
    dco: "Double compact object",
    dcos: "Double compact objects",
    "compact object": "White dwarfs, neutron stars and black holes",
    "compact objects": "White dwarfs, neutron stars and black holes",
    metallicity: "Fraction of the object that is composed of elements more massive than H and He",
    "eccentric systems": "A system of two objects that have an orbit that isn't circular, but instead more elliptical",
    "orbital frequency": "The frequency at which a binary system completes an orbit (e.g. once per year)",
    bhbh: "Binary black hole",
    bhbhs: "Binary black holes",
    bhns: "Black hole neutron star binary",
    bhnss: "Black hole neutron star binaries",
    nsns: "Binary neutron star",
    nsnss: "Binary neutron stars",
    wdwd: "Binary white dwarf",
    wdwds: "Binary white dwarfs",
    fiducial: "default, but not necessarily favoured",
    eccentricity: "A measure of how eccentric an orbit is. Eccentricity of 0 means circular and higher eccentricity is more eccentric/elliptical",
    "mass ratio": "Ratio of the masses in a binary system. Masses are more equal the closer this is to 1",
    snr: "Signal-to-noise ratio",
    snrs: "Signal-to-noise ratios",
    "chirp mass": "A quantity that combines the two masses of a binary, it is often used in gravitational wave measurements",
    "chirp masses": "A quantity that combines the two masses of a binary, it is often used in gravitational wave measurements",
    "common-envelopes": "A possible phase of binary evolution in which the binary is surrounded by a common envelope of gas",
    "wolf-rayet": "A type of star in a late stage of its life that experiences strong stellar winds",
    "pair-instability supernovae": "A type of supernova that occurs in very massive stars due to the pair production of electrons and positrons",
    "remnant mass prescription": "A function that provides the mass of a remnant (e.g. black hole or neutron star) given the mass of the progenitor immediately prior to supernova",
    // ------------------
    // Solar system stuff
    // ------------------
    neo: "Near-Earth Object (asteroid or comet that comes with 1.3au of the Sun)",
    neos: "Near-Earth Objects (asteroids or comets that comes with 1.3au of the Sun)",
    mba: "Main Belt Asteroid",
    mbas: "Main Belt Asteroids",
    neocp: "Near-Earth Object Confirmation Page - Website updated nightly with potential near-Earth objects that require follow-up",
    purity: "Fraction of objects that are near-Earth objects (rest are usually main belt asteroids)",
    traffic: "Number of objects that are submitted to the near-Earth object confirmation page",
    lsst: "Legacy Survey of Space and Time",
    ecliptic: "The orbital plane of the Earth around the Sun (most planets and the asteroid belt lie on this plane)",
    "ecliptic latitude": "Latitude above or below the ecliptic plane",
};

window.addEventListener("load", function () {
    document.getElementById("home").addEventListener("click", function () {
        window.location.href = "/";
    });

    var tooltipTriggerList = [].slice.call(document.querySelectorAll('i[data-bs-toggle="tooltip"]'));
    var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });

    document.querySelectorAll(".lipsum").forEach(function (el) {
        el.innerHTML =
            "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Aliquam varius feugiat urna, et venenatis ligula sodales a. Duis blandit elit id nunc rutrum consectetur. Donec lectus arcu, scelerisque vitae leo sit amet, ultricies lacinia mauris. Sed at hendrerit dolor, non gravida purus. Etiam bibendum mauris a erat consectetur dapibus. Pellentesque odio libero, cursus id finibus at, ultricies in nulla. Donec faucibus lorem risus, sit amet vulputate sapien varius condimentum. Ut eu elit magna. Vestibulum ut dictum nisl. Vestibulum eget mauris nisi. Phasellus sem metus, mollis quis interdum lobortis, porttitor nec massa. Aenean in lacus sed neque accumsan gravida. Pellentesque ut nulla eget nulla sodales vehicula. Aliquam congue pharetra enim eu tincidunt. Duis vitae elementum felis. Aliquam erat volutpat. Nullam posuere sodales magna id suscipit. Sed nibh felis, scelerisque eu lobortis id, consectetur at enim. In efficitur mauris nulla, quis fermentum justo tristique nec. Suspendisse ut tristique dui. Pellentesque posuere venenatis mauris sit amet sodales. Sed sagittis, ante suscipit molestie tristique, magna leo vehicula ante, quis congue diam tellus et ex. Sed ut eros commodo, pharetra justo non, vestibulum ipsum. Curabitur consequat magna ac diam venenatis, ut ornare purus pretium. Nunc sit amet fermentum dolor, a eleifend eros. Etiam et lectus ut dolor rutrum sodales. Vivamus eget accumsan magna, vitae sodales diam. Praesent nisi orci, pharetra sed egestas et, eleifend id purus. Aliquam erat volutpat. Mauris bibendum dignissim orci, a porta nisl accumsan sed. Vivamus feugiat laoreet euismod. Etiam nec purus ante. Vestibulum eu facilisis felis. Donec nec augue ac tortor dignissim auctor non id dolor. Morbi vehicula tellus sit amet fermentum lacinia. Morbi augue nibh, interdum viverra pulvinar in, facilisis vitae nibh. Maecenas sit amet dui sodales dui egestas semper. Donec hendrerit lorem eget sagittis tincidunt. Praesent suscipit purus vel diam auctor, at tempus erat sagittis. Donec est magna, pulvinar a efficitur sed, viverra ac tellus. Praesent scelerisque congue tellus vitae porttitor. Etiam ac neque et leo interdum sagittis. Praesent lobortis, eros vestibulum eleifend luctus, sapien mi egestas leo, nec blandit velit felis vel enim. Duis ut interdum eros. Duis eleifend quam odio, et suscipit lectus efficitur sed. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Suspendisse tempor venenatis fringilla. In volutpat metus sit amet ultricies fringilla. Maecenas tempus consequat tristique. Nunc tempus faucibus ipsum, cursus accumsan nisl interdum ut. Fusce a leo justo. Pellentesque cursus sapien vel lorem accumsan, id consectetur nulla scelerisque. Aenean placerat egestas diam vel interdum. Suspendisse gravida ligula nec nisi laoreet, non convallis lectus varius. Aenean vitae lacus dapibus, finibus dui eu, convallis mi. Nunc a sem et odio mattis aliquam. Morbi finibus malesuada turpis eget auctor.";
    });

    document.querySelectorAll(".jargon").forEach(function (el) {
        const jargon = el.innerText.toLowerCase().trim();
        let explanation = glossary[jargon];
        if (explanation === undefined) {
            explanation = "Tom messed up. There should be a definition here.";
            console.log("You missed me:", jargon);
        }
        el.setAttribute("data-bs-toggle", "tooltip");
        el.setAttribute("data-bs-placement", "top");
        el.setAttribute("title", explanation);
        new bootstrap.Tooltip(el);
    });

    let conclusions = document.getElementById("conclusion-carousel");
    conclusions.addEventListener("slide.bs.carousel", function (e) {
        document.querySelector(".conclusion-toggle.active").classList.remove("active");
        document.querySelectorAll(".conclusion-toggle")[e.to].classList.add("active");
    });
});
