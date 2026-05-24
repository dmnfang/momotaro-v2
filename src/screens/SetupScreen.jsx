import { useState, useEffect } from 'react'
import { fetchUnits, fetchQuestions } from '../lib/api'
import './SetupScreen.css'

const TEAM_COUNTS = [2, 3, 4]

function SetupScreen({ game, updateGame, goTo }) {
  const [units, setUnits] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
  fetchUnits(game.grade).then(async data => {
    const unitsWithCounts = await Promise.all(
      data.map(async unit => {
        const questions = await fetchQuestions(unit.id)
        return { ...unit, questionCount: questions.length }
      })
    )
    setUnits(unitsWithCounts)
    setLoading(false)
  })
}, [game.grade])

  const toggleUnit = (unitId) => {
    const selected = game.selectedUnits.includes(unitId)
      ? game.selectedUnits.filter(u => u !== unitId)
      : [...game.selectedUnits, unitId]
    updateGame({ selectedUnits: selected })
  }

  const handleLaunch = async () => {
    const allQuestions = []
    for (const unitId of game.selectedUnits) {
      const questions = await fetchQuestions(unitId)
      allQuestions.push(...questions)
    }
    const shuffled = [...allQuestions].sort(() => Math.random() - 0.5)
    const teams = Array.from({ length: game.teamCount }, (_, i) => ({
      name: `Team ${i + 1}`,
      score: 0,
      omamori: 0,
    }))
    updateGame({
      teams,
      activeTeamIndex: 0,
      sharedQueue: shuffled,
      teamQueues: Array.from({ length: game.teamCount }, () => []),
      turnHistory: [],
    })
    goTo('scoreboard')
  }

  const gradeLabel = game.grade?.replace('grade', 'Grade ')

  return (
    <div className="setup-screen">
      <div className="setup-topbar">
        <button className="setup-nav-btn" onClick={() => goTo('home')}>
          <i className="ti ti-chevron-left" />
        </button>
        <span className="setup-grade-label">{gradeLabel}</span>
        <button
          className="setup-nav-btn"
          onClick={() => document.documentElement.requestFullscreen?.()}
        >
          <i className="ti ti-arrows-maximize" />
        </button>
      </div>

      <div className="setup-body">
        <div className="teams-row">
          <span className="teams-label">Teams</span>
          <div className="teams-toggle">
            {TEAM_COUNTS.map(count => (
              <button
                key={count}
                className={`team-count-btn ${game.teamCount === count ? 'active' : ''}`}
                onClick={() => updateGame({ teamCount: count })}
              >
                {count}
              </button>
            ))}
          </div>
        </div>

        <div className="units-panel">
          <div className="units-panel-header">
            <span className="units-panel-title">Units</span>
            <span className="units-selected-count">
              {game.selectedUnits.length === 0
                ? '0 selected'
                : `${game.selectedUnits.length} unit${game.selectedUnits.length > 1 ? 's' : ''} selected`}
            </span>
          </div>

          {loading ? (
            <div className="setup-loading">Loading units...</div>
          ) : (
            <div className="unit-grid">
              {units.map(unit => {
                const isSelected = game.selectedUnits.includes(unit.id)
                return (
                  <div
                    key={unit.id}
                    className={`unit-card ${isSelected ? 'selected' : ''}`}
                    onClick={() => toggleUnit(unit.id)}
                  >
                    <div className="unit-card-header">
  <span className="unit-card-title">{unit.name}</span>
  <div className="unit-dot">
    {isSelected && <i className="ti ti-check" style={{ fontSize: 12 }} />}
  </div>
</div>
<div className="unit-chip">{unit.questionCount} questions</div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <button
          className="setup-launch-btn"
          disabled={game.selectedUnits.length === 0}
          onClick={handleLaunch}
        >
          {game.selectedUnits.length === 0 ? 'Select a unit to launch' : 'Launch'}
        </button>
      </div>
    </div>
  )
}

export default SetupScreen