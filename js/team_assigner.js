gsap.registerPlugin(Flip)

const heuristics = [
    { name: 'position', label: 'Position Preference', default: 2, min: 0, max: 5 },
    { name: 'gender', label: 'Gender Balance', default: 2, min: 0, max: 5 },
    { name: 'skill', label: 'Skill Balance', default: 2, min: 0, max: 5 },
    { name: 'fitness', label: 'Fitness Balance', default: 2, min: 0, max: 5 },
    { name: 'size', label: 'Team Size Equality', default: 0.5, min: 0, max: 5 },
]
const positions = ['defense', 'midfield', 'forward']

// global variables
let playerDatabase = []
let currentPlayers = []
let weights = heuristics.reduce((obj, h) => ({ ...obj, [h.name]: h.default }), {})
let numTeams = null
let teams = null

// add slider controls for each heuristic
heuristics.forEach(({ name, label, default: def, min, max }) => {
    const idNum = `weight-number-${name}`
    const idRange = `weight-range-${name}`

    const col = document.createElement('div')
    col.className = 'col-md-6'

    col.innerHTML = `
      <label class="form-label fw-semibold">${label}</label>
      <div class="d-flex align-items-center">
        <input type="range" class="form-range me-3" min="${min}" max="${max}" step="0.5"
          value="${def}" id="${idRange}">
        <input type="number" class="form-control w-auto" min="${min}" max="${max}" step="0.5"
          value="${def}" id="${idNum}">
      </div>
    `
    document.getElementById('weight-controls').appendChild(col)

    const rangeInput = col.querySelector(`#${idRange}`)
    const numberInput = col.querySelector(`#${idNum}`)

    // Sync inputs
    rangeInput.addEventListener('input', () => {
        numberInput.value = rangeInput.value
        weights[name] = parseFloat(rangeInput.value)
    })
    numberInput.addEventListener('input', () => {
        rangeInput.value = numberInput.value
        weights[name] = parseFloat(rangeInput.value)
    })
})

// activate all tooltips
var tooltipTriggerList = [].slice.call(document.querySelectorAll('i[data-bs-toggle="tooltip"]'))
var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
    return new bootstrap.Tooltip(tooltipTriggerEl)
})

function parseCSV(text) {
    const rows = text.trim().split('\n')
    const headers = rows[0].split(',')
    return rows.slice(1).map((row) => {
        const values = row.split(',')
        return Object.fromEntries(headers.map((h, i) => [h.trim(), i < 2 ? values[i].trim() : parseInt(values[i].trim())]))
    })
}

document.getElementById('csvUpload').addEventListener('change', (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
        playerDatabase = parseCSV(event.target.result)
        // save the player's preferred position
        playerDatabase.forEach((player) => {
            player.preferredPosition = player.defense == 2 ? 'A' : player.midfield == 2 ? 'B' : 'C'
        })
        // sort player database by name
        playerDatabase.sort((a, b) => a.name.localeCompare(b.name))
        currentPlayers = playerDatabase.map((p) => p)
        renderPlayerPool(currentPlayers)
    }
    reader.readAsText(file)
})

function renderPlayerPool(players) {
    const container = document.getElementById('playerPool')
    container.innerHTML = ''
    players.forEach((player) => {
        const div = document.createElement('div')
        div.className = 'player-card me-2 mb-2 available'
        div.textContent = player.name
        div.dataset.name = player.name
        div.addEventListener('click', (e) => {
            const name = e.currentTarget.dataset.name
            const player = playerDatabase.find((p) => p.name === name)
            const el = e.currentTarget

            if (el.classList.contains('available')) {
                el.classList.remove('available', 'blue-team', 'pink-team', 'purple-team', 'white-team')
                currentPlayers = currentPlayers.filter((p) => p.name !== name)
            } else {
                el.classList.add('available')
                const parent = el.parentElement
                if (parent.classList.contains('player-list')) {
                    for (let i = 0; i < parent.children.length; i++) {
                        if (parent.children[i] != el) {
                            // copy just the team colour class (e.g. blue-team) to this element
                            const teamClass = parent.children[i].className.split(' ').find((c) => c.includes('-team'))
                            if (teamClass) {
                                el.classList.add(teamClass)
                            }
                            break
                        }
                    }
                }
                currentPlayers.push(player)
            }
        })
        container.appendChild(div)
    })
}

