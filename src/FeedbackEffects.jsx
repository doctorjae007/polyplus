import { useEffect } from 'react'

const COLORS = ['#ffd05a', '#ef6b56', '#4fc3a1', '#4d8ee8', '#9a68db', '#ff9f43']

export function playFeedbackSound(results) {
  if (typeof window === 'undefined') return
  const AudioContext = window.AudioContext || window.webkitAudioContext
  if (!AudioContext) return
  const audio = new AudioContext()
  const start = audio.currentTime
  const tone = (frequency, at, duration, type = 'sine', volume = 0.08) => {
    const oscillator = audio.createOscillator()
    const gain = audio.createGain()
    oscillator.type = type
    oscillator.frequency.setValueAtTime(frequency, start + at)
    gain.gain.setValueAtTime(0.0001, start + at)
    gain.gain.exponentialRampToValueAtTime(volume, start + at + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, start + at + duration)
    oscillator.connect(gain).connect(audio.destination)
    oscillator.start(start + at)
    oscillator.stop(start + at + duration + 0.03)
  }
  const hasCorrect = results.some(Boolean)
  if (hasCorrect) {
    tone(523.25, 0, 0.18)
    tone(659.25, 0.13, 0.2)
    tone(783.99, 0.27, 0.32, 'sine', 0.1)
  }
  if (results.some((correct) => !correct)) {
    const delay = hasCorrect ? 0.72 : 0
    tone(196, delay, 0.2, 'triangle', 0.06)
    tone(146.83, delay + 0.16, 0.3, 'triangle', 0.055)
  }
  window.setTimeout(() => audio.close().catch(() => {}), 1600)
}

export function FeedbackEffects({ feedback, teams, teamNames, onDone }) {
  useEffect(() => {
    if (!feedback) return undefined
    const timer = window.setTimeout(onDone, 1900)
    return () => window.clearTimeout(timer)
  }, [feedback?.id])

  if (!feedback) return null
  const correctTeams = feedback.results.map((correct, index) => correct ? index : null).filter(Number.isInteger)
  const wrongTeams = feedback.results.map((correct, index) => !correct ? index : null).filter(Number.isInteger)

  return <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden" aria-live="polite">
    {correctTeams.flatMap((teamIndex) => Array.from({ length: 18 }, (_, pieceIndex) => <i key={`${teamIndex}-${pieceIndex}`} className="confetti-piece" style={{
      '--burst-x': `${((pieceIndex * 37 + teamIndex * 19) % 100) - 50}vw`,
      '--drift-x': `${((pieceIndex * 23 + teamIndex * 11) % 80) - 40}px`,
      '--delay': `${(pieceIndex % 6) * 35}ms`,
      '--spin': `${180 + (pieceIndex % 5) * 90}deg`,
      '--spin-end': `${360 + (pieceIndex % 5) * 180}deg`,
      left: `${28 + teamIndex * 17}%`,
      backgroundColor: COLORS[(pieceIndex + teamIndex) % COLORS.length],
    }}/>))}
    {wrongTeams.length > 0 && <div className="wrong-flash"/>}
    <div className="absolute inset-x-0 top-3 flex flex-wrap justify-center gap-2 px-4">
      {correctTeams.map((index) => <div key={`correct-${index}`} className="feedback-badge feedback-correct" style={{ borderColor: teams[index].color }}>🎉 {teamNames[index]} ถูกต้อง!</div>)}
      {wrongTeams.map((index) => <div key={`wrong-${index}`} className="feedback-badge feedback-wrong">✕ {teamNames[index]} ลองอีกครั้ง</div>)}
    </div>
  </div>
}
