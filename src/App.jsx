import { useState } from 'react'
import HomeScreen from './screens/HomeScreen'
import SetupScreen from './screens/SetupScreen'
import ScoreboardScreen from './screens/ScoreboardScreen'
import QuestionScreen from './screens/QuestionScreen'
import CardGameScreen from './screens/CardGameScreen'
import RareScreen from './screens/RareScreen'
import './App.css'

function App() {
  const [screen, setScreen] = useState('home')
  const [game, setGame] = useState({
    grade: null,
    selectedUnits: [],
    teamCount: 2,
    teams: [],
    activeTeamIndex: 0,
    currentQuestion: null,
    sharedQueue: [],
    teamQueues: [],
    turnHistory: [],
    pendingSwap: null,
    pendingScoreChange: null,
  })

  const goTo = (screenId) => setScreen(screenId)
  const updateGame = (updates) => setGame(prev => ({ ...prev, ...updates }))

  const screenProps = { game, updateGame, goTo }

  return (
    <div className="app">
      {screen === 'home' && <HomeScreen {...screenProps} />}
      {screen === 'setup' && <SetupScreen {...screenProps} />}
      {screen === 'scoreboard' && <ScoreboardScreen {...screenProps} />}
      {screen === 'question' && <QuestionScreen {...screenProps} />}
      {screen === 'cardgame' && <CardGameScreen {...screenProps} />}
      {screen === 'rare' && <RareScreen {...screenProps} />}
    </div>
  )
}

export default App