// make buttons mark all players as available or unavailable
document.getElementById('all-available').addEventListener('click', function () {
    const playerCards = document.querySelectorAll('.player-card')
    playerCards.forEach((card) => {
        card.classList.add('available')
    })
    currentPlayers = playerDatabase.map((p) => p)
})
document.getElementById('all-unavailable').addEventListener('click', function () {
    const playerCards = document.querySelectorAll('.player-card')
    playerCards.forEach((card) => {
        card.classList.remove('available', 'blue-team', 'pink-team', 'purple-team', 'white-team')
    })
    currentPlayers = []
})

function sortTeams() {
    // sort the players in each team by their preferred position, then by their name
    teams.forEach((team) => {
        team.players.sort((a, b) => {
            const posA = a.preferredPosition
            const posB = b.preferredPosition
            if (posA === posB) {
                return a.name.localeCompare(b.name)
            }
            return posA.localeCompare(posB)
        })
    })
}

// assign players to teams based on heuristics
function assignTeams(players, numTeams = null) {
    const totalPlayers = players.length
    if (!numTeams) {
        numTeams = totalPlayers <= 24 ? 2 : 4
    }

    // Add noise to skill and fitness
    players = players.map((player) => ({
        ...player,
        skill: player.skill + 0.01 * player.skill * (Math.random() - 0.5),
        fitness: player.fitness + 0.01 * player.fitness * (Math.random() - 0.5),
    }))

    // Sort players by skill then fitness
    players.sort((a, b) => b.skill - a.skill || b.fitness - a.fitness)

    teams = Array.from({ length: numTeams }, () => ({
        players: [],
        genders: {},
        positions: { defense: 0, midfield: 0, forward: 0 },
        totalSkill: 0,
        totalFitness: 0,
    }))

    const targetTotalSkill = (totalPlayers / numTeams) * 3
    const targetTotalFitness = (totalPlayers / numTeams) * 3

    for (const player of players) {
        const bestTeamIndex = bestTeamForPlayer(player, teams, targetTotalSkill, targetTotalFitness)
        const team = teams[bestTeamIndex]

        team.players.push(player)
        team.genders[player.gender] = (team.genders[player.gender] || 0) + 1
        ;['defense', 'midfield', 'forward'].forEach((pos) => {
            if (player[pos] > 0) {
                team.positions[pos] += 1
            }
        })
        team.totalSkill += player.skill
        team.totalFitness += player.fitness
    }

    colours = numTeams == 4 ? ['blue', 'purple', 'pink', 'white'] : ['blue', 'pink']

    teams.forEach((team, i) => {
        team.colour = colours[i]
    })

    // if Tom is playing tonight, make sure his team is blue mwhaha
    if (players.some((p) => p.name === 'Tom')) {
        const tomTeam = teams.find((team) => team.players.some((p) => p.name === 'Tom'))
        const tomTeamIndex = teams.indexOf(tomTeam)
        if (tomTeamIndex !== 0) {
            teams[0].colour = tomTeam.colour
            tomTeam.colour = colours[0]
        }
    }

    sortTeams()

    return teams
}

// work out the best Team for a player to be put on (greedy algorithm)
function bestTeamForPlayer(player, teams, targetTotalSkill, targetTotalFitness) {
    const minMembersBeforePositionScore = 3
    const scores = teams.map((team, idx) => {
        const genderScore = team.genders[player.gender] || 0

        let positionScore = 0
        for (const pos of ['defense', 'midfield', 'forward']) {
            if (player[pos] > 0 && team.positions[pos] === 0) {
                positionScore += player[pos]
            }
        }

        const newSkill = team.totalSkill + player.skill
        const newFitness = team.totalFitness + player.fitness
        const skillDiff = targetTotalSkill - newSkill
        const fitnessDiff = targetTotalFitness - newFitness
        const size = team.players.length

        const score = (size >= minMembersBeforePositionScore ? weights.position * positionScore : 0) + -weights.gender * genderScore + weights.skill * skillDiff + weights.fitness * fitnessDiff + -weights.size * size

        return score
    })

    const maxScore = Math.max(...scores)
    const bestIndices = scores.map((s, i) => (s === maxScore ? i : null)).filter((i) => i !== null)
    return bestIndices[Math.floor(Math.random() * bestIndices.length)]
}

document.getElementById('assignTeamsBtn').addEventListener('click', () => {
    teams = assignTeams(currentPlayers, numTeams)
    animatePlayersToTeams()
    enableDragAndDrop()
})

