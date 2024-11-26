// tetris shapes that we will drop
const shapes = [
    [
        [0, 0],
        [0, 1],
        [1, 0],
        [1, 1],
    ], // square from bottom-left
    [
        [0, 0],
        [1, 0],
        [2, 0],
        [3, 0],
    ], // line from top
    [
        [0, 0],
        [1, 0],
        [1, 1],
        [-1, 0],
    ], // L-shape right
    [
        [0, 0],
        [1, 0],
        [-1, 1],
        [-1, 0],
    ], // L-shape left
    [
        [0, 0],
        [1, 0],
        [1, -1],
        [0, 1],
    ], // Z shape
    [
        [0, 0],
        [1, 0],
        [1, 1],
        [0, -1],
    ], // S shape
    [
        [0, 0],
        [1, 0],
        [0, -1],
        [0, 1],
    ], // podium shape
]

// bool for whether a round is currently being played
let round_going = false

// track the rows cleared and what level they're on
let rows_cleared = 0
let level = 1

// track the current timestep size and how much to decrease it each level
let timestep = 1000
const speed_up_factor = 0.95

// whether to drop a new block this round
let drop_new_block = true

// the current falling block
let falling_block = []

// what column and row the main subblock occupies
let falling_col = -1
let falling_row = -1

// what kind of shape it is
let falling_shape_index = 0

// set up canvas and make it fill the screen
let canvas = document.getElementById('tetris-game')
let ctx = canvas.getContext('2d')
const square = Math.min(window.innerHeight, window.innerWidth)
canvas.width = square
canvas.height = square

let grid_canvas = document.getElementById('grid')
grid_ctx = grid_canvas.getContext('2d')
grid_canvas.width = square
grid_canvas.height = square

// create a grid and set up individual box sizes
const n_row_col = 15
const box_size = square / n_row_col

// instantiate the board
let board = []
for (let i = 0; i < n_row_col; i++) {
    let row = []
    for (let j = 0; j < n_row_col; j++) {
        row.push(0)
    }
    board.push(row)
}

// get message el for future reference
const message = document.getElementById('message')

// get the row and level message for reference
const rows_cleared_text = document.getElementById('rows')
const level_text = document.getElementById('level')
drawGridLines()

// general helper functions
// ------------------------

function animateCSS(element, animationName, callback) {
    let nodes = null
    if (typeof element == 'string') {
        nodes = document.querySelectorAll(element)
    } else {
        nodes = [element]
    }
    nodes.forEach(function (node) {
        node.classList.add('animated', animationName)
        $(node).one('animationend', function () {
            this.classList.remove('animated', animationName)
            if (typeof callback === 'function') callback()
        })
    })
}

function randint(min_val, max_val) {
    diff = max_val - 1 - min_val
    return Math.round(Math.random() * diff) + min_val
}

// collision checkers
// ------------------

function anything_right() {
    for (let subblock of falling_block) {
        if (falling_row + subblock[0] >= n_row_col) {
            continue
        }
        if (falling_col + subblock[1] >= n_row_col - 1 || board[falling_row + subblock[0]][falling_col + subblock[1] + 1] == 1) {
            return true
        }
    }
    return false
}

function anything_left() {
    for (let subblock of falling_block) {
        if (falling_row + subblock[0] >= n_row_col) {
            continue
        }
        if (falling_col + subblock[1] == 0 || board[falling_row + subblock[0]][falling_col + subblock[1] - 1] == 1) {
            return true
        }
    }
    return false
}

function anything_below() {
    for (let subblock of falling_block) {
        if (falling_row + subblock[0] >= n_row_col) {
            continue
        }
        if (falling_row + subblock[0] == 0 || board[falling_row + subblock[0] - 1][falling_col + subblock[1]] == 1) {
            return true
        }
    }
    return false
}

// drawing functions
// -----------------

function drawFallingBlock() {
    ctx.fillStyle = 'purple'
    for (let subblock of falling_block) {
        ctx.fillRect((falling_col + subblock[1]) * box_size, (n_row_col - falling_row - 1 - subblock[0]) * box_size, box_size, box_size)
    }
}

function clearFallingBlock() {
    for (let subblock of falling_block) {
        ctx.clearRect((falling_col + subblock[1]) * box_size, (n_row_col - falling_row - 1 - subblock[0]) * box_size, box_size, box_size)
    }
}

function drawBoxes() {
    ctx.fillStyle = '#0095DD'
    for (let row = 0; row < board.length; row++) {
        for (let col = 0; col < board[row].length; col++) {
            if (board[row][col] == 1) {
                ctx.fillRect(col * box_size, (n_row_col - row - 1) * box_size, box_size, box_size)
            }
        }
    }
}

