import './HomeScreen.css'

const GRADES = [
  { id: 'grade3', label: 'Grade 3', className: 'grade-3' },
  { id: 'grade4', label: 'Grade 4', className: 'grade-4' },
  { id: 'grade5', label: 'Grade 5', className: 'grade-5' },
  { id: 'grade6', label: 'Grade 6', className: 'grade-6' },
]

function HomeScreen({ game, updateGame, goTo }) {
  const handleGradeSelect = (grade) => {
    updateGame({ grade: grade.id, selectedUnits: [] })
    goTo('setup')
  }

  return (
    <div className="home-screen">
      <div className="home-logo">
        <span className="home-logo-text">⚪ momotaro</span>
      </div>
      <div className="home-title">
        <h1 className="home-title-line1">MOMOTARO</h1>
        <h1 className="home-title-line2">AND THE <span className="home-title-oni">ONI</span></h1>
      </div>
      <div className="home-grade-grid">
        {GRADES.map(grade => (
          <button
            key={grade.id}
            className={`home-grade-btn ${grade.className}`}
            onClick={() => handleGradeSelect(grade)}
          >
            {grade.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export default HomeScreen