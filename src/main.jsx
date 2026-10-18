import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './clr.css'
import './momotaro.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)