function drawGridLines() {
    grid_ctx.fillStyle = 'grey'
    grid_ctx.setLineDash([2, 5])
    for (let i = 0; i < board.length; i++) {
        grid_ctx.beginPath()
        grid_ctx.moveTo(i * box_size, 0)
        grid_ctx.lineTo(i * box_size, canvas.height)
        grid_ctx.stroke()

        grid_ctx.beginPath()
        grid_ctx.moveTo(0, i * box_size)
        grid_ctx.lineTo(canvas.width, i * box_size)
        grid_ctx.stroke()
    }
}

// EVENT LISTENERS
// ---------------

// prevent scrolling to avoid confusion
window.addEventListener(
    'wheel',
    function (e) {
        e.preventDefault()
    },
    { passive: false }
)

window.addEventListener('keydown', function (e) {
    if (e.key == 'Escape') {
        e.preventDefault()
        window.location.href = '/'
    }
})

// listen for key presses
window.addEventListener(
    'keydown',
    function (e) {
        if (['ArrowLeft', 'ArrowRight', 'ArrowDown'].includes(e.key) && round_going) {
            e.preventDefault()

            // use w/s and up/down for moving each player
            if (e.key == 'ArrowLeft' && !anything_left()) {
                clearFallingBlock()
                falling_col -= 1
                drawFallingBlock()
            } else if (e.key == 'ArrowRight' && !anything_right()) {
                clearFallingBlock()
                falling_col += 1
                drawFallingBlock()
            } else if (e.key == 'ArrowDown' && !anything_below()) {
                clearFallingBlock()
                falling_row -= 1
                drawFallingBlock()
            }
        } else if (e.key == 'a' || (e.key == 'd' && round_going)) {
            clearFallingBlock()

            let new_falling_block = []
            for (let i = 0; i < falling_block.length; i++) {
                new_falling_block.push([falling_block[i][0], falling_block[i][1]])
            }

            const n_subblocks = falling_block.length
            let can_rotate = true
            for (let i = 0; i < n_subblocks; i++) {
                let x = falling_block[i][0]
                let y = falling_block[i][1]
                new_falling_block[i][0] = e.key == 'd' ? -y : y
                new_falling_block[i][1] = e.key == 'd' ? x : -x
                const board_val = board[falling_row + new_falling_block[i][0]][falling_col + new_falling_block[i][1]]
                if (board_val == undefined || board_val == 1) {
                    can_rotate = false
                }
            }
            if (can_rotate) {
                falling_block = new_falling_block
            }
            drawFallingBlock()
        } else if (e.key == ' ' && !round_going) {
            e.preventDefault()

            // if the spacebar is pressed then start the game
            round_going = true
            draw_interval = setInterval(draw, timestep)
            message.classList.add('hide')
        }
    },
    { passive: false }
)

// MAIN GAME FUNCTIONS
// -------------------

function reset() {
    for (let i = 0; i < n_row_col; i++) {
        for (let j = 0; j < n_row_col; j++) {
            board[i][j] = 0
        }
    }

    // bring the message back
    message.classList.remove('hide')

    // stop running the game
    clearInterval(draw_interval)
    round_going = false
}

function draw() {
    // clear everything off
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    // drawGridLines()

    // check which rows on the board are currently full
    let full_rows = []
    for (let i = 0; i < n_row_col; i++) {
        let row_full = true
        console.log(board[i], i)
        for (let j = 0; j < n_row_col; j++) {
            if (board[i][j] == 0) {
                row_full = false
                break
            }
        }
        if (row_full) {
            full_rows.push(i)
        }
    }

    // clear the full rows and increase the score
    for (let i = 0; i < full_rows.length; i++) {
        board.splice(full_rows[i] - i, 1)
        board.push(Array(n_row_col).fill(0))
        rows_cleared += 1
    }

    // if we're ready for a new block
    if (drop_new_block) {
        // pick a random column
        falling_col = randint(2, n_row_col - 2)
        falling_row = n_row_col - 2

        // pick a random shape
        falling_shape_index = randint(0, shapes.length)
        falling_block = shapes[falling_shape_index]
        drop_new_block = false

        // drop it!
        drawFallingBlock()
    } else if (anything_below()) {
        // something just hit the floor, update the board and save a new block
        drop_new_block = true
        for (let subblock of falling_block) {
            if (falling_row + subblock[0] >= n_row_col || falling_block + subblock[1] >= n_row_col) {
                game_over()
            }
            board[falling_row + subblock[0]][falling_col + subblock[1]] = 1
        }
    } else {
        // nothing hit the floor, move the block down a level
        falling_row -= 1
        drawFallingBlock()
    }

    drawBoxes()

    rows_cleared_text.innerText = rows_cleared
}

function game_over() {
    reset()
}

reset()
