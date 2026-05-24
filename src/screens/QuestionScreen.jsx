import { useState, useEffect } from 'react'
import './QuestionScreen.css'

function formatText(text) {
  if (!text) return null
  return text.split('\n').map((line, i, arr) => (
    <span key={i}>{line}{i < arr.length - 1 && <br />}</span>
  ))
}

function QuestionScreen({ game, updateGame, goTo }) {
  const [scaffoldRevealed, setScaffoldRevealed] = useState(false)
  const q = game.currentQuestion

  useEffect(() => {
    setScaffoldRevealed(false)
  }, [q?.id])

  if (!q) {
    goTo('scoreboard')
    return null
  }

  const team = game.teams[game.activeTeamIndex]
  const mode = q.pair === 'SS' ? 'Ask 1 friend' : 'Please answer'

  const handleNewQuestion = () => {
    const queue = [...game.sharedQueue]
    let newQ = null
    if (queue.length > 0) {
      newQ = queue.shift()
      updateGame({ sharedQueue: queue, currentQuestion: newQ })
    } else {
      const teamQueues = game.teamQueues.map(tq => [...tq])
      const i = game.activeTeamIndex
      if (!teamQueues[i] || teamQueues[i].length === 0) return
      newQ = teamQueues[i].shift()
      updateGame({ teamQueues, currentQuestion: newQ })
    }
    setScaffoldRevealed(false)
  }

  const handlePlayCardGame = () => {
    if (Math.random() < 0.30) {
      goTo('rare')
    } else {
      goTo('cardgame')
    }
  }

  // Parse helper images
  const helperImages = (() => {
    if (!q.helper_images) return []
    try {
      return JSON.parse(q.helper_images).filter(img => img !== null)
    } catch { return [] }
  })()

  const hasAnswer = !!q.answer
  const isSkit = q.type === 'S'

  // Grid layout for helper images
  const getGridCols = (count) => {
    if (count <= 3) return 1
    return 2
  }

  return (
    <div className="question-screen">
      <div className="question-topbar">
        <span className="question-team-label">
          {team.name} – {mode}
        </span>
      </div>

      <div className="question-body">
        {/* Left column */}
        <div className="question-left">
          {!isSkit && (
            <div className="question-card">
              <div className="question-qa">
                <div className="question-q">
                  <span className="qa-letter q-letter">Q</span>
                  <span className="qa-text">{formatText(q.question)}</span>
                </div>
                <div className="question-a">
                  <span className="qa-letter a-letter">A</span>
                  <span
                    className={`qa-text qa-scaffold ${hasAnswer && !scaffoldRevealed ? 'tappable' : ''}`}
                    style={scaffoldRevealed ? { color: 'var(--confirm)', cursor: 'default' } : {}}
                    onClick={() => {
                      if (hasAnswer && !scaffoldRevealed) setScaffoldRevealed(true)
                    }}
                  >
                    {scaffoldRevealed ? formatText(q.answer) : formatText(q.scaffold)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {isSkit && (
            <div className="question-skit-wrap">
              <div className="question-skit">
                <div className="skit-line">
                  <span className="skit-speaker skit-speaker-a">A</span>
                  <span className="skit-text">{formatText(q.question)}</span>
                </div>
                <div className="skit-line skit-has-blanks">
                  <span className="skit-speaker skit-speaker-b">B</span>
                  <span className="skit-text">{formatText(q.scaffold)}</span>
                </div>
                {q.question2 && (
                  <div className="skit-line">
                    <span className="skit-speaker skit-speaker-a">A</span>
                    <span className="skit-text">{formatText(q.question2)}</span>
                  </div>
                )}
                {q.scaffold2 && (
                  <div className="skit-line skit-has-blanks">
                    <span className="skit-speaker skit-speaker-b">B</span>
                    <span className="skit-text">{formatText(q.scaffold2)}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="question-actions">
            <button className="question-btn btn-secondary" onClick={handleNewQuestion}>
              New Question
            </button>
            <button className="question-btn btn-primary" onClick={handlePlayCardGame}>
              Play Card Game
            </button>
          </div>
        </div>

        {/* Right column */}
<div className="question-right">
  <div className={`question-image-wrap ${helperImages.length > 1 ? 'has-grid' : ''}`}>
    {helperImages.length === 1 ? (
      <img src={helperImages[0].image_url} alt={helperImages[0].label || ''} />
    ) : helperImages.length > 1 ? (
      <div
        className="question-bubbles"
        style={{
          gridTemplateColumns: `repeat(${getGridCols(helperImages.length)}, 1fr)`
        }}
      >
        {helperImages.map((img, i) => (
          <div key={i} className="bubble-item">
            <img src={img.image_url} alt={img.label || ''} />
          </div>
        ))}
      </div>
    ) : null}
  </div>
</div>
      </div>
    </div>
  )
}

export default QuestionScreen