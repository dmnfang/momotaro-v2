import SoundToggle from '../components/SoundToggle'
import './HomeScreen.css'

const BASE = import.meta.env.BASE_URL

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
      <div className="home-logo brand">
        {/* add <img className="brand-logo" src={...} alt="" /> here once the new Momotaro art is in */}
        <span className="brand-name">momotaro</span>
      </div>
      <div className="home-actions">
        <SoundToggle />
      </div>
      <h1 className="home-title">
        <img
          className="home-title-img"
          src={`${BASE}assets/title-image.png`}
          alt="Momotaro and the Oni"
        />
      </h1>
      <div className="home-grade-grid">
        {GRADES.map(grade => (
          <button
            key={grade.id}
            className={`mode-btn ${grade.className}`}
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