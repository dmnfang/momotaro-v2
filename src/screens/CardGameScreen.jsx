import { useState, useEffect, useRef } from 'react'
import { sound } from '../lib/sound'
import './CardGameScreen.css'

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')
const BASE = import.meta.env.BASE_URL
const POINT_TILE_COUNT = 8

const CONFETTI_COLORS = [
  'var(--sun-500)', 'var(--sky-500)', 'var(--coral-500)', 'var(--leaf-500)',
  'var(--grape-500)', 'var(--bubblegum-500)', 'var(--mint-500)',
]

function makeConfetti(count = 48) {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    size: 12 + Math.floor(Math.random() * 3) * 4,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    round: Math.random() < 0.4,
    drift: Math.round((Math.random() - 0.5) * 160),
    delay: Math.random() * 0.6,
    duration: 2 + Math.random() * 1.5,
  }))
}

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function generateTiles(teams, activeTeamIndex) {
  const pointValues = [5, 5, 4, 3, 3, 2, 2, 1]
  const pointTiles = pointValues.map(value => ({ type: 'points', value }))
  const oni = { type: 'oni', value: -10 }
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
  const [confetti, setConfetti] = useState(null)
  const [letters] = useState(() => shuffle([...ALPHABET]).slice(0, 9))
  const pointsRef = useRef(null)
  const pointsZoneRef = useRef(null)
  const tilesRef = useRef([])
  const roundPointsRef = useRef(0)
  const flippedCountRef = useRef(0)

  const team = game.teams[game.activeTeamIndex]

  useEffect(() => {
    const generated = generateTiles(game.teams, game.activeTeamIndex)
    setTiles(generated)
    tilesRef.current = generated
    setTileStates(Array(9).fill('hidden'))
    setRoundPoints(0)
    roundPointsRef.current = 0
    setFlippedCount(0)
    flippedCountRef.current = 0
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

  useEffect(() => {
    if (!confetti) return
    const t = setTimeout(() => setConfetti(null), 4500)
    return () => clearTimeout(t)
  }, [confetti])

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

    // Every points tile is already flipped (or flipping): the oni is locked
    const pointsOpened = tilesRef.current.filter(
      (t, i) => t.type === 'points' && tileStates[i] !== 'hidden'
    ).length
    if (tile.type === 'oni' && pointsOpened === POINT_TILE_COUNT) return

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

    sound.play('cardFlip')
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
    flippedCountRef.current += 1
    const newCount = flippedCountRef.current
    const allClear = newCount === POINT_TILE_COUNT
    // pitch climbs with every points tile found
    sound.play('tilePop', { rate: 1 + (newCount - 1) * 0.05 })
    setTileStates(prev => {
      const next = [...prev]
      next[index] = 'points'
      // All points tiles found: lock the oni so it can't be flipped
      if (allClear) {
        for (let i = 0; i < next.length; i++) {
          if (next[i] === 'hidden') next[i] = 'dead'
        }
      }
      return next
    })
    setFlippedCount(newCount)
    if (newCount === 1) setKeepDisabled(false)
    if (allClear) {
      setConfetti(makeConfetti())
      sound.play('celebration')
    }
    setRoundPoints(prev => {
      const next = prev + value
      roundPointsRef.current = next
      return next
    })
  }

  const revealOni = (index) => {
  setOniFlipped(true)
  const oniValue = tilesRef.current[index].value // -10
  setTileStates(prev => {
    const next = [...prev]
    next[index] = 'oni'
    for (let i = 0; i < next.length; i++) {
      if (next[i] === 'hidden') next[i] = 'dead'
    }
    return next
  })

  if (team.omamori > 0) {
    setTimeout(() => {
      setOniProtected(true)
      sound.play('correct')
      const newTeams = game.teams.map((t, i) =>
        i === game.activeTeamIndex ? { ...t, omamori: 0 } : t
      )
      updateGame({ teams: newTeams })
      setTimeout(() => {
        setKeepLabel('Keep!')
        setKeepColor('var(--success)')
        setKeepDisabled(false)
        setKeepCallback(() => () => endTurn(roundPointsRef.current))
      }, 500)
    }, 200)
  } else {
    sound.play('wrong')
    setRoundPoints(prev => {
      const next = prev + oniValue
      roundPointsRef.current = next
      setTimeout(() => {
        setKeepLabel('Back to Scoreboard')
        setKeepColor('var(--oni)')
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
      {confetti && (
        <div className="confetti-layer" aria-hidden="true">
          {confetti.map(p => (
            <span
              key={p.id}
              className="confetti-piece"
              style={{
                left: `${p.left}%`,
                width: p.size,
                height: p.size,
                background: p.color,
                borderRadius: p.round ? '50%' : 4,
                '--drift': `${p.drift}px`,
                animationDelay: `${p.delay}s`,
                animationDuration: `${p.duration}s`,
              }}
            />
          ))}
        </div>
      )}
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
                    <img className="tile-img" src={`${BASE}assets/card-points-${tile.value}.png`} alt={`${tile.value} points`} onError={e => e.target.style.display = 'none'} />
                  </div>
                )}
                {state === 'oni' && !oniProtected && (
                  <div className="tile-content">
                    <span className="tile-points-text" style={{ color: 'var(--oni)' }}>–10 points</span>
                    <img className="tile-img" src={`${BASE}assets/card-oni.png`} alt="Oni" onError={e => e.target.style.display = 'none'} />
                  </div>
                )}
                {state === 'oni' && oniProtected && (
                  <div className="tile-content">
                    <span className="tile-points-text" style={{ textDecoration: 'line-through', color: 'var(--text-muted)' }}>–10 points</span>
                    <img className="tile-img" src={`${BASE}assets/card-omamori.png`} alt="Protected" onError={e => e.target.style.display = 'none'} />
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
                  <img src={`${BASE}assets/card-omamori.png`} alt="omamori" />
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
            className="launch-btn launch-btn-confirm"
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