document.getElementById('numTeams').addEventListener('change', (e) => {
    numTeams = parseInt(e.target.value)
    if (isNaN(numTeams) || numTeams < 2 || numTeams > 4) {
        alert('Please enter a valid number of teams (2-4).')
        return
    }

    const state = Flip.getState('#team1Container, #team2Container', '#team3Container, #team4Container')
    const team1 = document.getElementById('team1Container')
    const team2 = document.getElementById('team2Container')
    const team3 = document.getElementById('team3Container')
    const team4 = document.getElementById('team4Container')

    if (numTeams === 2) {
        // hide teams 3 and 4 with FLIP animations
        team3.classList.add('hide')
        team4.classList.add('hide')

        team1.classList.remove('col-lg-3')
        team1.querySelectorAll('.team-stats .col-3').forEach((el) => {
            el.classList.remove('col-lg-6')
        })
        team2.classList.remove('col-lg-3')
        team2.querySelectorAll('.team-stats .col-3').forEach((el) => {
            el.classList.remove('col-lg-6')
        })
    } else {
        team3.classList.remove('hide')
        team4.classList.remove('hide')

        team1.classList.add('col-lg-3')
        team1.querySelectorAll('.team-stats .col-3').forEach((el) => {
            el.classList.add('col-lg-6')
        })
        team2.classList.add('col-lg-3')
        team2.querySelectorAll('.team-stats .col-3').forEach((el) => {
            el.classList.add('col-lg-6')
        })
    }

    Flip.from(state, {
        duration: 0.6,
        ease: 'power2.inOut',
        absolute: true,
    }).then(() => {
        teams = assignTeams(currentPlayers, numTeams)
        animatePlayersToTeams()
    })
})

// reset team position gaps
function resetTeamPositionGaps() {
    const teamContainers = document.querySelectorAll('.team-box .player-list')
    teamContainers.forEach((teamContainer) => {
        const players = teamContainer.querySelectorAll('.player-card')
        players.forEach((player) => {
            player.classList.remove('first-in-position')
        })
        positions.forEach((pos) => {
            const firstInPosition = teamContainer.querySelector(`.${pos}`)
            if (firstInPosition) {
                firstInPosition.classList.add('first-in-position')
            }
        })
    })
}

// animate players moving from the pool to their teams
function animatePlayersToTeams(extra_animation = null) {
    const poolCards = document.querySelectorAll('.player-card')
    const state = Flip.getState(poolCards)

    teams.forEach((team, i) => {
        const teamContainer = document.querySelector(`#team${i + 1} .player-list`)
        team.players.forEach((player) => {
            const card = Array.from(poolCards).find((c) => c.textContent === player.name)
            if (card) {
                card.classList.remove('blue-team', 'pink-team', 'purple-team', 'white-team')
                card.classList.add(`${team.colour}-team`)
                card.classList.add(
                    {
                        A: 'defense',
                        B: 'midfield',
                        C: 'forward',
                    }[player.preferredPosition]
                )
                teamContainer.appendChild(card)
            }
        })
    })

    // move players to the pool if they are unavailable in alphabetical order
    const playerPool = document.getElementById('playerPool')
    let unavailableCards = Array.from(poolCards).filter((card) => !card.classList.contains('available'))
    unavailableCards.sort((a, b) => a.textContent.localeCompare(b.textContent))
    unavailableCards.forEach((card) => {
        card.classList.remove('blue-team', 'pink-team', 'purple-team', 'white-team', 'first-in-position')
        card.remove()
        playerPool.appendChild(card)
    })

    // fix the height during animation
    document.querySelectorAll('#teamContainer .team-box').forEach((teamBox) => {
        teamBox.style.height = teamBox.offsetHeight + 'px'
    })

    // recompute the stats with the new teams
    document.querySelectorAll('.team-stats').forEach((el) => {
        computeStats(el.parentElement)
    })

    if (extra_animation !== null) {
        extra_animation()
    }

    resetTeamPositionGaps()

    // perform the animation
    Flip.from(state, {
        duration: 0.6,
        ease: 'power2.inOut',
        absolute: true,
    }).then(() => {
        // remove the height fix
        document.querySelectorAll('#teamContainer .team-box').forEach((teamBox) => {
            teamBox.style.height = 'auto'
        })
    })
}

