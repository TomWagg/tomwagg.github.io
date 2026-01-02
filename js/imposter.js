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

const word_lists = {
    locations: ["beach", "mountain", "desert", "forest", "city", "village", "island", "cave", "river", "lake", "ocean", "park", "garden", "castle", "temple", "market", "harbor", "station", "airport", "stadium"],
    fruits: ["apple", "banana", "orange", "grape", "mango", "peach", "pear", "plum", "kiwi", "melon", "cherry", "papaya", "fig", "date", "lime", "coconut", "apricot", "blueberry", "raspberry", "strawberry"],
    countries: ["canada", "brazil", "france", "germany", "india", "japan", "kenya", "mexico", "norway", "spain", "turkey", "uganda", "vietnam", "yemen", "zambia", "argentina", "belgium", "chile", "denmark", "egypt"],
    jobs: ["doctor", "engineer", "teacher", "artist", "chef", "pilot", "nurse", "farmer", "scientist", "writer", "musician", "lawyer", "architect", "plumber", "electrician", "mechanic", "firefighter", "police", "dancer", "actor"],
    animals: ["lion", "tiger", "elephant", "giraffe", "zebra", "kangaroo", "panda", "koala", "dolphin", "whale", "shark", "eagle", "owl", "penguin", "rabbit", "squirrel", "fox", "bear", "wolf", "deer"]
}

window.addEventListener("DOMContentLoaded", (event) => {
    const wordListSelect = document.getElementById("word-list-select");
    const customWordListInput = document.getElementById("custom-word-list");

    const word_list_names = Object.keys(word_lists);
    for (const listName of word_list_names) {
        const option = document.createElement("option");
        option.value = listName;
        option.textContent = listName.charAt(0).toUpperCase() + listName.slice(1);
        wordListSelect.appendChild(option);
    }
    wordListSelect.options[0].selected = true;

    // add the custom option
    const customOption = document.createElement("option");
    customOption.value = "custom";
    customOption.textContent = "Custom";
    wordListSelect.appendChild(customOption);

    // show or hide the custom word list input based on selection
    wordListSelect.addEventListener("change", (event) => {
        if (event.target.value === "custom") {
            customWordListInput.classList.remove("hide");
        } else {
            customWordListInput.classList.add("hide");
        }
    });

    const gameSetupForm = document.getElementById("setup-form");
    gameSetupForm.addEventListener("submit", (event) => {
        event.preventDefault();

        const playerNames = document.getElementById("player-names").value.split(",").map(name => name.trim()).filter(name => name.length > 0);
        const numImposters = parseInt(document.getElementById("num-imposters").value);
        const revealImposters = document.getElementById("reveal-imposters").checked;
        let wordList = [];

        const selectedWordList = wordListSelect.value;
        if (selectedWordList === "custom") {
            const customWords = customWordListInput.value;
            wordList = customWords.split(",").map(word => word.trim()).filter(word => word.length > 0);
        } else {
            wordList = word_lists[selectedWordList];
        }

        if (wordList.length === 0) {
            alert("Please provide a valid word list.");
            return;
        }

        console.log("Starting game with settings:");
        console.log("Player Names:", playerNames);
        console.log("Number of Imposters:", numImposters);
        console.log("Reveal Imposters:", revealImposters);
        console.log("Word List:", wordList);
    });
});
