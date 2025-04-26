gsap.registerPlugin(Flip)

const heuristics = [
    { name: 'position', label: 'Position Preference', default: 2, min: 0, max: 5 },
    { name: 'gender', label: 'Gender Balance', default: 2, min: 0, max: 5 },
    { name: 'skill', label: 'Skill Balance', default: 2, min: 0, max: 5 },
    { name: 'fitness', label: 'Fitness Balance', default: 2, min: 0, max: 5 },
    { name: 'size', label: 'Team Size Equality', default: 0.5, min: 0, max: 5 },
]

// Handles CSV upload and player list matching
let playerDatabase = []
let currentPlayers = []
let weights = heuristics.reduce((obj, h) => ({ ...obj, [h.name]: h.default }), {})
let numTeams = null

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

var tooltipTriggerList = [].slice.call(document.querySelectorAll('i[data-bs-toggle="tooltip"]'))
var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
    return new bootstrap.Tooltip(tooltipTriggerEl)
})

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

    const teams = Array.from({ length: numTeams }, () => ({
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
        // console.log(bestTeamIndex)
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

    return teams
}

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
        currentPlayers = playerDatabase.map((p) => p)
        renderPlayerPool(currentPlayers)
        console.log('Loaded database:', playerDatabase)
    }
    reader.readAsText(file)
})

document.getElementById('assignTeamsBtn').addEventListener('click', () => {
    console.log(currentPlayers)
    const teams = assignTeams(currentPlayers, numTeams)
    console.log(teams)
    animatePlayersToTeams(teams)
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
        const teams = assignTeams(currentPlayers, numTeams)
        animatePlayersToTeams(teams)
    })
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
                currentPlayers.push(player)
            }
        })
        container.appendChild(div)
    })
}

function renderTeams(teams, containerId) {
    const container = document.getElementById(containerId)
    container.innerHTML = ''
    teams.forEach((team, i) => {
        const teamDiv = document.createElement('div')
        teamDiv.className = 'team-card'
        teamDiv.innerHTML = `
        <h4>Team ${i + 1}</h4>
        <p>Size: ${team.players.length}</p>
        <p>Total Skill: ${team.totalSkill.toFixed(0)}</p>
        <p>Total Fitness: ${team.totalFitness.toFixed(0)}</p>
        <div class="player-list"></div>
      `
        container.appendChild(teamDiv)

        const playerList = teamDiv.querySelector('.player-list')
        team.players.forEach((player, j) => {
            const playerEl = document.createElement('div')
            playerEl.className = 'player-card'
            playerEl.textContent = player.name
            playerEl.style.opacity = 0
            playerList.appendChild(playerEl)
            setTimeout(() => {
                playerEl.style.transition = 'all 0.4s ease'
                playerEl.style.transform = 'translateY(0px)'
                playerEl.style.opacity = 1
            }, 100 * j)
        })
    })
}

// Animate players moving from the pool to their teams
function animatePlayersToTeams(teams) {
    const poolCards = document.querySelectorAll('.player-card')
    const state = Flip.getState(poolCards)

    teams.forEach((team, i) => {
        const teamContainer = document.querySelector(`#team${i + 1} .player-list`)
        team.players.forEach((player) => {
            const card = Array.from(poolCards).find((c) => c.textContent === player.name)
            if (card) {
                card.classList.remove('blue-team', 'pink-team', 'purple-team', 'white-team')
                card.classList.add(`${team.colour}-team`)
                teamContainer.appendChild(card)
            }
        })
    })

    const playerPool = document.getElementById('playerPool')

    poolCards.forEach((card) => {
        if (!card.classList.contains('available')) {
            card.remove()
            playerPool.appendChild(card)
        }
    })

    document.querySelectorAll('#teamContainer .team-box').forEach((teamBox) => {
        teamBox.style.height = teamBox.offsetHeight + 'px'
    })

    document.querySelectorAll('.team-stats').forEach((el) => {
        computeStats(el.parentElement)
    })

    Flip.from(state, {
        duration: 0.6,
        ease: 'power2.inOut',
        absolute: true,
    }).then(() => {
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
            },
        })
    })
}
