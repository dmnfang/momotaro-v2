import { useState, useEffect, useRef } from 'react'
import './CardGameScreen.css'

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function generateTiles(teams, activeTeamIndex) {
  const pointTiles = Array.from({ length: 8 }, () => ({
    type: 'points',
    value: Math.floor(Math.random() * 5) + 1
  }))
  const oni = { type: 'oni', value: -5 }
  const leaderScore = Math.max(...teams.map(t => t.score))
  const myScore = teams[activeTeamIndex].score
  const needsHelp = leaderScore > 0 && myScore < leaderScore * 0.6
  const shuffledPoints = shuffle(pointTiles)
  if (needsHelp) return [...shuffledPoints, oni]
  const oniPos = 2 + Math.floor(Math.random() * 7)
  const result = [...shuffledPoints]
  result.splice(oniPos, 0, oni)
  return result
}

function CardGameScreen({ game, updateGame, goTo }) {
  const [tiles, setTiles] = useState([])
  const [tileStates, setTileStates] = useState([])
  const [oniProtected, setOniProtected] = useState(false)
  const [roundPoints, setRoundPoints] = useState(0)
  const [flippedCount, setFlippedCount] = useState(0)
  const [oniFlipped, setOniFlipped] = useState(false)
  const [keepDisabled, setKeepDisabled] = useState(true)
  const [keepLabel, setKeepLabel] = useState('Keep!')
  const [keepColor, setKeepColor] = useState('')
  const [keepCallback, setKeepCallback] = useState(null)
  const [letters] = useState(() => shuffle([...ALPHABET]).slice(0, 9))
  const pointsRef = useRef(null)
  const pointsZoneRef = useRef(null)
  const tilesRef = useRef([])
  const roundPointsRef = useRef(0)

  const team = game.teams[game.activeTeamIndex]

  useEffect(() => {
    const generated = generateTiles(game.teams, game.activeTeamIndex)
    setTiles(generated)
    tilesRef.current = generated
    setTileStates(Array(9).fill('hidden'))
    setRoundPoints(0)
    roundPointsRef.current = 0
    setFlippedCount(0)
    setOniFlipped(false)
    setOniProtected(false)
    setKeepDisabled(true)
    setKeepLabel('Keep!')
    setKeepColor('')
    setKeepCallback(null)
  }, [])

  useEffect(() => {
    fitRoundPoints()
  }, [roundPoints])

  const fitRoundPoints = () => {
    const el = pointsRef.current
    const zone = pointsZoneRef.current
    if (!el || !zone) return
    const digits = String(Math.abs(roundPoints)).length + 1
    const maxWidth = (zone.clientWidth - 16) / (digits * 0.75)
    const maxHeight = zone.clientHeight * 0.8
    const size = Math.min(maxWidth, maxHeight)
    el.style.fontSize = Math.floor(size) + 'px'
  }

  const handleFlip = (index) => {
    if (tileStates[index] !== 'hidden' || oniFlipped) return

    let tile = tilesRef.current[index]

    if (tile.type === 'oni' && flippedCount < 2) {
      const safeIndex = tilesRef.current.findIndex(
        (t, i) => t.type === 'points' && tileStates[i] === 'hidden' && i !== index
      )
      if (safeIndex !== -1) {
        const newTiles = [...tilesRef.current]
        ;[newTiles[index], newTiles[safeIndex]] = [newTiles[safeIndex], newTiles[index]]
        tilesRef.current = newTiles
        setTiles(newTiles)
        tile = newTiles[index]
      }
    }

    setTileStates(prev => {
      const next = [...prev]
      next[index] = 'flipping'
      return next
    })

    setTimeout(() => {
      if (tile.type === 'oni') {
        revealOni(index)
      } else {
        revealPoints(index, tile.value)
      }
    }, 150)
  }

  const revealPoints = (index, value) => {
    setTileStates(prev => {
      const next = [...prev]
      next[index] = 'points'
      return next
    })
    const newCount = flippedCount + 1
    setFlippedCount(newCount)
    if (newCount === 1) setKeepDisabled(false)
    setRoundPoints(prev => {
      const next = prev + value
      roundPointsRef.current = next
      return next
    })
  }

  const revealOni = (index) => {
    setOniFlipped(true)
    setTileStates(prev => {
      const next = [...prev]
      next[index] = 'oni'
      for (let i = 0; i < next.length; i++) {
        if (next[i] === 'hidden') next[i] = 'dead'
      }
      return next
    })

    if (team.omamori > 0) {
      // flyOmamoriToOni — after 200ms transform the oni tile to protected state
      setTimeout(() => {
        setOniProtected(true)
        const newTeams = game.teams.map((t, i) =>
          i === game.activeTeamIndex ? { ...t, omamori: 0 } : t
        )
        updateGame({ teams: newTeams })
        setTimeout(() => {
          setKeepLabel('Keep!')
          setKeepColor('var(--confirm)')
          setKeepDisabled(false)
          setKeepCallback(() => () => endTurn(roundPointsRef.current))
        }, 500)
      }, 200)
    } else {
      setRoundPoints(prev => {
        const next = prev - 5
        roundPointsRef.current = next
        setTimeout(() => {
          setKeepLabel('Back to Scoreboard')
          setKeepColor('var(--oni-red)')
          setKeepDisabled(false)
          setKeepCallback(() => () => endTurn(next))
        }, 100)
        return next
      })
    }
  }

  const handleKeep = () => {
    if (keepCallback) keepCallback()
    else endTurn(roundPointsRef.current)
  }

  const endTurn = (points) => {
    const sign = points >= 0 ? '+' : ''
    const teamIndex = game.activeTeamIndex
    const oldScore = game.teams[teamIndex].score
    const newScore = oldScore + points
    const newHistory = [...game.turnHistory, {
      name: game.teams[teamIndex].name,
      result: `${sign}${points} points`
    }]
    const nextTeamIndex = (teamIndex + 1) % game.teamCount
    updateGame({
      activeTeamIndex: nextTeamIndex,
      turnHistory: newHistory,
      pendingScoreChange: { teamIndex, oldScore, newScore }
    })
    goTo('scoreboard')
  }

  const sign = roundPoints >= 0 ? '+' : ''

  return (
    <div className="cardgame-screen">
      <div className="cardgame-topbar">
        <span className="cardgame-team-label">{team.name} – Choose some cards!</span>
      </div>

      <div className="cardgame-body">
        <div className="tile-grid">
          {tiles.map((tile, i) => {
            const state = tileStates[i] || 'hidden'
            let cls = 'tile'
            if (state === 'flipping') cls += ' flipping'
            if (state === 'points') cls += ' flipped revealed-points'
            if (state === 'oni' && !oniProtected) cls += ' flipped revealed-oni'
            if (state === 'oni' && oniProtected) cls += ' flipped oni-protected'
            if (state === 'dead') cls += ' flipped tile-dead'

            return (
              <div key={i} className={cls} onClick={() => handleFlip(i)}>
                {(state === 'hidden' || state === 'flipping') && (
                  <span className="tile-letter">{letters[i]}</span>
                )}
                {state === 'points' && (
                  <div className="tile-content">
                    <span className="tile-points-text">+{tile.value} point{tile.value > 1 ? 's' : ''}</span>
                    <img className="tile-img" src={`/assets/card-points-${tile.value}.png`} alt={`${tile.value} points`} onError={e => e.target.style.display = 'none'} />
                  </div>
                )}
                {state === 'oni' && !oniProtected && (
                  <div className="tile-content">
                    <span className="tile-points-text" style={{ color: 'var(--oni-red)' }}>–5 points</span>
                    <img className="tile-img" src="/assets/card-oni.png" alt="Oni" onError={e => e.target.style.display = 'none'} />
                  </div>
                )}
                {state === 'oni' && oniProtected && (
                  <div className="tile-content">
                    <span className="tile-points-text" style={{ textDecoration: 'line-through', color: 'var(--text-muted)' }}>–5 points</span>
                    <img className="tile-img" src="/assets/card-omamori.png" alt="Protected" onError={e => e.target.style.display = 'none'} />
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <div className="cardgame-panel">
          <div className="panel-center">
            <div className="panel-points-zone" ref={pointsZoneRef}>
              <div className="round-points" ref={pointsRef}>{sign}{roundPoints}</div>
            </div>
            <div className="panel-omamori-zone">
              <div className="omamori-slots">
                <div className={`omamori-slot ${team.omamori >= 1 ? '' : 'empty'}`}>
                  <img src="/assets/card-omamori.png" alt="omamori" />
                </div>
              </div>
            </div>
          </div>

          <div className="panel-scores">
            {game.teams.map((t, i) => (
              <div key={i} className={`panel-score-row ${i === game.activeTeamIndex ? 'active-team' : ''}`}>
                <span className="panel-score-name">{t.name}</span>
                <span className="panel-score-value">{t.score}</span>
              </div>
            ))}
          </div>

          <button
            className="keep-btn"
            disabled={keepDisabled}
            style={{ background: keepColor || '' }}
            onClick={handleKeep}
          >
            {keepLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

export default CardGameScreen