import { useState, useEffect, useRef } from 'react'
import { fetchQuestions } from '../lib/api'
import './ScoreboardScreen.css'

const BASE = import.meta.env.BASE_URL

function ScoreboardScreen({ game, updateGame, goTo }) {
  const scoreRefs = useRef([])
  const [showHistory, setShowHistory] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(!!document.fullscreenElement)

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', handler)
    return () => document.removeEventListener('fullscreenchange', handler)
  }, [])

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.()
    } else {
      document.exitFullscreen?.()
    }
  }

  const fitScore = (el) => {
    const zone = el?.parentElement
    if (!el || !zone) return
    const digits = String(Math.abs(parseInt(el.textContent) || 0)).length
    const maxWidth = (zone.clientWidth - 16) / (digits * 0.7)
    const maxHeight = zone.clientHeight * 0.8
    const size = Math.min(maxWidth, maxHeight)
    el.style.fontSize = Math.floor(size) + 'px'
  }

  useEffect(() => {
    setTimeout(() => {
      scoreRefs.current.forEach(el => el && fitScore(el))
    }, 50)
  }, [game.teams, game.activeTeamIndex])

  useEffect(() => {
    if (!game.pendingScoreChange) return
    const { teamIndex, oldScore, newScore } = game.pendingScoreChange
    const el = scoreRefs.current[teamIndex]
    if (!el) return

    const delta = newScore - oldScore
    const isPositive = delta >= 0
    const duration = 600
    const steps = 20
    const stepMs = duration / steps
    const stepVal = delta / steps

    el.style.transition = 'color 0.2s ease'
    el.style.color = isPositive ? 'var(--confirm)' : 'var(--oni-red)'

    let current = oldScore
    let step = 0

    const tick = setInterval(() => {
      step++
      current += stepVal
      el.textContent = Math.round(current)
      if (step >= steps) {
        clearInterval(tick)
        el.textContent = newScore
        fitScore(el)
        const newTeams = game.teams.map((t, i) =>
          i === teamIndex ? { ...t, score: newScore } : t
        )
        setTimeout(() => {
          el.style.transition = 'color 0.5s ease'
          el.style.color = ''
          setTimeout(() => { el.style.transition = '' }, 550)
        }, 200)
        updateGame({ teams: newTeams, pendingScoreChange: null })
      }
    }, stepMs)

    return () => clearInterval(tick)
  }, [game.pendingScoreChange])

  useEffect(() => {
    if (!game.pendingSwap) return
    const { from, to } = game.pendingSwap
    const fromEl = scoreRefs.current[from]
    const toEl = scoreRefs.current[to]
    if (!fromEl || !toEl) return

    const els = [fromEl, toEl]
    const PULSE_COUNT = 3
    const PULSE_MS = 300

    if (!document.getElementById('swap-keyframes')) {
      const style = document.createElement('style')
      style.id = 'swap-keyframes'
      style.textContent = `
        @keyframes swapPulse {
          0%,100% { transform: scale(1); }
          50%      { transform: scale(1.18); }
        }
      `
      document.head.appendChild(style)
    }

    els.forEach(el => {
      el.style.transition = `color ${PULSE_MS}ms ease`
      fitScore(el)
    })

    let pulse = 0

    const doPulse = () => {
      if (pulse >= PULSE_COUNT) {
        const newTeams = [...game.teams]
        const tmp = newTeams[from].score
        newTeams[from] = { ...newTeams[from], score: newTeams[to].score }
        newTeams[to] = { ...newTeams[to], score: tmp }

        els.forEach(el => {
          el.style.animation = 'swapPulse 0.35s cubic-bezier(0.34,1.56,0.64,1)'
        })

        fromEl.textContent = newTeams[from].score
        toEl.textContent = newTeams[to].score
        els.forEach(el => fitScore(el))

        setTimeout(() => {
          els.forEach(el => {
            el.style.transition = 'color 0.6s ease'
            el.style.color = ''
            el.style.animation = ''
          })
          setTimeout(() => {
            els.forEach(el => { el.style.transition = '' })
            updateGame({ teams: newTeams, pendingSwap: null })
          }, 650)
        }, 400)
        return
      }

      const toRed = pulse % 2 === 0
      els.forEach(el => {
        el.style.color = toRed ? 'var(--oni-red)' : '#6AB4E8'
      })
      pulse++
      setTimeout(doPulse, PULSE_MS)
    }

    doPulse()
  }, [game.pendingSwap])

  const handleOpenQuestion = async (teamIndex) => {
    const sharedQueue = [...game.sharedQueue]
    if (sharedQueue.length > 0) {
      const q = sharedQueue.shift()
      updateGame({ sharedQueue, activeTeamIndex: teamIndex, currentQuestion: q })
      goTo('question')
      return
    }

    const teamQueues = game.teamQueues.map(tq => [...tq])
    if (!teamQueues[teamIndex] || teamQueues[teamIndex].length === 0) {
      const allQuestions = []
      for (const unitId of game.selectedUnits) {
        const questions = await fetchQuestions(unitId)
        allQuestions.push(...questions)
      }
      teamQueues[teamIndex] = allQuestions.sort(() => Math.random() - 0.5)
    }

    const q = teamQueues[teamIndex].shift()
    updateGame({ teamQueues, activeTeamIndex: teamIndex, currentQuestion: q })
    if (q) goTo('question')
  }

  const handleOverrideTurn = (teamIndex) => {
    updateGame({ activeTeamIndex: teamIndex })
  }

  const rounds = []
  let round = []
  game.turnHistory.forEach((entry, i) => {
    round.push(entry)
    if (round.length === game.teamCount || i === game.turnHistory.length - 1) {
      rounds.push([...round])
      round = []
    }
  })

  return (
    <div className="scoreboard-screen">
      <div className="scoreboard-topbar">
        <button className="nav-btn" onClick={() => goTo('setup')}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M12 15L7 10L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <button className="nav-btn" onClick={() => setShowHistory(true)}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.8"/>
            <path d="M10 6v4l2.5 2.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
        </button>
        <button className="nav-btn" onClick={toggleFullscreen}>
  <i className={`ti ${isFullscreen ? 'ti-arrows-minimize' : 'ti-arrows-maximize'}`} />
</button>
      </div>

      <div className="scoreboard-columns" data-teams={game.teamCount}>
        {game.teams.map((team, i) => (
          <div
            key={i}
            className={`team-column ${i === game.activeTeamIndex ? 'active' : ''}`}
          >
            <div
              className="team-column-name"
              onClick={() => handleOverrideTurn(i)}
            >
              {team.name}
            </div>

            <div className="team-score-zone">
              <div
                className="team-column-score"
                ref={el => scoreRefs.current[i] = el}
              >
                {team.score}
              </div>
            </div>

            <div className="omamori-display">
              <div className="omamori-slots">
                <div className={`omamori-slot ${team.omamori >= 1 ? '' : 'empty'}`}>
                  <img src={`${BASE}assets/card-omamori.png`} alt="omamori" />
                </div>
              </div>
            </div>

            <button
              className={`question-trigger-btn ${i === game.activeTeamIndex ? '' : 'inactive'}`}
              onClick={() => handleOpenQuestion(i)}
            >
              Question
            </button>
          </div>
        ))}
      </div>

      {showHistory && (
        <div className="history-overlay" onClick={() => setShowHistory(false)}>
          <div className="history-modal" onClick={e => e.stopPropagation()}>
            <div className="history-title">Turn History</div>
            <div className="history-content">
              {rounds.length === 0 ? (
                <div>No turns completed yet.</div>
              ) : (
                rounds.map((r, i) => (
                  <div key={i}>
                    <strong>Round {i + 1}:</strong>{' '}
                    {r.map((e, j) => (
                      <span key={j}>
                        {j > 0 ? ', ' : ''}
                        {e.name} – <strong>{e.result}</strong>
                      </span>
                    ))}
                  </div>
                ))
              )}
            </div>
            <button className="history-close-btn" onClick={() => setShowHistory(false)}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default ScoreboardScreen