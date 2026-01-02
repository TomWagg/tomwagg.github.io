function animateCSS(element, animationName, callback) {
    let nodes = null;
    if (typeof element == "string") {
        nodes = document.querySelectorAll(element);
    } else {
        nodes = [element];
    }
    nodes.forEach(function (node) {
        node.classList.add("animated", animationName);
        node.addEventListener("animationend", function () {
            this.classList.remove("animated", animationName);
            if (typeof callback === "function") callback();
        }, { once: true });
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
        document.getElementById("setup-error").classList.add("hide");

        const playerNameStr = document.getElementById("player-names").value
        const playerNames = playerNameStr.split(",").map(name => name.trim()).filter(name => name.length > 0);

        if (playerNames.length < 3) {
            document.getElementById("setup-error").classList.remove("hide");
            document.getElementById("setup-error").textContent = "Please enter at least 3 player names.";
            return;
        }

        const numImposters = parseInt(document.getElementById("num-imposters").value);

        // ensure number of imposters is valid
        if (numImposters < 1 || numImposters >= playerNames.length) {
            document.getElementById("setup-error").classList.remove("hide");
            document.getElementById("setup-error").textContent = "Number of imposters must be at least 1 and less than the number of players.";
            return;
        }

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
            document.getElementById("setup-error").classList.remove("hide");
            document.getElementById("setup-error").textContent = "Please provide a valid word list.";
            return;
        }

        // choose the imposters randomly
        const shuffledPlayers = playerNames.slice().sort(() => 0.5 - Math.random());
        const imposters = shuffledPlayers.slice(0, numImposters);

        // choose a random word from the word list
        const chosenWord = wordList[Math.floor(Math.random() * wordList.length)];

        const template = document.getElementById("role-card-template");
        const roleCardsContainer = document.getElementById("role-card-container");
        roleCardsContainer.innerHTML = ""; // clear previous cards if any

        // create a new card for each player with their role and the chosen word
        for (let i = 0; i < playerNames.length; i++) {
            const player = playerNames[i];
            const isImposter = imposters.includes(player);
            let roleWord = isImposter ? "You are an Imposter!" : `<span class="highlighted-word">${chosenWord}</span><br>is the word.`;
            if (isImposter && revealImposters && imposters.length > 1) {
                roleWord += `<br>Fellow Imposters: ${imposters.filter(p => p !== player).join(", ")}`;
            }

            let new_card = template.cloneNode(true);
            new_card.id = "";
            new_card.classList.remove("hide");
            if (isImposter) new_card.classList.add("imposter");
            new_card.querySelector(".player-name").textContent = player;
            new_card.querySelector(".role-card-back .role").textContent = isImposter ? "Imposter" : "Citizen";
            new_card.querySelector(".role-card-back .word-info").innerHTML = roleWord;
            new_card.querySelector(".role-card-back .role-icon").src = isImposter ? "../../img/imposter.png" : "../../img/citizen.png";
            new_card.querySelector(".role-card-back").style.backgroundColor = isImposter ? "rgb(81, 36, 36)" : "rgb(51, 74, 51)";

            new_card.addEventListener("click", function () {
                if (new_card.classList.contains("flipped")) {
                    return;
                }
                new_card.classList.add("flipped");
            });


            new_card.querySelector(".end-turn-btn").addEventListener("click", function (e) {
                e.stopPropagation(); // prevent the card click event

                // flip the card back over
                new_card.classList.remove("flipped");

                // animate the card out
                animateCSS(new_card, "fadeOutDownBig", function () {
                    new_card.remove();
                });
            });

            roleCardsContainer.appendChild(new_card);
        }

        for (let i = 0; i < roleCardsContainer.children.length; i++) {
            const card = roleCardsContainer.children[i];
            card.style.zIndex = roleCardsContainer.children.length - i;
            card.style.position = "absolute";
            card.style.top = `${i * 1 + 170}px`;
            card.style.left = `${i * 1}px`;
        }

        // set the first player name by choosing a non-imposter at random
        const nonImposters = playerNames.filter(name => !imposters.includes(name));
        const firstPlayer = nonImposters[Math.floor(Math.random() * nonImposters.length)];
        document.getElementById("first-player-name").textContent = firstPlayer;

        // set up the restart button
        document.getElementById("restart-btn").addEventListener("click", function () {
            window.location.reload();
        });

        // hide the setup form and show the role cards
        document.getElementById("setup").classList.add("hide");
        document.getElementById("cards").classList.remove("hide");
    });
});
