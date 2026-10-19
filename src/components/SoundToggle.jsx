import { SpeakerHigh, SpeakerSlash } from '@phosphor-icons/react'
import { useSoundSettings } from '../lib/sound'

// One button for both sound effects and music: if anything is on, mute all; otherwise turn both on
function SoundToggle() {
  const { sfxOn, musicOn, toggleSfx, toggleMusic } = useSoundSettings()
  const on = sfxOn || musicOn

  const handleClick = () => {
    const target = !on
    if (sfxOn !== target) toggleSfx()
    if (musicOn !== target) toggleMusic()
  }

  return (
    <button
      className="nav-btn"
      data-sound="none"
      onClick={handleClick}
      aria-label={on ? 'Mute sound' : 'Unmute sound'}
    >
      {on ? <SpeakerHigh size={24} weight="fill" /> : <SpeakerSlash size={24} weight="fill" />}
    </button>
  )
}

export default SoundToggle