function computeStats(teamContainer) {
    const player_cards = teamContainer.querySelectorAll('.player-card')
    let player_names = []
    for (let i = 0; i < player_cards.length; i++) {
        player_names.push(player_cards[i].getAttribute('data-name'))
    }
    const players = player_names.map((name) => playerDatabase.find((p) => p.name === name))
    const totalSkill = players.reduce((sum, player) => sum + parseInt(player.skill), 0)
    const totalFitness = players.reduce((sum, player) => sum + parseInt(player.fitness), 0)
    const size = players.length
    const n_male = players.reduce((sum, player) => sum + (player.gender == 'M' ? 1 : 0), 0)

    teamContainer.querySelector('.stat.total-skill').textContent = totalSkill
    teamContainer.querySelector('.stat.total-fitness').textContent = totalFitness
    teamContainer.querySelector('.stat.size').textContent = size
    teamContainer.querySelector('.stat.gender-balance').textContent = `${size - n_male}/${n_male}`
}

// Enable drag-and-drop after assignment
function enableDragAndDrop() {
    document.querySelectorAll('.player-list').forEach((el) => {
        new Sortable(el, {
            group: 'teams',
            animation: 150,
            ghostClass: 'ghost',
            onEnd: (evt) => {
                // recompute stats
                document.querySelectorAll('.team-stats').forEach((el) => {
                    computeStats(el.parentElement)
                })

                // match this player's colour to the other players in that teamContainer
                let newClassName = null
                const children = evt.to.closest('.team-box').querySelectorAll('.player-card')
                for (let i = 0; i < children.length; i++) {
                    console.log(children[i])
                    if (children[i] !== evt.item) {
                        newClassName = children[i].className
                        break
                    }
                }
                evt.item.className = newClassName

                // find the player's old team
                const playerName = evt.item.getAttribute('data-name')
                const player = playerDatabase.find((p) => p.name === playerName)
                const oldTeam = teams.find((team) => team.players.some((p) => p.name === playerName))

                // work out what their new team should be
                const newTeamContainer = evt.to.closest('.team-box')
                const newTeam = teams[parseInt(newTeamContainer.querySelector('h3').innerText.split(' ')[1]) - 1]

                // if the team has changed, update the teams array
                if (oldTeam !== newTeam) {
                    oldTeam.players = oldTeam.players.filter((p) => p.name !== playerName)
                    newTeam.players.push(player)
                }

                // re-sort the teams
                sortTeams()

                // animation the players, with some extra movement to account for re-sorting
                animatePlayersToTeams(() => {
                    // find index of player in the new team
                    const playerIndex = newTeam.players.findIndex((p) => p.name === playerName)

                    // move it into the right position
                    evt.item.remove()
                    const playerList = newTeamContainer.querySelector('.player-list')
                    playerList.insertBefore(evt.item, playerList.children[playerIndex])
                })
            },
        })
    })
}

function generateMockCSV(numLines = 28, filename = 'mock_players.csv') {
    const headers = ['name', 'gender', 'skill', 'fitness', 'defense', 'midfield', 'forward']

    // Predefined list of common English words
    const wordList = ['apple', 'banana', 'cherry', 'delta', 'echo', 'falcon', 'giraffe', 'golf', 'hotel', 'india', 'juliet', 'kilo', 'lima', 'mango', 'november', 'oscar', 'papa', 'quebec', 'romeo', 'sierra', 'tango', 'uniform', 'victor', 'whiskey', 'xray', 'yankee', 'zulu', 'alpha', 'bravo', 'charlie', 'foxtrot']

    // Ensure we have enough unique names
    if (numLines > wordList.length) {
        console.error('Not enough unique words to generate the requested number of lines.')
        return
    }

    // Shuffle the word list and select the required number of unique names
    const shuffledWords = wordList.sort(() => 0.5 - Math.random())
    const selectedNames = shuffledWords.slice(0, numLines).map((word) => {
        // Capitalize the first letter and make the rest lowercase
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    })

    const rows = [headers.join(',')]

    selectedNames.forEach((name) => {
        const gender = Math.random() < 0.5 ? 'F' : 'M'
        const skill = Math.floor(Math.random() * 5) + 1
        const fitness = Math.floor(Math.random() * 5) + 1

        const positions = [0, 0, 0]
        const mainPos = Math.floor(Math.random() * 3)
        positions[mainPos] = 2

        // Optionally assign 1 to other positions randomly
        for (let i = 0; i < 3; i++) {
            if (i !== mainPos && Math.random() < 0.3) {
                positions[i] = 1
            }
        }

        rows.push([name, gender, skill, fitness, ...positions].join(','))
    })

    const csvContent = rows.join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = filename
    link.click()
}

document.getElementById('mockCSV').addEventListener('click', () => {
    generateMockCSV(28)
})
