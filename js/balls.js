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

// bool for whether a round is currently being played
let round_going = false;

// set up canvas and make it fill the screen
let canvas = document.getElementById("ball-game");
let ctx = canvas.getContext("2d");

canvas.width = canvas.clientWidth;
canvas.height = canvas.clientHeight;

// get message el for future reference
const message = document.getElementById("message");

// define default ball size and position/speed
let ballRadius = 10;
let x = canvas.width / 2;
let y = canvas.height / 2;
let dx = 0;
let dy = 0;

// set up bars for each player
let player1 = canvas.height / 4;
let player2 = canvas.height / 4;
const player_width = 10;
const player_speed = 50;
let player_height = canvas.height / 2;
const shrink_factor = 0.95;
const speed_up_factor = 1.02;

// prevent scrolling to avoid confusion
window.addEventListener(
    "wheel",
    function (e) {
        e.preventDefault();
    },
    {passive: false}
);

window.addEventListener("keydown", function (e) {
    if (e.key == "Escape") {
        e.preventDefault();
        window.location.href = "/";
    }
});

// listen for key presses
window.addEventListener(
    "keydown",
    function (e) {
        if (["ArrowUp", "ArrowDown", "w", "s"].includes(e.key) && round_going) {
            e.preventDefault();

            clearPlayers();

            // use w/s and up/down for moving each player
            if (e.key == "w") {
                player1 -= player_speed;
            } else if (e.key == "s") {
                player1 += player_speed;
            } else if (e.key == "ArrowUp") {
                player2 -= player_speed;
            } else if (e.key == "ArrowDown") {
                player2 += player_speed;
            }

            // prevent players from going off the edge of the screen
            if (player1 < 0) {
                player1 = 0;
            }
            if (player1 > canvas.height - player_height) {
                player1 = canvas.height - player_height;
            }
            if (player2 < 0) {
                player2 = 0;
            }
            if (player2 > canvas.height - player_height) {
                player2 = canvas.height - player_height;
            }
        } else if (e.key == " " && round_going) {
            e.preventDefault();

            // if the spacebar is pressed then start the game
            // randomly select x and y speeds (with always dx >= dy)
            dx = (canvas.width / 600) * (Math.random() < 0.5 ? 1 : -1);
            dy = Math.random() * (canvas.width / 600) * (Math.random() < 0.5 ? 1 : -1);

            message.classList.add("hide");
        }
    },
    {passive: false}
);

function reset() {
    // reset the positions and speeds of all pieces
    x = canvas.width / 2;
    y = canvas.height / 2;
    dx = 0;
    dy = 0;

    player1 = canvas.height / 4;
    player2 = canvas.height / 4;
    player_height = canvas.height / 2;

    // bring the message back
    message.classList.remove("hide");

    // start the drawing again
    round_going = true;
    draw_interval = setInterval(draw, 1);
}

function drawBall() {
    // make a purple ball
    ctx.beginPath();
    ctx.arc(x, y, ballRadius, 0, Math.PI * 2);
    ctx.fillStyle = "purple";
    ctx.fill();
    ctx.closePath();
}

function clearPlayers() {
    // clear off the players (with extra pixels just in case)
    ctx.clearRect(-1, player1 - 1, player_width + 1, player_height + 1);
    ctx.clearRect(canvas.width - player_width - 1, player2 - 1, player_width + 1, player_height + 1);
}

function drawPlayers() {
    // draw blue and red players
    ctx.fillStyle = "#0095DD";
    ctx.fillRect(0, player1, player_width, player_height);
    ctx.fillStyle = "red";
    ctx.fillRect(canvas.width - player_width, player2, player_width, player_height);
}

function drawGoals() {
    // draw the goal lines with grey dotted lines
    ctx.beginPath();
    ctx.fillStyle = "grey";
    ctx.setLineDash([2, 5]);
    ctx.moveTo(player_width, 0);
    ctx.lineTo(player_width, canvas.height);
    ctx.stroke();

    ctx.moveTo(canvas.width - player_width, 0);
    ctx.lineTo(canvas.width - player_width, canvas.height);
    ctx.stroke();
}

function draw() {
    // clear everything off
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // add each of the pieces
    drawPlayers();
    drawGoals();
    drawBall();

    // condition for whether the ball is about to hit an edge (offset by radius and player width)
    hit_right_edge = x + dx > canvas.width - ballRadius - player_width;
    hit_left_edge = x + dx < ballRadius + player_width;

    // conditions for whether the ball is in line with each player
    withinp1 = y + ballRadius > player1 && y - ballRadius < player1 + player_height;
    withinp2 = y + ballRadius > player2 && y - ballRadius < player2 + player_height;

    // if it's about to hit the edge and a player
    if ((hit_left_edge && withinp1) || (hit_right_edge && withinp2)) {
        // flip the direction
        dx = -dx;
        dx *= speed_up_factor;
        dy *= speed_up_factor;

        // shrink the players and shift them to it looks like both ends shrink
        player1 += player_height * (1 - shrink_factor);
        player2 += player_height * (1 - shrink_factor);
        player_height *= shrink_factor;
    } else if (hit_left_edge || hit_right_edge) {
        // otherwise if you hit an x-edge then someone scored!

        // check who scored
        let id = "";
        if (x > canvas.width / 2) {
            id = "player-1-score";
        } else {
            id = "player-2-score";
        }

        // update the score
        const score_el = document.getElementById(id);
        score_el.innerText = parseInt(score_el.innerText) + 1;

        // stop drawing
        clearInterval(draw_interval);
        round_going = false;

        drawPlayers();

        // reset everything after a second
        setTimeout(reset, 1000);
        return;
    }

    // if you hit the y-edges then just flip the direction
    if (y + dy > canvas.height - ballRadius || y + dy < ballRadius) {
        dy = -dy;
    }

    // apply speeds
    x += dx;
    y += dy;
}

reset();
