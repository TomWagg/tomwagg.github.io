const sizes = {
    'red': 1,
    'orange': 1,
    'small_green': 1.5,
    'big_green': 2.5,
}

const labels = {
    'red': 'red (nothing)',
    'orange': 'orange (nothing)',
    'small_green': 'small green (you 3 forward or others 3s back)',
    'big_green': 'big green (you 2 forward or others 2 back)',
}

const css_colour = {
    'red': 'darkred',
    'orange': 'orange',
    'small_green': 'darkgreen',
    'big_green': 'darkgreen',
}

window.addEventListener("load", function() {
    document.getElementById("spin").addEventListener("click", function() {
        let interval = setInterval(function() {
            let col = randomColour();
            document.getElementById("colour").innerText = labels[col];
            document.getElementById("colour").style = "color:" + css_colour[col];
        }, 100);

        setTimeout(function() {
            clearInterval(interval);
        }, 2000);
    });
});

function randomColour() {
    let totalSizes = 0;

    let sizes = [1, 1, 1.5, 2.5]
    let colours = ["red", "orange", "small_green", "big_green"]
    let cumulative_normalised_sizes = [0, 0, 0, 0]

    for (let i = 0; i < sizes.length; i++) {
        totalSizes += sizes[i]
    }

    cumulative_normalised_sizes[0] = sizes[0] / totalSizes
    for (let i = 1; i < sizes.length; i++) {
        cumulative_normalised_sizes[i] = sizes[i] / totalSizes + cumulative_normalised_sizes[i - 1]
    }

    let random = Math.random();

    for (let i = 0; i < cumulative_normalised_sizes.length; i++) {
        if (random < cumulative_normalised_sizes[i]) {
            return colours[i];
        }
    }
}