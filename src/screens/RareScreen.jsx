import { useState } from 'react'
import './RareScreen.css'

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')
const BASE = import.meta.env.BASE_URL

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function generateTiles(teams, activeTeamIndex) {
  const allZero = teams.every(t => t.score === 0)
  const tiles = [
    allZero ? { type: 'points', value: 15 } : { type: 'swap' },
    { type: 'omamori' },
    { type: 'omamori' },
    { type: 'points', value: 15 },
  ]
  return shuffle(tiles)
}

function RareScreen({ game, updateGame, goTo }) {
  const [tiles] = useState(() => generateTiles(game.teams, game.activeTeamIndex))
  const [letters] = useState(() => shuffle([...ALPHABET]).slice(0, 4))
  const [tileStates, setTileStates] = useState(Array(4).fill('hidden'))
  const [flippedIndex, setFlippedIndex] = useState(null)
  const [panel, setPanel] = useState('waiting')
  const [swapTarget, setSwapTarget] = useState(null)

  const team = game.teams[game.activeTeamIndex]
  const currentIdx = game.activeTeamIndex

  const handleFlip = (index) => {
    if (tileStates[index] !== 'hidden' || flippedIndex !== null) return

    setTileStates(prev => {
      const next = [...prev]
      next[index] = 'flipping'
      return next
    })

    setTimeout(() => {
      setTileStates(prev => {
        const next = [...prev]
        next[index] = tiles[index].type
        return next
      })
      setFlippedIndex(index)
      setPanel(tiles[index].type)
    }, 150)
  }

  const handleConfirmPoints = (value) => {
    const teamIndex = game.activeTeamIndex
    const oldScore = game.teams[teamIndex].score
    const newScore = oldScore + value
    const newHistory = [...game.turnHistory, {
      name: game.teams[teamIndex].name,
      result: `Rare (+${value} points)`
    }]
    const nextTeamIndex = (teamIndex + 1) % game.teamCount
    updateGame({
      activeTeamIndex: nextTeamIndex,
      turnHistory: newHistory,
      pendingScoreChange: { teamIndex, oldScore, newScore }
    })
    goTo('scoreboard')
  }

  const handleConfirmOmamori = () => {
    const teamIndex = game.activeTeamIndex
    const alreadyMax = game.teams[teamIndex].omamori >= 1
    const newTeams = alreadyMax ? game.teams : game.teams.map((t, i) =>
      i === teamIndex ? { ...t, omamori: 1 } : t
    )
    const newHistory = [...game.turnHistory, {
      name: game.teams[teamIndex].name,
      result: 'Rare (omamori)'
    }]
    const nextTeamIndex = (teamIndex + 1) % game.teamCount
    updateGame({ teams: newTeams, activeTeamIndex: nextTeamIndex, turnHistory: newHistory })
    goTo('scoreboard')
  }

  const handleConfirmSwap = () => {
    if (swapTarget === null) return
    const teamIndex = game.activeTeamIndex
    const newHistory = [...game.turnHistory, {
      name: game.teams[teamIndex].name,
      result: 'Rare (swap)'
    }]
    const nextTeamIndex = (teamIndex + 1) % game.teamCount
    updateGame({
      activeTeamIndex: nextTeamIndex,
      turnHistory: newHistory,
      pendingSwap: { from: teamIndex, to: swapTarget }
    })
    goTo('scoreboard')
  }

  const tile = flippedIndex !== null ? tiles[flippedIndex] : null

  return (
    <div className="rare-screen">
      <div className="rare-topbar">
        <span className="rare-team-label">{team.name} – Choose 1 rare card!</span>
      </div>

      <div className="rare-body">
        <div className="rare-grid">
          {tiles.map((t, i) => {
            const state = tileStates[i]
            let cls = 'rare-tile'
            if (state === 'flipping') cls += ' flipping'
            if (state !== 'hidden' && state !== 'flipping') cls += ' flipped selected-rare'

            return (
              <div key={i} className={cls} onClick={() => handleFlip(i)}>
                {(state === 'hidden' || state === 'flipping') && (
                  <span className="rare-tile-letter">{letters[i]}</span>
                )}
                {state === 'points' && (
                  <div className="tile-content">
                    <span className="tile-points-text">+{t.value} points</span>
                    <img className="tile-img" src={`${BASE}assets/card-points-rare.png`} alt="rare points" onError={e => e.target.style.display = 'none'} />
                  </div>
                )}
                {state === 'omamori' && (
                  <div className="tile-content">
                    <span className="tile-points-text">Omamori!</span>
                    <img className="tile-img" src={`${BASE}assets/card-omamori.png`} alt="omamori" onError={e => e.target.style.display = 'none'} />
                  </div>
                )}
                {state === 'swap' && (
                  <div className="tile-content">
                    <span className="tile-points-text" style={{ fontWeight: 900 }}>Swap!</span>
                    <img className="tile-img" src={`${BASE}assets/card-swap.png`} alt="swap" onError={e => e.target.style.display = 'none'} />
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <div className="rare-panel">
          {panel === 'waiting' && (
            <div className="rare-panel-title" style={{ color: 'var(--text-muted)' }}>
              Flip a card to reveal your reward
            </div>
          )}

          {panel === 'points' && tile && (
            <>
              <div className="rare-panel-title">You got {tile.value} points!</div>
              <div className="rare-panel-body">
                <div className="rare-panel-value">+{tile.value}</div>
              </div>
              <button className="rare-confirm-btn" onClick={() => handleConfirmPoints(tile.value)}>
                End Turn
              </button>
            </>
          )}

          {panel === 'omamori' && (
            <>
              <div className="rare-panel-title">
                {team.omamori >= 1 ? 'Already have an omamori!' : 'You got an omamori!'}
              </div>
              <div className="rare-panel-body">
                <img className="rare-panel-img" src={`${BASE}assets/card-omamori.png`} alt="omamori" onError={e => e.target.style.display = 'none'} />
                <div className="rare-panel-omamori-count">
                  {team.omamori >= 1 ? 'You already have one!' : 'You now have an omamori!'}
                </div>
              </div>
              <button className="rare-confirm-btn" onClick={handleConfirmOmamori}>
                Confirm
              </button>
            </>
          )}

          {panel === 'swap' && (
            <>
              <div className="rare-panel-title">Choose a team to swap with...</div>
              <div className="rare-panel-body">
                <div className="swap-team-list">
                  {game.teams.map((t, i) => (
                    <div
                      key={i}
                      className={`swap-team-row ${i === currentIdx ? 'current-team' : ''} ${swapTarget === i ? 'selected-swap' : ''}`}
                      onClick={() => { if (i !== currentIdx) setSwapTarget(i) }}
                    >
                      <span className="swap-team-name">{t.name}</span>
                      <span className="swap-team-score">{t.score}</span>
                    </div>
                  ))}
                </div>
              </div>
              <button
                className="rare-confirm-btn"
                disabled={swapTarget === null}
                onClick={handleConfirmSwap}
              >
                Confirm
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default RareScreen