import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, BookOpen, Check, ChevronRight, Cloud, CloudOff, Copy, Eye, GraduationCap, LoaderCircle, LogOut, Pause, Play, Plus, RotateCcw, Settings, Smartphone, Sparkles, Trash2, Trophy, UserPlus, Users, Wifi } from 'lucide-react'
import { MIXED_FACTOR_QUESTIONS, POSITIVE_FACTOR_QUESTIONS, FactorPlayArea, isFactorCorrect } from './FactorDetective'
import { GUIDED_QUESTION_COUNT, MIXED_GUIDED_QUESTIONS, POSITIVE_GUIDED_QUESTIONS, GuidedPlayArea, isGuidedCorrect } from './GuidedFactor'
import { DISTRIBUTIVE_QUESTIONS, DistributivePlayArea, isDistributiveCorrect, isDistributiveReady } from './DistributiveIntro'
import { FeedbackEffects, playFeedbackSound } from './FeedbackEffects'

const TEAMS = [
  { name: 'ทีมฟ้า', animal: '🐬', color: '#2878c8', pale: '#ddecff' },
  { name: 'ทีมส้ม', animal: '🦊', color: '#e76f2e', pale: '#ffe5d6' },
  { name: 'ทีมเขียว', animal: '🐢', color: '#249263', pale: '#d9f3e5' },
  { name: 'ทีมม่วง', animal: '🦄', color: '#8459c4', pale: '#eadffc' },
  { name: 'ทีมชมพู', animal: '🦩', color: '#d94f87', pale: '#ffe1ed' },
  { name: 'ทีมฟ้าคราม', animal: '🐳', color: '#148a9c', pale: '#daf5f7' },
]

const QUESTIONS = [
  { m: 2, n: 5 }, { m: 3, n: 4 }, { m: 1, n: 8 }, { m: 3, n: 6 },
  { m: 2, n: 7 }, { m: 4, n: 5 }, { m: 3, n: 8 }, { m: 5, n: 6 },
  { m: 4, n: 7 }, { m: 5, n: 8 },
  { m: 2, n: 9 }, { m: 7, n: 9 }, { m: 8, n: 9 }, { m: 3, n: 10 },
  { m: 4, n: 10 }, { m: 5, n: 10 }, { m: 6, n: 10 }, { m: 7, n: 10 },
  { m: 8, n: 10 }, { m: 9, n: 10 },
].map((q) => ({ ...q, product: q.m * q.n, sum: q.m + q.n }))
const INTEGER_QUESTIONS = [
  { m: -2, n: 5 }, { m: -3, n: 4 }, { m: -1, n: 6 }, { m: -4, n: 2 },
  { m: -3, n: -2 }, { m: -5, n: 3 }, { m: -4, n: -1 }, { m: -6, n: 2 },
  { m: -5, n: -2 }, { m: -6, n: -3 },
  { m: -2, n: -5 }, { m: -1, n: -6 }, { m: -2, n: 6 }, { m: -4, n: 5 },
  { m: -6, n: 4 }, { m: -5, n: 4 }, { m: -3, n: 5 }, { m: -6, n: 5 },
  { m: -2, n: -6 }, { m: -4, n: -5 },
].map((q) => ({ ...q, product: q.m * q.n, sum: q.m + q.n }))
const QUESTION_COUNT_OPTIONS = [5, 10, 15, 20]

const blankAnswers = (count = 4) => Array.from({ length: count }, () => [])
const blankFactorAnswers = (count = 4) => Array.from({ length: count }, () => [null, null, null, null])
const blankGuidedAnswers = (count = 4) => Array.from({ length: count }, () => [null, null])
const blankMembers = (count = 4) => Array.from({ length: count }, () => [])
const fitArray = (value, count, makeItem) => Array.from({ length: count }, (_, index) => value?.[index] ?? makeItem(index))
const STORAGE_KEY = 'factor-rally-state-v4'
const CLASSROOM_SESSION_KEY = 'factor-rally-classroom-session-v1'
const DEVICE_KEY = 'factor-rally-device-v1'
const MEMBER_EMOJIS = ['😀', '😎', '🐯', '🐰', '🐼', '🦁', '🐸', '🐵', '🦋', '⭐', '🚀', '⚽']
const isCorrect = (answer, q) => answer.length === 2 && answer[0] * answer[1] === q.product && answer[0] + answer[1] === q.sum
const ACTIVITY_OPTIONS = [['intro', '1 แจกแจง'], ['pairs', '1.1 คู่คูณ'], ['guided', '1.2 คู่คิด'], ['factor', '2 นักสืบ']]
const activityTitleOf = (activity) => activity === 'intro' ? 'แจกแจงให้แจ่ม' : activity === 'guided' ? 'คู่คิดพิชิตวงเล็บ' : activity === 'factor' ? 'นักสืบตัวประกอบ' : 'คู่คูณชวนคิด'
const individualQuestionFor = (activity, index) => activity === 'intro' ? DISTRIBUTIVE_QUESTIONS[index % DISTRIBUTIVE_QUESTIONS.length]
  : activity === 'guided' ? POSITIVE_GUIDED_QUESTIONS[index % POSITIVE_GUIDED_QUESTIONS.length]
    : activity === 'factor' ? MIXED_FACTOR_QUESTIONS[index % MIXED_FACTOR_QUESTIONS.length]
      : QUESTIONS[index % QUESTIONS.length]
const individualBlankAnswer = (activity) => activity === 'guided' ? [null, null] : activity === 'factor' ? [null, null, null, null] : []
const individualAnswerReady = (activity, answer, question) => activity === 'intro' ? isDistributiveReady(answer, question)
  : activity === 'guided' ? answer.filter(Number.isFinite).length === 2
    : activity === 'factor' ? answer.filter(Number.isFinite).length === 4
      : answer.length === 2
const individualAnswerCorrect = (activity, answer, question) => activity === 'intro' ? isDistributiveCorrect(answer, question)
  : activity === 'guided' ? isGuidedCorrect(answer, question)
    : activity === 'factor' ? isFactorCorrect(answer, question)
      : isCorrect(answer, question)
const formatTime = (milliseconds) => `${(Math.max(0, milliseconds) / 1000).toFixed(2)} วิ.`

export default function App() {
  const [hasEntered, setHasEntered] = useState(false)
  const [session, setSession] = useState(() => {
    try { return JSON.parse(localStorage.getItem(CLASSROOM_SESSION_KEY)) } catch { return null }
  })
  const openSession = (nextSession) => {
    localStorage.setItem(CLASSROOM_SESSION_KEY, JSON.stringify(nextSession))
    setSession(nextSession)
  }
  const closeSession = () => {
    localStorage.removeItem(CLASSROOM_SESSION_KEY)
    setSession(null)
    setHasEntered(true)
  }
  if (session?.role === 'teacher' && session.roomMode === 'individual') return <IndividualTeacherRoom classroom={session} onLeaveRoom={closeSession}/>
  if (session?.role === 'teacher') return <TeacherGame classroom={session} onLeaveRoom={closeSession}/>
  if (session?.role === 'student' && session.roomMode === 'individual') return <IndividualStudentRoom session={session} onLeaveRoom={closeSession}/>
  if (session?.role === 'student') return <StudentRoom session={session} onLeaveRoom={closeSession}/>
  if (session?.role === 'solo') return <SoloPractice session={session} onLeaveRoom={closeSession}/>
  if (!hasEntered) return <WelcomeScreen onEnter={() => setHasEntered(true)}/>
  return <ClassroomHome onOpenSession={openSession}/>
}

function WelcomeScreen({ onEnter }) {
  return <main className="welcome-page">
    <div className="welcome-symbol welcome-symbol-one" aria-hidden="true">x²</div>
    <div className="welcome-symbol welcome-symbol-two" aria-hidden="true">(x + 2)</div>
    <div className="welcome-symbol welcome-symbol-three" aria-hidden="true">a² − b²</div>

    <section className="welcome-card" aria-labelledby="welcome-title">
      <div className="welcome-book" aria-hidden="true"><BookOpen size={42}/></div>
      <p className="welcome-eyebrow"><Sparkles size={17}/> FACTOR RALLY</p>
      <p className="welcome-kicker">ยินดีต้อนรับเข้าสู่</p>
      <h1 id="welcome-title">ห้องเรียนการแยกตัวประกอบพหุนาม</h1>
      <div className="welcome-formula" aria-hidden="true">
        <span>x² + 5x + 6</span>
        <strong>=</strong>
        <span>(x + 2)(x + 3)</span>
      </div>
      <p className="welcome-copy">เรียนรู้ผ่านกิจกรรมสนุก ๆ พร้อมช่วยกันคิดและพิชิตโจทย์ไปกับเพื่อนในห้องเรียน</p>
      <button type="button" onClick={onEnter} className="welcome-enter">
        เข้าสู่เว็บไซต์ <ArrowRight size={22}/>
      </button>
    </section>

    <p className="welcome-footer">คิด • ลอง • เรียนรู้ไปด้วยกัน</p>
  </main>
}

function TeacherGame({ classroom, onLeaveRoom }) {
  const teamCount = Math.min(6, Math.max(2, classroom?.teamCount ?? 4))
  const activeTeams = TEAMS.slice(0, teamCount)
  const [roomStatus, setRoomStatus] = useState('lobby')
  const [roomMeta, setRoomMeta] = useState(null)
  const [activity, setActivity] = useState('intro')
  const [introQuestionIndex, setIntroQuestionIndex] = useState(0)
  const [introAnswers, setIntroAnswers] = useState(() => blankAnswers(teamCount))
  const [introScores, setIntroScores] = useState(() => activeTeams.map(() => 0))
  const [introGameMode, setIntroGameMode] = useState('same')
  const [introTotalQuestions, setIntroTotalQuestions] = useState(10)
  const [introRevealed, setIntroRevealed] = useState(false)
  const [introFinished, setIntroFinished] = useState(false)
  const [questionIndex, setQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState(() => blankAnswers(teamCount))
  const [scores, setScores] = useState(() => activeTeams.map(() => 0))
  const [factorQuestionIndex, setFactorQuestionIndex] = useState(0)
  const [factorAnswers, setFactorAnswers] = useState(() => blankFactorAnswers(teamCount))
  const [factorScores, setFactorScores] = useState(() => activeTeams.map(() => 0))
  const [factorGameMode, setFactorGameMode] = useState('same')
  const [factorNumberMode, setFactorNumberMode] = useState('mixed')
  const [factorTotalQuestions, setFactorTotalQuestions] = useState(10)
  const [factorRevealed, setFactorRevealed] = useState(false)
  const [factorFinished, setFactorFinished] = useState(false)
  const [guidedQuestionIndex, setGuidedQuestionIndex] = useState(0)
  const [guidedAnswers, setGuidedAnswers] = useState(() => blankGuidedAnswers(teamCount))
  const [guidedScores, setGuidedScores] = useState(() => activeTeams.map(() => 0))
  const [guidedGameMode, setGuidedGameMode] = useState('same')
  const [guidedNumberMode, setGuidedNumberMode] = useState('positive')
  const [guidedRevealed, setGuidedRevealed] = useState(false)
  const [guidedFinished, setGuidedFinished] = useState(false)
  const [feedback, setFeedback] = useState(null)
  const [members, setMembers] = useState(() => blankMembers(teamCount))
  const [teamNames, setTeamNames] = useState(() => activeTeams.map((team) => team.name))
  const [gameMode, setGameMode] = useState('same')
  const [numberMode, setNumberMode] = useState('positive')
  const [totalQuestions, setTotalQuestions] = useState(10)
  const [revealed, setRevealed] = useState(false)
  const [finished, setFinished] = useState(false)
  const [showReset, setShowReset] = useState(false)
  const [memberTeam, setMemberTeam] = useState(null)
  const [showSettings, setShowSettings] = useState(false)
  const [hydrated, setHydrated] = useState(false)
  const [saveStatus, setSaveStatus] = useState('loading')
  const localRevision = useRef(0)
  const savePending = useRef(false)
  const questionBank = numberMode === 'integers' ? INTEGER_QUESTIONS : QUESTIONS
  const teamQuestions = activeTeams.map((_, index) => gameMode === 'same' ? questionBank[questionIndex] : questionBank[(questionIndex + index * 4) % questionBank.length])
  const factorQuestionBank = factorNumberMode === 'mixed' ? MIXED_FACTOR_QUESTIONS : POSITIVE_FACTOR_QUESTIONS
  const factorTeamQuestions = activeTeams.map((_, index) => factorGameMode === 'same' ? factorQuestionBank[factorQuestionIndex] : factorQuestionBank[(factorQuestionIndex + index * 3) % factorQuestionBank.length])
  const guidedQuestionBank = guidedNumberMode === 'mixed' ? MIXED_GUIDED_QUESTIONS : POSITIVE_GUIDED_QUESTIONS
  const guidedTeamQuestions = activeTeams.map((_, index) => guidedGameMode === 'same' ? guidedQuestionBank[guidedQuestionIndex] : guidedQuestionBank[(guidedQuestionIndex + index * 3) % guidedQuestionBank.length])
  const introTeamQuestions = activeTeams.map((_, index) => introGameMode === 'same' ? DISTRIBUTIVE_QUESTIONS[introQuestionIndex] : DISTRIBUTIVE_QUESTIONS[(introQuestionIndex + index * 3) % DISTRIBUTIVE_QUESTIONS.length])
  const question = teamQuestions[0]
  const choices = useMemo(() => numberMode === 'integers' ? Array.from({ length: 13 }, (_, i) => i - 6) : Array.from({ length: 10 }, (_, i) => i + 1), [numberMode])
  const allReady = answers.every((answer) => answer.length === 2)

  useEffect(() => {
    let cancelled = false
    const applyState = (state) => {
      if (!state || cancelled) return
      setRoomStatus(state.roomStatus === 'playing' ? 'playing' : 'lobby')
      const savedTotal = QUESTION_COUNT_OPTIONS.includes(state.totalQuestions) ? state.totalQuestions : 10
      const invalidIndex = (state.questionIndex ?? 0) >= savedTotal
      setQuestionIndex(invalidIndex ? 0 : (state.questionIndex ?? 0))
      setAnswers(invalidIndex ? blankAnswers(teamCount) : fitArray(state.answers, teamCount, () => []))
      setScores(fitArray(state.scores, teamCount, () => 0))
      setActivity(['intro', 'pairs', 'guided', 'factor'].includes(state.activity) ? state.activity : 'intro')
      const savedIntroTotal = QUESTION_COUNT_OPTIONS.includes(state.introTotalQuestions) ? state.introTotalQuestions : 10
      const invalidIntroIndex = (state.introQuestionIndex ?? 0) >= savedIntroTotal
      setIntroQuestionIndex(invalidIntroIndex ? 0 : (state.introQuestionIndex ?? 0))
      const savedIntroAnswers = fitArray(state.introAnswers, teamCount, () => [])
      setIntroAnswers(invalidIntroIndex ? blankAnswers(teamCount) : savedIntroAnswers)
      setIntroScores(fitArray(state.introScores, teamCount, () => 0))
      setIntroGameMode(state.introGameMode === 'different' ? 'different' : 'same')
      setIntroTotalQuestions(savedIntroTotal)
      setIntroRevealed(invalidIntroIndex ? false : Boolean(state.introRevealed))
      setIntroFinished(invalidIntroIndex ? false : Boolean(state.introFinished))
      const savedFactorTotal = QUESTION_COUNT_OPTIONS.includes(state.factorTotalQuestions) ? state.factorTotalQuestions : 10
      const invalidFactorIndex = (state.factorQuestionIndex ?? 0) >= savedFactorTotal
      setFactorQuestionIndex(invalidFactorIndex ? 0 : (state.factorQuestionIndex ?? 0))
      const savedFactorAnswers = fitArray(state.factorAnswers, teamCount, () => [null, null, null, null])
      setFactorAnswers(invalidFactorIndex ? blankFactorAnswers(teamCount) : savedFactorAnswers)
      setFactorScores(fitArray(state.factorScores, teamCount, () => 0))
      setFactorGameMode(state.factorGameMode === 'different' ? 'different' : 'same')
      setFactorNumberMode(state.factorNumberMode === 'positive' ? 'positive' : 'mixed')
      setFactorTotalQuestions(savedFactorTotal)
      setFactorRevealed(invalidFactorIndex ? false : Boolean(state.factorRevealed))
      setFactorFinished(invalidFactorIndex ? false : Boolean(state.factorFinished))
      setGuidedQuestionIndex((state.guidedQuestionIndex ?? 0) < GUIDED_QUESTION_COUNT ? (state.guidedQuestionIndex ?? 0) : 0)
      const savedGuidedAnswers = fitArray(state.guidedAnswers, teamCount, () => [null, null])
      setGuidedAnswers(savedGuidedAnswers)
      setGuidedScores(fitArray(state.guidedScores, teamCount, () => 0))
      setGuidedGameMode(state.guidedGameMode === 'different' ? 'different' : 'same')
      setGuidedNumberMode(state.guidedNumberMode === 'mixed' ? 'mixed' : 'positive')
      setGuidedRevealed(Boolean(state.guidedRevealed))
      setGuidedFinished(Boolean(state.guidedFinished))
      setMembers(fitArray(state.members, teamCount, () => []))
      setTeamNames(fitArray(state.teamNames, teamCount, (index) => activeTeams[index].name))
      setGameMode(state.gameMode ?? 'same')
      setNumberMode(state.numberMode ?? 'positive')
      setTotalQuestions(savedTotal)
      setRevealed(invalidIndex ? false : Boolean(state.revealed))
      setFinished(invalidIndex ? false : Boolean(state.finished))
    }
    const loadRoom = async () => {
      let cached = null
      if (!classroom) {
        try { cached = JSON.parse(localStorage.getItem(STORAGE_KEY)) } catch { localStorage.removeItem(STORAGE_KEY) }
      }
      try {
        const response = await fetch(classroom ? `/api/rooms/${classroom.code}` : '/api/game-state', { headers: { Accept: 'application/json', ...(classroom ? { Authorization: `Bearer ${classroom.token}` } : {}) } })
        if (response.status === 404 || response.status === 401) { onLeaveRoom(); return }
        if (!response.ok) throw new Error('database unavailable')
        const payload = await response.json()
        applyState(payload.state ?? cached)
        if (payload.room) setRoomMeta(payload.room)
        if (!cancelled) setSaveStatus('saved')
      } catch {
        applyState(cached)
        if (!cancelled) setSaveStatus('offline')
      } finally {
        if (!cancelled) setHydrated(true)
      }
    }
    loadRoom()
    return () => { cancelled = true }
  }, [classroom?.code, classroom?.token])

  useEffect(() => {
    if (!hydrated) return
    const revision = ++localRevision.current
    savePending.current = true
    const state = { teamCount, roomStatus, activity, introQuestionIndex, introAnswers, introScores, introGameMode, introTotalQuestions, introRevealed, introFinished, questionIndex, answers, scores, factorQuestionIndex, factorAnswers, factorScores, factorGameMode, factorNumberMode, factorTotalQuestions, factorRevealed, factorFinished, guidedQuestionIndex, guidedAnswers, guidedScores, guidedGameMode, guidedNumberMode, guidedRevealed, guidedFinished, members, teamNames, gameMode, numberMode, totalQuestions, revealed, finished }
    if (!classroom) localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    setSaveStatus('saving')
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(classroom ? `/api/rooms/${classroom.code}` : '/api/game-state', { method: 'PUT', headers: { 'Content-Type': 'application/json', ...(classroom ? { Authorization: `Bearer ${classroom.token}` } : {}) }, body: JSON.stringify(state) })
        if (!response.ok) throw new Error('save failed')
        setSaveStatus('saved')
      } catch { setSaveStatus('offline') }
      finally { if (localRevision.current === revision) savePending.current = false }
    }, 450)
    return () => clearTimeout(timer)
  }, [hydrated, roomStatus, activity, introQuestionIndex, introAnswers, introScores, introGameMode, introTotalQuestions, introRevealed, introFinished, questionIndex, answers, scores, factorQuestionIndex, factorAnswers, factorScores, factorGameMode, factorNumberMode, factorTotalQuestions, factorRevealed, factorFinished, guidedQuestionIndex, guidedAnswers, guidedScores, guidedGameMode, guidedNumberMode, guidedRevealed, guidedFinished, members, teamNames, gameMode, numberMode, totalQuestions, revealed, finished, classroom?.code, classroom?.token])

  useEffect(() => {
    if (!hydrated || !classroom) return undefined
    const syncAnswers = (setter, incoming) => {
      if (!Array.isArray(incoming)) return
      setter((current) => JSON.stringify(current) === JSON.stringify(incoming) ? current : incoming)
    }
    const poll = async () => {
      if (savePending.current) return
      const revision = localRevision.current
      try {
        const response = await fetch(`/api/rooms/${classroom.code}`, { headers: { Authorization: `Bearer ${classroom.token}` } })
        if (response.status === 404 || response.status === 401) return onLeaveRoom()
        if (!response.ok) return
        const payload = await response.json()
        if (savePending.current || localRevision.current !== revision) return
        setRoomMeta(payload.room)
        syncAnswers(setIntroAnswers, payload.state?.introAnswers)
        syncAnswers(setAnswers, payload.state?.answers)
        syncAnswers(setGuidedAnswers, payload.state?.guidedAnswers)
        syncAnswers(setFactorAnswers, payload.state?.factorAnswers)
      } catch {}
    }
    const timer = window.setInterval(poll, 1000)
    return () => window.clearInterval(timer)
  }, [hydrated, classroom?.code, classroom?.token])

  const selectNumber = (teamIndex, number) => {
    if (revealed) return
    setAnswers((current) => current.map((answer, index) => {
      if (index !== teamIndex) return answer
      if (answer.includes(number)) return answer.filter((value) => value !== number)
      return answer.length < 2 ? [...answer, number] : [answer[1], number]
    }))
  }

  const selectIntroToken = (teamIndex, slot, token) => {
    if (introRevealed) return
    setIntroAnswers((current) => current.map((answer, index) => {
      if (index !== teamIndex) return answer
      const expectedSize = answer.length || (introTeamQuestions[index].common === 1 ? 3 : 4) + (introTeamQuestions[index].innerA === 1 ? 0 : 1)
      const next = answer.length === expectedSize ? [...answer] : Array(expectedSize).fill(null)
      next[slot] = token
      return next
    }))
  }

  const revealIntro = () => {
    if (introRevealed || !introAnswers.every((answer, index) => isDistributiveReady(answer, introTeamQuestions[index]))) return
    const results = activeTeams.map((_, index) => isDistributiveCorrect(introAnswers[index], introTeamQuestions[index]))
    setIntroScores((current) => current.map((score, index) => score + (results[index] ? 1 : 0)))
    setIntroRevealed(true)
    playFeedbackSound(results)
    setFeedback({ id: Date.now(), results })
  }

  const nextIntroQuestion = () => {
    if (introQuestionIndex === introTotalQuestions - 1) return setIntroFinished(true)
    setIntroQuestionIndex((value) => value + 1)
    setIntroAnswers(blankAnswers(teamCount))
    setIntroRevealed(false)
  }

  const resetIntro = () => {
    setIntroQuestionIndex(0); setIntroAnswers(blankAnswers(teamCount)); setIntroScores(activeTeams.map(() => 0))
    setIntroRevealed(false); setIntroFinished(false); setShowReset(false)
  }

  const reveal = () => {
    if (!allReady || revealed) return
    const results = activeTeams.map((_, index) => isCorrect(answers[index], teamQuestions[index]))
    setScores((current) => current.map((score, index) => score + (results[index] ? 1 : 0)))
    setRevealed(true)
    playFeedbackSound(results)
    setFeedback({ id: Date.now(), results })
  }

  const nextQuestion = () => {
    if (questionIndex === totalQuestions - 1) return setFinished(true)
    setQuestionIndex((value) => value + 1)
    setAnswers(blankAnswers(teamCount))
    setRevealed(false)
  }

  const reset = () => {
    setQuestionIndex(0); setAnswers(blankAnswers(teamCount)); setScores(activeTeams.map(() => 0))
    setRevealed(false); setFinished(false); setShowReset(false)
  }

  const selectFactorNumber = (teamIndex, slot, number) => {
    if (factorRevealed) return
    setFactorAnswers((current) => current.map((answer, index) => {
      if (index !== teamIndex) return answer
      return answer.map((value, answerSlot) => answerSlot === slot ? number : value)
    }))
  }

  const revealFactor = () => {
    if (factorRevealed || !factorAnswers.every((answer) => answer.length === 4 && answer.filter(Number.isFinite).length === 4)) return
    const results = activeTeams.map((_, index) => isFactorCorrect(factorAnswers[index], factorTeamQuestions[index]))
    setFactorScores((current) => current.map((score, index) => score + (results[index] ? 1 : 0)))
    setFactorRevealed(true)
    playFeedbackSound(results)
    setFeedback({ id: Date.now(), results })
  }

  const nextFactorQuestion = () => {
    if (factorQuestionIndex === factorTotalQuestions - 1) return setFactorFinished(true)
    setFactorQuestionIndex((value) => value + 1)
    setFactorAnswers(blankFactorAnswers(teamCount))
    setFactorRevealed(false)
  }

  const resetFactor = () => {
    setFactorQuestionIndex(0); setFactorAnswers(blankFactorAnswers(teamCount)); setFactorScores(activeTeams.map(() => 0))
    setFactorRevealed(false); setFactorFinished(false); setShowReset(false)
  }

  const selectGuidedNumber = (teamIndex, slot, number) => {
    if (guidedRevealed) return
    setGuidedAnswers((current) => current.map((answer, index) => index === teamIndex ? answer.map((value, answerSlot) => answerSlot === slot ? number : value) : answer))
  }

  const revealGuided = () => {
    if (guidedRevealed || !guidedAnswers.every((answer) => answer.filter(Number.isFinite).length === 2)) return
    const results = activeTeams.map((_, index) => isGuidedCorrect(guidedAnswers[index], guidedTeamQuestions[index]))
    setGuidedScores((current) => current.map((score, index) => score + (results[index] ? 1 : 0)))
    setGuidedRevealed(true)
    playFeedbackSound(results)
    setFeedback({ id: Date.now(), results })
  }

  const nextGuidedQuestion = () => {
    if (guidedQuestionIndex === GUIDED_QUESTION_COUNT - 1) return setGuidedFinished(true)
    setGuidedQuestionIndex((value) => value + 1)
    setGuidedAnswers(blankGuidedAnswers(teamCount))
    setGuidedRevealed(false)
  }

  const resetGuided = () => {
    setGuidedQuestionIndex(0); setGuidedAnswers(blankGuidedAnswers(teamCount)); setGuidedScores(activeTeams.map(() => 0))
    setGuidedRevealed(false); setGuidedFinished(false); setShowReset(false)
  }

  const applyIntroSettings = (names, mode, _numberMode, nextTotalQuestions) => {
    setTeamNames(names.map((name, index) => name.trim() || activeTeams[index].name))
    if (mode !== introGameMode || nextTotalQuestions !== introTotalQuestions) {
      setIntroGameMode(mode)
      setIntroTotalQuestions(nextTotalQuestions)
      setIntroAnswers(blankAnswers(teamCount))
      setIntroRevealed(false)
      if (introRevealed) {
        if (introQuestionIndex >= nextTotalQuestions - 1) setIntroFinished(true)
        else setIntroQuestionIndex((value) => value + 1)
      }
    }
    setShowSettings(false)
  }

  const applyFactorSettings = (names, mode, nextNumberMode, nextTotalQuestions) => {
    setTeamNames(names.map((name, index) => name.trim() || activeTeams[index].name))
    if (mode !== factorGameMode || nextNumberMode !== factorNumberMode || nextTotalQuestions !== factorTotalQuestions) {
      setFactorGameMode(mode)
      setFactorNumberMode(nextNumberMode)
      setFactorTotalQuestions(nextTotalQuestions)
      setFactorAnswers(blankFactorAnswers(teamCount))
      setFactorRevealed(false)
      if (factorRevealed) {
        if (factorQuestionIndex >= nextTotalQuestions - 1) setFactorFinished(true)
        else setFactorQuestionIndex((value) => value + 1)
      }
    }
    setShowSettings(false)
  }

  const applyGuidedSettings = (names, mode, nextNumberMode) => {
    setTeamNames(names.map((name, index) => name.trim() || activeTeams[index].name))
    if (mode !== guidedGameMode || nextNumberMode !== guidedNumberMode) {
      setGuidedGameMode(mode)
      setGuidedNumberMode(nextNumberMode)
      setGuidedAnswers(blankGuidedAnswers(teamCount))
      setGuidedRevealed(false)
      if (guidedRevealed) {
        if (guidedQuestionIndex >= GUIDED_QUESTION_COUNT - 1) setGuidedFinished(true)
        else setGuidedQuestionIndex((value) => value + 1)
      }
    }
    setShowSettings(false)
  }

  const addMember = (name, emoji) => {
    setMembers((current) => current.map((list, index) => index === memberTeam ? [...list, { id: crypto.randomUUID(), name, emoji }] : list))
    setMemberTeam(null)
  }

  const removeMember = async (teamIndex, memberId) => {
    if (classroom) {
      const response = await fetch(`/api/rooms/${classroom.code}/players/${memberId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${classroom.token}` } })
      if (response.ok) setRoomMeta((current) => ({ ...current, members: current.members.map((list, index) => index === teamIndex ? list.filter((member) => member.id !== memberId) : list) }))
      return
    }
    setMembers((current) => current.map((list, index) => index === teamIndex ? list.filter((member) => member.id !== memberId) : list))
  }

  const applySettings = (names, mode, nextNumberMode, nextTotalQuestions) => {
    setTeamNames(names.map((name, index) => name.trim() || activeTeams[index].name))
    if (mode !== gameMode || nextNumberMode !== numberMode || nextTotalQuestions !== totalQuestions) {
      setGameMode(mode)
      setNumberMode(nextNumberMode)
      setTotalQuestions(nextTotalQuestions)
      setAnswers(blankAnswers(teamCount))
      setRevealed(false)
      if (revealed) {
        if (questionIndex >= nextTotalQuestions - 1) setFinished(true)
        else setQuestionIndex((value) => value + 1)
      }
    }
    setShowSettings(false)
  }

  const chooseActivity = (nextActivity) => {
    setActivity(nextActivity)
    if (classroom) setRoomStatus('lobby')
  }

  const unlockTeam = async (teamIndex) => {
    if (!classroom) return
    const response = await fetch(`/api/rooms/${classroom.code}/teams/${teamIndex}`, { method: 'DELETE', headers: { Authorization: `Bearer ${classroom.token}` } })
    if (response.ok) setRoomMeta((current) => ({ ...current, occupiedTeams: (current?.occupiedTeams ?? []).filter((index) => index !== teamIndex), members: current.members.map((list, index) => index === teamIndex ? [] : list) }))
  }

  const adjustScore = (teamIndex, amount) => {
    const setActiveScores = activity === 'intro' ? setIntroScores : activity === 'factor' ? setFactorScores : activity === 'guided' ? setGuidedScores : setScores
    setActiveScores((current) => current.map((score, index) => index === teamIndex ? Math.max(0, score + amount) : score))
  }

  const resetAllScores = () => {
    const emptyScores = () => activeTeams.map(() => 0)
    setIntroScores(emptyScores())
    setScores(emptyScores())
    setGuidedScores(emptyScores())
    setFactorScores(emptyScores())
    setShowReset(false)
  }

  const effectiveMembers = classroom ? fitArray(roomMeta?.members, teamCount, () => []) : members
  if (!hydrated) return <main className="paper-grid grid min-h-screen place-items-center"><div className="text-center text-[#193b2b]"><LoaderCircle className="mx-auto animate-spin" size={44}/><p className="mt-3 font-black">กำลังโหลดห้องเรียน…</p></div></main>
  if (activity === 'intro' && introFinished) return <Results teams={activeTeams} scores={introScores} members={effectiveMembers} teamNames={teamNames} totalQuestions={introTotalQuestions} onReset={resetIntro} onLeave={onLeaveRoom} activityName="แจกแจงให้แจ่ม" />
  if (activity === 'pairs' && finished) return <Results teams={activeTeams} scores={scores} members={effectiveMembers} teamNames={teamNames} totalQuestions={totalQuestions} onReset={reset} onLeave={onLeaveRoom} />
  if (activity === 'guided' && guidedFinished) return <Results teams={activeTeams} scores={guidedScores} members={effectiveMembers} teamNames={teamNames} totalQuestions={GUIDED_QUESTION_COUNT} onReset={resetGuided} onLeave={onLeaveRoom} activityName="คู่คิดพิชิตวงเล็บ" />
  if (activity === 'factor' && factorFinished) return <Results teams={activeTeams} scores={factorScores} members={effectiveMembers} teamNames={teamNames} totalQuestions={factorTotalQuestions} onReset={resetFactor} onLeave={onLeaveRoom} activityName="นักสืบตัวประกอบ" />

  const activeScores = activity === 'intro' ? introScores : activity === 'factor' ? factorScores : activity === 'guided' ? guidedScores : scores
  const activeAnswers = activity === 'intro' ? introAnswers : activity === 'factor' ? factorAnswers : activity === 'guided' ? guidedAnswers : answers
  const activeQuestions = activity === 'intro' ? introTeamQuestions : activity === 'factor' ? factorTeamQuestions : activity === 'guided' ? guidedTeamQuestions : teamQuestions
  const activeTotal = activity === 'intro' ? introTotalQuestions : activity === 'factor' ? factorTotalQuestions : activity === 'guided' ? GUIDED_QUESTION_COUNT : totalQuestions
  const activeRevealed = activity === 'intro' ? introRevealed : activity === 'factor' ? factorRevealed : activity === 'guided' ? guidedRevealed : revealed
  const activeCorrect = activity === 'intro' ? isDistributiveCorrect : activity === 'factor' ? isFactorCorrect : activity === 'guided' ? isGuidedCorrect : isCorrect
  const activeAnswerSize = activity === 'factor' ? 4 : 2
  const activeReady = activity === 'intro' ? isDistributiveReady : null
  const activityTitle = activity === 'intro' ? 'แจกแจงให้แจ่ม' : activity === 'factor' ? 'นักสืบตัวประกอบ' : activity === 'guided' ? 'คู่คิดพิชิตวงเล็บ' : 'คู่คูณชวนคิด'
  const activityIcon = activity === 'intro' ? '⇄' : activity === 'factor' ? '🔎' : activity === 'guided' ? '🧩' : '×'

  return <main className="paper-grid min-h-screen p-3 lg:px-4 lg:py-1">
    <div className="game-shell mx-auto max-w-[1600px] gap-4">
      <ScoreSidebar teams={activeTeams} scores={activeScores} answers={activeAnswers} members={effectiveMembers} teamNames={teamNames} questions={activeQuestions} totalQuestions={activeTotal} revealed={activeRevealed} isAnswerCorrect={activeCorrect} isAnswerReady={activeReady} answerSize={activeAnswerSize} onAdjustScore={adjustScore} onAdd={classroom ? null : setMemberTeam} onRemove={removeMember} />

      <div className="min-w-0">
        {classroom && <RoomControlBar teams={activeTeams} code={classroom.code} status={roomStatus} members={effectiveMembers} occupiedTeams={roomMeta?.occupiedTeams ?? []} onToggle={() => setRoomStatus((status) => status === 'playing' ? 'lobby' : 'playing')} onUnlock={unlockTeam} onLeave={onLeaveRoom}/>}
        <header className="mb-3 flex min-h-12 flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3"><div className={`grid size-10 place-items-center rounded-xl text-xl font-black text-white ${activity === 'intro' ? 'bg-[#6d4317]' : activity === 'factor' ? 'bg-[#30265f]' : activity === 'guided' ? 'bg-[#174c63]' : 'bg-[#193b2b]'}`}>{activityIcon}</div><div><h1 className="text-xl font-black text-[#193b2b]">{activityTitle}</h1><p className="text-xs font-bold text-[#6d756f]">ทุกกลุ่มเลือกพร้อมกัน · ครูเฉลยครั้งเดียว</p></div></div>
          <div className="flex flex-wrap justify-end gap-2">
            {!classroom && <button onClick={onLeaveRoom} className="flex min-h-10 items-center gap-2 rounded-xl border border-[#d8d2c5] bg-white px-3 text-sm font-bold text-[#8e4b3c]"><ArrowLeft size={16}/> กลับหน้าสร้างห้อง</button>}
            <SaveStatus status={saveStatus}/>
            <div className="flex rounded-xl bg-white p-1 shadow-sm" aria-label="เลือกแบบฝึก">
              {[['intro', '1 แจกแจง'], ['pairs', '1.1 คู่คูณ'], ['guided', '1.2 คู่คิด'], ['factor', '2 นักสืบ']].map(([value, label]) => <button key={value} onClick={() => chooseActivity(value)} className={`min-h-8 rounded-lg px-2.5 text-xs font-black transition ${activity === value ? 'bg-[#ffd05a] text-[#473510]' : 'text-[#647069] hover:bg-[#f4f1e9]'}`}>{label}</button>)}
            </div>
            <button onClick={() => setShowSettings(true)} className="flex min-h-10 items-center gap-2 rounded-xl border border-[#d8d2c5] bg-white px-3 text-sm font-bold text-[#5c635e]"><Settings size={16}/> ตั้งค่าเกม</button>
            <button onClick={() => setShowReset(true)} className="flex min-h-10 items-center gap-2 rounded-xl border border-[#e3b9aa] bg-white px-3 text-sm font-bold text-[#9a4935]"><RotateCcw size={16}/> รีเซตคะแนนทั้งหมด</button>
          </div>
        </header>

        {activity === 'intro'
          ? <DistributivePlayArea teams={activeTeams} teamNames={teamNames} questions={introTeamQuestions} index={introQuestionIndex} totalQuestions={introTotalQuestions} answers={introAnswers} revealed={introRevealed} onSelect={selectIntroToken} onReveal={revealIntro} onNext={nextIntroQuestion}/>
          : activity === 'factor'
          ? <FactorPlayArea teams={activeTeams} teamNames={teamNames} questions={factorTeamQuestions} index={factorQuestionIndex} totalQuestions={factorTotalQuestions} answers={factorAnswers} revealed={factorRevealed} numberMode={factorNumberMode} onSelect={selectFactorNumber} onReveal={revealFactor} onNext={nextFactorQuestion}/>
          : activity === 'guided'
            ? <GuidedPlayArea teams={activeTeams} teamNames={teamNames} questions={guidedTeamQuestions} index={guidedQuestionIndex} answers={guidedAnswers} revealed={guidedRevealed} numberMode={guidedNumberMode} onSelect={selectGuidedNumber} onReveal={revealGuided} onNext={nextGuidedQuestion}/>
          : <>
            <QuestionBanner question={question} index={questionIndex} totalQuestions={totalQuestions} revealed={revealed} mode={gameMode} numberMode={numberMode} />
            <section className="team-board-grid mt-3 grid gap-3" aria-label={`คำตอบของ ${teamCount} กลุ่ม`}>
              {activeTeams.map((team, index) => <TeamCard key={team.name} team={{ ...team, name: teamNames[index] }} question={teamQuestions[index]} showQuestion={gameMode === 'different'} integerMode={numberMode === 'integers'} answer={answers[index]} choices={choices} revealed={revealed} correct={revealed && isCorrect(answers[index], teamQuestions[index])} onSelect={(number) => selectNumber(index, number)} />)}
            </section>
            <div className="mt-3 flex items-center gap-3 rounded-2xl bg-white p-2 shadow-sm">
              <p className="hidden flex-1 pl-2 text-sm font-bold text-[#70776f] sm:block">{revealed ? resultText(answers, teamQuestions, teamNames, activeTeams) : `พร้อมแล้ว ${answers.filter((a) => a.length === 2).length}/${teamCount} กลุ่ม`}</p>
              <button onClick={revealed ? nextQuestion : reveal} disabled={!revealed && !allReady} className={`flex min-h-14 flex-1 items-center justify-center gap-2 rounded-xl px-6 text-lg font-black sm:max-w-md ${revealed ? 'bg-[#193b2b] text-white' : 'bg-[#ef9940] text-[#352111]'} disabled:cursor-not-allowed disabled:opacity-35`}>
                {revealed ? <>ข้อต่อไป <ChevronRight/></> : <><Eye/> ครูเฉลยพร้อมกัน</>}
              </button>
            </div>
          </>}
      </div>
    </div>
    {showReset && <ConfirmReset onCancel={() => setShowReset(false)} onConfirm={resetAllScores} />}
    <FeedbackEffects feedback={feedback} teams={activeTeams} teamNames={teamNames} onDone={() => setFeedback(null)} />
    {memberTeam !== null && <MemberModal team={{ ...activeTeams[memberTeam], name: teamNames[memberTeam] }} onCancel={() => setMemberTeam(null)} onAdd={addMember} />}
    {showSettings && (activity === 'pairs'
      ? <SettingsModal teams={activeTeams} names={teamNames} mode={gameMode} numberMode={numberMode} totalQuestions={totalQuestions} currentQuestion={questionIndex + 1} onCancel={() => setShowSettings(false)} onApply={applySettings} />
      : <FactorSettingsModal
          teams={activeTeams}
          names={teamNames}
          mode={activity === 'intro' ? introGameMode : activity === 'factor' ? factorGameMode : guidedGameMode}
          numberMode={activity === 'factor' ? factorNumberMode : guidedNumberMode}
          currentQuestion={(activity === 'intro' ? introQuestionIndex : activity === 'factor' ? factorQuestionIndex : guidedQuestionIndex) + 1}
          title={activity === 'intro' ? 'ตั้งค่าแจกแจงให้แจ่ม' : activity === 'factor' ? 'ตั้งค่านักสืบตัวประกอบ' : 'ตั้งค่าคู่คิดพิชิตวงเล็บ'}
          icon={activity === 'intro' ? '⇄' : activity === 'factor' ? '🔎' : '🧩'}
          showNumberMode={activity !== 'intro'}
          showQuestionCount={activity === 'intro' || activity === 'factor'}
          totalQuestions={activity === 'intro' ? introTotalQuestions : activity === 'factor' ? factorTotalQuestions : undefined}
          onCancel={() => setShowSettings(false)}
          onApply={activity === 'intro' ? applyIntroSettings : activity === 'factor' ? applyFactorSettings : applyGuidedSettings}
        />)}
  </main>
}

function ClassroomHome({ onOpenSession }) {
  const [code, setCode] = useState('')
  const [room, setRoom] = useState(null)
  const [teamCount, setTeamCount] = useState(4)
  const [roomMode, setRoomMode] = useState('teams')
  const [playerName, setPlayerName] = useState('')
  const [playerEmoji, setPlayerEmoji] = useState(MEMBER_EMOJIS[0])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const createRoom = async () => {
    setLoading(true); setError('')
    try {
      const response = await fetch('/api/rooms', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ teamCount, roomMode }) })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error)
      onOpenSession({ role: 'teacher', code: payload.code, token: payload.teacherToken, teamCount: payload.teamCount, roomMode: payload.roomMode })
    } catch { setError('ยังสร้างห้องไม่ได้ กรุณาลองอีกครั้ง') }
    finally { setLoading(false) }
  }

  const findRoom = async (event) => {
    event.preventDefault()
    const cleanCode = code.replace(/\D/g, '').slice(0, 6)
    if (cleanCode.length !== 6) return setError('กรุณาใส่รหัสห้อง 6 หลัก')
    setLoading(true); setError('')
    try {
      const response = await fetch(`/api/rooms/${cleanCode}`)
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error)
      setRoom(payload.room)
    } catch { setError('ไม่พบห้องนี้ กรุณาตรวจรหัสอีกครั้ง') }
    finally { setLoading(false) }
  }

  const joinTeam = async (teamIndex) => {
    if (!playerName.trim()) return setError('กรุณาตั้งชื่อก่อนเลือกกลุ่ม')
    setLoading(true); setError('')
    let deviceId = localStorage.getItem(DEVICE_KEY)
    if (!deviceId) { deviceId = crypto.randomUUID(); localStorage.setItem(DEVICE_KEY, deviceId) }
    try {
      const response = await fetch(`/api/rooms/${room.code}/join`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ teamIndex, deviceId, name: playerName.trim(), emoji: playerEmoji }) })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error)
      onOpenSession({ role: 'student', code: room.code, teamIndex, token: payload.playerToken, name: payload.name, emoji: payload.emoji, roomMode: room.roomMode })
    } catch { setError('ยังเข้ากลุ่มไม่ได้ กรุณาตรวจข้อมูลแล้วลองอีกครั้ง') }
    finally { setLoading(false) }
  }

  return <main className="classroom-home">
    <section className="classroom-shell">
      <header className="classroom-header">
        <div className="classroom-brand-mark" aria-hidden="true">✦</div>
        <div className="classroom-brand-copy"><p>FACTOR RALLY</p><h1>ห้องเรียนแยกตัวประกอบ</h1></div>
        <span className="classroom-header-badge">Interactive classroom</span>
      </header>
      {!room ? <div className="classroom-content">
        <div className="classroom-intro">
          <span className="classroom-kicker">เริ่มต้นใช้งาน</span>
          <h2>วันนี้คุณเข้าใช้งานในบทบาทไหน?</h2>
          <p>สร้างห้องใหม่สำหรับจัดกิจกรรม หรือใส่รหัสเพื่อเข้าร่วมกับเพื่อนในชั้นเรียน</p>
        </div>
        <div className="classroom-role-grid">
          <div className="classroom-role-card teacher-role">
            <div className="classroom-role-icon"><GraduationCap size={30}/></div>
            <div><span className="classroom-role-label">TEACHER</span><h3>สำหรับครู</h3><p>สร้างห้อง เลือกกิจกรรม และควบคุมการเฉลยจากจอหลัก</p></div>
            <div className="mt-auto"><label className="mb-2 block text-xs font-bold text-[#687970]">รูปแบบห้อง</label><div className="mb-3 grid grid-cols-2 gap-2"><button type="button" onClick={() => setRoomMode('teams')} className={`min-h-11 rounded-xl font-black ${roomMode === 'teams' ? 'bg-[#193b2b] text-white' : 'bg-[#edf3ef] text-[#456052]'}`}>👥 แบ่งกลุ่ม</button><button type="button" onClick={() => setRoomMode('individual')} className={`min-h-11 rounded-xl font-black ${roomMode === 'individual' ? 'bg-[#8a4b16] text-white' : 'bg-[#fff1dc] text-[#8a4b16]'}`}>🏃 รายบุคคล</button></div>{roomMode === 'teams' && <><label className="mb-2 block text-xs font-bold text-[#687970]">จำนวนกลุ่ม</label><div className="mb-3 grid grid-cols-5 gap-1">{[2, 3, 4, 5, 6].map((count) => <button type="button" key={count} onClick={() => setTeamCount(count)} className={`min-h-9 rounded-lg font-black ${teamCount === count ? 'bg-[#193b2b] text-white' : 'bg-[#edf3ef] text-[#456052]'}`}>{count}</button>)}</div></>}<button onClick={createRoom} disabled={loading} className="classroom-primary-button w-full"><Users size={20}/> {loading ? 'กำลังสร้างห้อง…' : roomMode === 'individual' ? 'สร้างห้องแข่งขันรายบุคคล' : `สร้างห้อง ${teamCount} กลุ่ม`} <ArrowRight size={19}/></button></div>
          </div>
          <form onSubmit={findRoom} className="classroom-role-card student-role">
            <div className="classroom-role-icon"><Smartphone size={28}/></div>
            <div><span className="classroom-role-label">STUDENT</span><h3>สำหรับนักเรียน</h3><p>กรอกรหัสห้องเรียน 6 หลักที่ได้รับจากครู</p></div>
            <div className="classroom-student-actions">
              <label className="classroom-code-field"><span>รหัสห้องเรียน</span><input inputMode="numeric" value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="000000" aria-label="รหัสห้อง 6 หลัก"/></label>
              <button disabled={loading} className="classroom-secondary-button">เข้าห้องเรียน <ArrowRight size={19}/></button>
            </div>
          </form>
        </div>
        <div className="classroom-solo-row"><span>หรือ</span><button onClick={() => onOpenSession({ role: 'solo' })}>ฝึกเล่นคนเดียว <ChevronRight size={16}/></button></div>
        {error && <p className="classroom-error">{error}</p>}
      </div> : <div className="p-6 sm:p-10">
        <button onClick={() => { setRoom(null); setError('') }} className="flex items-center gap-1 font-black text-[#66736c]"><ArrowLeft size={18}/> เปลี่ยนรหัสห้อง</button>
        <div className="mt-4 text-center"><p className="text-sm font-black text-[#7a746b]">ห้อง {room.code}</p><h2 className="text-3xl font-black text-[#193b2b]">{room.roomMode === 'individual' ? 'สร้างตัวตนเพื่อเข้าแข่งขัน' : 'สร้างตัวตนและเลือกกลุ่ม'}</h2><p className="mt-1 font-bold text-[#6b746e]">{room.roomMode === 'individual' ? 'ตอบให้ถูกและเร็ว เพื่อติดอันดับ 1–5' : 'หลายคนสามารถอยู่กลุ่มเดียวกันได้'}</p></div>
        <div className="mx-auto mt-5 max-w-xl rounded-2xl bg-[#f5f1e8] p-4"><label className="text-sm font-black text-[#4e5a53]">ชื่อของฉัน</label><input value={playerName} onChange={(event) => setPlayerName(event.target.value)} maxLength={24} placeholder="เช่น น้องมิน" className="mt-2 min-h-12 w-full rounded-xl border-2 border-white bg-white px-4 text-lg font-bold outline-none focus:border-[#40755b]"/><p className="mt-3 text-sm font-black text-[#4e5a53]">เลือกหน้าอิโมจิ</p><div className="mt-2 grid grid-cols-6 gap-2">{MEMBER_EMOJIS.map((emoji) => <button type="button" key={emoji} onClick={() => setPlayerEmoji(emoji)} className={`grid aspect-square place-items-center rounded-xl border-2 text-2xl ${playerEmoji === emoji ? 'border-[#193b2b] bg-white' : 'border-transparent bg-white/60'}`}>{emoji}</button>)}</div></div>
        {room.roomMode === 'individual' ? <button disabled={loading || !playerName.trim()} onClick={() => joinTeam(0)} className="mx-auto mt-5 flex min-h-14 w-full max-w-xl items-center justify-center gap-2 rounded-2xl bg-[#8a4b16] px-5 text-lg font-black text-white disabled:opacity-40"><Trophy size={22}/> เข้าร่วมการแข่งขัน</button> : <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">{TEAMS.slice(0, room.teamCount ?? 4).map((team, index) => {
          const memberCount = room.members?.[index]?.length ?? 0
          return <button key={team.name} disabled={loading || !playerName.trim()} onClick={() => joinTeam(index)} className="rounded-3xl border-2 p-5 text-center disabled:cursor-not-allowed disabled:opacity-45" style={{ borderColor: team.color, backgroundColor: team.pale }}><span className="text-5xl">{team.animal}</span><strong className="mt-2 block text-lg" style={{ color: team.color }}>{room.teamNames[index]}</strong><span className="mt-1 block text-xs font-black text-[#6e756f]">{memberCount ? `${memberCount} คน · เข้าร่วมได้` : 'ยังว่าง · เลือกกลุ่มนี้'}</span></button>
        })}</div>}
        {error && <p className="mt-4 rounded-xl bg-[#fff0eb] px-4 py-3 text-center font-black text-[#a33b2f]">{error}</p>}
      </div>}
    </section>
  </main>
}

function RoomControlBar({ teams, code, status, members, occupiedTeams, onToggle, onUnlock, onLeave }) {
  const [copied, setCopied] = useState(false)
  const copyCode = async () => { try { await navigator.clipboard.writeText(code); setCopied(true); window.setTimeout(() => setCopied(false), 1200) } catch {} }
  return <section className="mb-2 flex flex-wrap items-center gap-2 rounded-2xl bg-[#fff4d9] px-3 py-2 shadow-sm">
    <div className="flex items-center gap-2"><Wifi size={18} className="text-[#8b581c]"/><span className="text-xs font-black text-[#7b674e]">รหัสห้อง</span><strong className="text-2xl font-black tracking-[.16em] text-[#5d390f]">{code}</strong><button onClick={copyCode} className="grid size-9 place-items-center rounded-lg bg-white text-[#7c5425]" aria-label="คัดลอกรหัสห้อง"><Copy size={16}/></button>{copied && <span className="text-xs font-black text-[#27704b]">คัดลอกแล้ว</span>}</div>
    <div className="flex flex-1 flex-wrap justify-center gap-1">{teams.map((team, index) => <button key={team.name} onClick={() => occupiedTeams.includes(index) && onUnlock(index)} className={`rounded-full px-2 py-1 text-xs font-black ${occupiedTeams.includes(index) ? 'bg-white' : 'bg-black/5 opacity-45'}`} style={{ color: team.color }} title={occupiedTeams.includes(index) ? 'แตะเพื่อนำสมาชิกทั้งกลุ่มออก' : 'ยังไม่มีผู้เข้า'}>{team.animal} {members[index]?.length ? `${members[index].length} คน` : 'ว่าง'}</button>)}</div>
    <button onClick={onToggle} className={`flex min-h-10 items-center gap-2 rounded-xl px-4 font-black ${status === 'playing' ? 'bg-[#fff] text-[#9b5220]' : 'bg-[#193b2b] text-white'}`}>{status === 'playing' ? <><Pause size={17}/> พักกิจกรรม</> : <><Play size={17}/> เริ่มกิจกรรม</>}</button>
    <button onClick={onLeave} className="grid size-10 place-items-center rounded-xl bg-white text-[#8e4b3c]" aria-label="ออกจากห้อง"><LogOut size={18}/></button>
  </section>
}

function CompetitionLeaderboard({ players = [], limit = 5, compact = false }) {
  const ranked = players.slice(0, limit)
  return <section className={`rounded-[24px] bg-white shadow-lg ${compact ? 'p-3' : 'p-5'}`}>
    <div className="flex items-center gap-2"><Trophy className="text-[#d88b20]" size={compact ? 22 : 28}/><div><p className="text-xs font-black uppercase tracking-wider text-[#a76c1d]">Top {limit}</p><h2 className={`${compact ? 'text-lg' : 'text-2xl'} font-black text-[#193b2b]`}>อันดับรายบุคคล</h2></div></div>
    <div className="mt-3 space-y-2">{ranked.length ? ranked.map((player, index) => <div key={player.id} className={`flex items-center gap-3 rounded-xl px-3 py-2 ${index === 0 ? 'bg-[#fff3c9]' : 'bg-[#f4f5f2]'}`}><span className="grid size-8 shrink-0 place-items-center rounded-full bg-white font-black text-[#7b5519]">{index + 1}</span><span className="text-2xl">{player.emoji}</span><strong className="min-w-0 flex-1 truncate text-[#263d32]">{player.name}</strong><span className="text-right"><b className="block text-lg text-[#17613e]">{player.correctCount} ถูก</b><small className="font-bold text-[#7a817c]">{formatTime(player.correctTimeMs)}</small></span></div>) : <p className="rounded-xl bg-[#f4f5f2] px-4 py-5 text-center font-bold text-[#778078]">รอนักเรียนเข้าร่วมการแข่งขัน</p>}</div>
  </section>
}

function IndividualTeacherRoom({ classroom, onLeaveRoom }) {
  const [payload, setPayload] = useState(null)
  const [error, setError] = useState('')
  useEffect(() => {
    let active = true
    const poll = async () => {
      try {
        const response = await fetch(`/api/rooms/${classroom.code}`, { headers: { Authorization: `Bearer ${classroom.token}` } })
        if (response.status === 404 || response.status === 401) return onLeaveRoom()
        if (!response.ok) throw new Error()
        const next = await response.json()
        if (active) { setPayload(next); setError('') }
      } catch { if (active) setError('กำลังเชื่อมต่อใหม่…') }
    }
    poll(); const timer = window.setInterval(poll, 1000)
    return () => { active = false; window.clearInterval(timer) }
  }, [classroom.code, classroom.token])

  const saveState = async (nextState) => {
    setPayload((current) => current ? { ...current, state: nextState } : current)
    const response = await fetch(`/api/rooms/${classroom.code}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${classroom.token}` }, body: JSON.stringify(nextState) })
    if (!response.ok) setError('บันทึกสถานะการแข่งขันไม่สำเร็จ')
  }
  if (!payload) return <main className="paper-grid grid min-h-screen place-items-center"><LoaderCircle className="animate-spin text-[#193b2b]" size={46}/></main>
  const state = payload.state ?? { roomMode: 'individual' }
  const room = payload.room ?? {}
  const activity = state.activity ?? 'pairs'
  const questionIndex = state.individualQuestionIndex ?? 0
  const totalQuestions = state.individualTotalQuestions ?? 10
  const playing = state.roomStatus === 'playing'
  const finished = Boolean(state.individualFinished)
  const start = async () => {
    await fetch(`/api/rooms/${classroom.code}/individual-reset`, { method: 'POST', headers: { Authorization: `Bearer ${classroom.token}` } })
    await saveState({ ...state, roomMode: 'individual', teamCount: 1, activity, roomStatus: 'playing', individualQuestionIndex: 0, individualTotalQuestions: totalQuestions, individualQuestionData: individualQuestionFor(activity, 0), individualQuestionStartedAt: Date.now(), individualFinished: false })
  }
  const next = () => questionIndex + 1 >= totalQuestions
    ? saveState({ ...state, individualFinished: true, roomStatus: 'playing' })
    : saveState({ ...state, individualQuestionIndex: questionIndex + 1, individualQuestionData: individualQuestionFor(activity, questionIndex + 1), individualQuestionStartedAt: Date.now() })
  const returnToLobby = () => saveState({ ...state, roomStatus: 'lobby', individualFinished: false, individualQuestionIndex: 0 })

  return <main className="paper-grid min-h-screen p-3"><div className="mx-auto max-w-6xl"><header className="mb-3 flex flex-wrap items-center gap-3 rounded-3xl bg-[#5f3514] p-4 text-white shadow-lg"><Trophy size={34}/><div className="min-w-0 flex-1"><p className="text-xs font-black text-white/65">การแข่งขันรายบุคคล · รหัสห้อง</p><h1 className="text-3xl font-black tracking-wider">{classroom.code}</h1></div><span className="rounded-xl bg-white/15 px-3 py-2 font-black">{room.leaderboard?.length ?? 0} คน</span><button onClick={onLeaveRoom} className="grid size-11 place-items-center rounded-xl bg-white/15"><LogOut/></button></header>{error && <p className="mb-3 rounded-xl bg-[#fff0eb] p-3 text-center font-black text-[#a33b2f]">{error}</p>}
    {!playing ? <div className="grid gap-4 lg:grid-cols-[1.35fr_.65fr]"><section className="rounded-[28px] bg-white p-6 shadow-xl"><p className="text-sm font-black text-[#8a4b16]">ตั้งค่าการแข่งขัน</p><h2 className="text-3xl font-black text-[#193b2b]">เลือกกิจกรรมแล้วแจ้งรหัสให้นักเรียน</h2><p className="mt-4 text-sm font-black text-[#4e5a53]">กิจกรรม</p><div className="mt-2 grid grid-cols-2 gap-2">{ACTIVITY_OPTIONS.map(([value, label]) => <button key={value} onClick={() => saveState({ ...state, activity: value })} className={`min-h-12 rounded-xl font-black ${activity === value ? 'bg-[#8a4b16] text-white' : 'bg-[#f5efe6] text-[#6f4b2d]'}`}>{label}</button>)}</div><p className="mt-5 text-sm font-black text-[#4e5a53]">จำนวนข้อ</p><div className="mt-2 grid grid-cols-4 gap-2">{QUESTION_COUNT_OPTIONS.map((count) => <button key={count} onClick={() => saveState({ ...state, individualTotalQuestions: count })} className={`min-h-12 rounded-xl font-black ${totalQuestions === count ? 'bg-[#193b2b] text-white' : 'bg-[#edf3ef] text-[#456052]'}`}>{count}</button>)}</div><button onClick={start} disabled={!room.leaderboard?.length} className="mt-6 flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#193b2b] text-lg font-black text-white disabled:opacity-35"><Play/> เริ่มการแข่งขัน</button></section><CompetitionLeaderboard players={room.leaderboard}/></div>
      : finished ? <div className="mx-auto max-w-3xl"><section className="mb-4 rounded-[28px] bg-[#193b2b] p-7 text-center text-white shadow-xl"><Trophy className="mx-auto text-[#ffd05a]" size={60}/><p className="mt-2 font-black text-[#b8d2c4]">จบการแข่งขัน {activityTitleOf(activity)}</p><h2 className="text-4xl font-black">ประกาศผู้ชนะ 5 อันดับแรก</h2></section><CompetitionLeaderboard players={room.leaderboard}/><button onClick={returnToLobby} className="mt-4 min-h-13 w-full rounded-2xl bg-[#8a4b16] px-5 py-3 text-lg font-black text-white">กลับไปตั้งค่ารอบใหม่</button></div>
        : <div className="grid gap-4 lg:grid-cols-[1fr_360px]"><section className="rounded-[28px] bg-white p-6 text-center shadow-xl"><p className="font-black text-[#8a4b16]">กำลังแข่งขัน · {activityTitleOf(activity)}</p><h2 className="mt-2 text-5xl font-black text-[#193b2b]">ข้อ {questionIndex + 1}/{totalQuestions}</h2><p className="mt-3 text-lg font-bold text-[#68736d]">นักเรียนกำลังตอบโจทย์บนอุปกรณ์ของตนเอง</p><button onClick={next} className="mt-7 inline-flex min-h-14 items-center gap-2 rounded-2xl bg-[#193b2b] px-10 text-lg font-black text-white">{questionIndex + 1 >= totalQuestions ? <><Trophy/> จบและประกาศผล</> : <>เริ่มข้อถัดไป <ChevronRight/></>}</button></section><CompetitionLeaderboard players={room.leaderboard} compact/></div>}
  </div></main>
}

function IndividualStudentRoom({ session, onLeaveRoom }) {
  const [payload, setPayload] = useState(null)
  const [answer, setAnswer] = useState([])
  const [submitted, setSubmitted] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  useEffect(() => {
    let active = true
    const poll = async () => {
      try {
        const response = await fetch(`/api/rooms/${session.code}`, { headers: { Authorization: `Bearer ${session.token}` } })
        if (response.status === 404 || response.status === 401) return onLeaveRoom()
        if (!response.ok) throw new Error()
        const next = await response.json()
        if (active) { setPayload(next); setError('') }
      } catch { if (active) setError('กำลังเชื่อมต่อใหม่…') }
    }
    poll(); const timer = window.setInterval(poll, 800)
    return () => { active = false; window.clearInterval(timer) }
  }, [session.code, session.token])
  const state = payload?.state ?? {}
  const activity = state.activity ?? 'pairs'
  const questionIndex = state.individualQuestionIndex ?? 0
  const context = `${activity}:${questionIndex}`
  useEffect(() => { setAnswer(individualBlankAnswer(activity)); setSubmitted(false); setResult(null) }, [context])
  const question = individualQuestionFor(activity, questionIndex)
  const ready = individualAnswerReady(activity, answer, question)
  const correct = individualAnswerCorrect(activity, answer, question)
  const team = { ...TEAMS[1], name: session.name ?? 'ผู้เข้าแข่งขัน', animal: session.emoji ?? '😀' }
  const updateSlot = (slot, value, size) => setAnswer((current) => { const next = current.length === size ? [...current] : Array(size).fill(null); next[slot] = value; return next })
  const selectPair = (number) => setAnswer((current) => current.includes(number) ? current.filter((value) => value !== number) : current.length < 2 ? [...current, number] : [current[1], number])
  const submit = async () => {
    if (!ready || submitted) return
    setSubmitted(true)
    const response = await fetch(`/api/rooms/${session.code}/individual-answer`, { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.token}` }, body: JSON.stringify({ answer }) })
    if (!response.ok) { setError('ส่งคำตอบไม่สำเร็จ'); return }
    const responseResult = await response.json()
    setResult(responseResult); playFeedbackSound([responseResult.correct])
  }
  const leave = async () => { try { await fetch(`/api/rooms/${session.code}/leave`, { method: 'POST', headers: { Authorization: `Bearer ${session.token}` } }) } catch {}; onLeaveRoom() }
  if (!payload) return <main className="paper-grid grid min-h-screen place-items-center"><LoaderCircle className="animate-spin text-[#193b2b]" size={46}/></main>
  const finished = Boolean(state.individualFinished)
  const playing = state.roomStatus === 'playing'
  const introSize = activity === 'intro' ? (question.common === 1 ? 3 : 4) + (question.innerA === 1 ? 0 : 1) : 0
  const submittedCorrect = result?.correct ?? correct
  return <main className="paper-grid min-h-screen p-3"><div className="mx-auto max-w-3xl"><header className="mb-3 flex items-center gap-3 rounded-3xl bg-[#8a4b16] p-4 text-white shadow-lg"><span className="text-4xl">{session.emoji}</span><div className="min-w-0 flex-1"><p className="text-xs font-black text-white/65">{session.name} · ห้อง {session.code}</p><h1 className="truncate text-2xl font-black">แข่งขันรายบุคคล</h1></div><button onClick={leave} className="grid size-11 place-items-center rounded-xl bg-white/15"><LogOut/></button></header>{error && <p className="mb-3 rounded-xl bg-[#fff0eb] p-3 text-center font-black text-[#a33b2f]">{error}</p>}
    {!playing ? <section className="grid min-h-[55vh] place-items-center rounded-[28px] bg-white p-8 text-center shadow-xl"><div><LoaderCircle className="mx-auto animate-spin text-[#d78a25]" size={50}/><h2 className="mt-4 text-3xl font-black text-[#193b2b]">รอครูเริ่มการแข่งขัน</h2><p className="mt-2 font-bold text-[#68736d]">ผู้เข้าแข่งขัน {payload.room?.leaderboard?.length ?? 0} คน</p></div></section>
      : finished ? <><section className="mb-3 rounded-[28px] bg-[#193b2b] p-6 text-center text-white"><Trophy className="mx-auto text-[#ffd05a]" size={56}/><h2 className="mt-2 text-3xl font-black">ผลการแข่งขัน</h2></section><CompetitionLeaderboard players={payload.room?.leaderboard}/></>
        : <><div className="mb-3 flex items-center justify-between rounded-2xl bg-white px-4 py-3 shadow-sm"><div><p className="text-xs font-black text-[#778078]">กำลังแข่งขัน</p><h2 className="text-xl font-black text-[#193b2b]">{activityTitleOf(activity)}</h2></div><span className="rounded-full bg-[#fff0dc] px-3 py-1 text-sm font-black text-[#8a4b16]">ข้อ {questionIndex + 1}/{state.individualTotalQuestions ?? 10}</span></div>{activity === 'intro' ? <DistributivePlayArea teams={[team]} teamNames={[team.name]} questions={[question]} index={questionIndex} totalQuestions={state.individualTotalQuestions ?? 10} answers={[answer]} revealed={submitted} hideControls onSelect={(_, slot, value) => !submitted && updateSlot(slot, value, introSize)}/>
          : activity === 'guided' ? <GuidedPlayArea teams={[team]} teamNames={[team.name]} questions={[question]} index={questionIndex} answers={[answer]} revealed={submitted} numberMode="positive" hideControls onSelect={(_, slot, value) => !submitted && updateSlot(slot, value, 2)}/>
            : activity === 'factor' ? <FactorPlayArea teams={[team]} teamNames={[team.name]} questions={[question]} index={questionIndex} totalQuestions={state.individualTotalQuestions ?? 10} answers={[answer]} revealed={submitted} numberMode="mixed" hideControls onSelect={(_, slot, value) => !submitted && updateSlot(slot, value, 4)}/>
              : <><QuestionBanner question={question} index={questionIndex} totalQuestions={state.individualTotalQuestions ?? 10} revealed={submitted} mode="same" numberMode="positive"/><div className="mt-3"><TeamCard team={team} question={question} showQuestion integerMode={false} answer={answer} choices={Array.from({ length: 10 }, (_, i) => i + 1)} revealed={submitted} correct={submitted && correct} onSelect={(number) => !submitted && selectPair(number)}/></div></>}
          <div className={`mt-3 rounded-2xl p-3 text-center font-black ${submitted ? (submittedCorrect ? 'bg-[#dff5e8] text-[#17613e]' : 'bg-[#fff0eb] text-[#a33b2f]') : 'bg-white text-[#5f6c65]'}`}>{submitted ? (submittedCorrect ? `🎉 ถูกต้อง! ใช้เวลา ${result ? formatTime(result.elapsedMs) : '...'}` : 'ยังไม่ถูก รอครูเริ่มข้อถัดไป') : 'ตอบได้หนึ่งครั้ง เลือกให้ครบแล้วกดส่งคำตอบ'}<button onClick={submit} disabled={!ready || submitted} className="mx-auto mt-3 flex min-h-12 w-full max-w-md items-center justify-center gap-2 rounded-xl bg-[#8a4b16] text-lg font-black text-white disabled:opacity-35"><Check/> {submitted ? 'ส่งคำตอบแล้ว' : 'ส่งคำตอบ'}</button></div></>}
  </div></main>
}

function StudentRoom({ session, onLeaveRoom }) {
  const [payload, setPayload] = useState(null)
  const [error, setError] = useState('')
  const sending = useRef(0)
  const sendQueue = useRef(Promise.resolve())
  const answerRef = useRef([])
  const answerContextRef = useRef('')

  useEffect(() => {
    let active = true
    const poll = async () => {
      if (sending.current > 0) return
      try {
        const response = await fetch(`/api/rooms/${session.code}`, { headers: { Authorization: `Bearer ${session.token}` } })
        if (response.status === 404 || response.status === 401) return onLeaveRoom()
        if (!response.ok) throw new Error()
        const next = await response.json()
        if (active) { setPayload(next); setError('') }
      } catch { if (active) setError('กำลังเชื่อมต่อใหม่…') }
    }
    poll()
    const timer = window.setInterval(poll, 1000)
    return () => { active = false; window.clearInterval(timer) }
  }, [session.code, session.token])

  const leave = async () => {
    try { await fetch(`/api/rooms/${session.code}/leave`, { method: 'POST', headers: { Authorization: `Bearer ${session.token}` } }) } catch {}
    onLeaveRoom()
  }

  if (!payload) return <main className="paper-grid grid min-h-screen place-items-center"><div className="text-center text-[#193b2b]"><LoaderCircle className="mx-auto animate-spin" size={44}/><p className="mt-3 font-black">กำลังเข้าห้อง {session.code}…</p></div></main>
  const state = payload.state ?? {}
  const teamIndex = payload.teamIndex ?? session.teamIndex
  const team = { ...TEAMS[teamIndex], name: state.teamNames?.[teamIndex] ?? TEAMS[teamIndex].name }
  const activity = state.activity ?? 'intro'
  const getQuestion = (bank, questionIndex, mode, offset) => bank[mode === 'different' ? (questionIndex + teamIndex * offset) % bank.length : questionIndex]
  const question = activity === 'intro'
    ? getQuestion(DISTRIBUTIVE_QUESTIONS, state.introQuestionIndex ?? 0, state.introGameMode, 3)
    : activity === 'guided'
      ? getQuestion(state.guidedNumberMode === 'mixed' ? MIXED_GUIDED_QUESTIONS : POSITIVE_GUIDED_QUESTIONS, state.guidedQuestionIndex ?? 0, state.guidedGameMode, 3)
      : activity === 'factor'
        ? getQuestion(state.factorNumberMode === 'mixed' ? MIXED_FACTOR_QUESTIONS : POSITIVE_FACTOR_QUESTIONS, state.factorQuestionIndex ?? 0, state.factorGameMode, 3)
        : getQuestion(state.numberMode === 'integers' ? INTEGER_QUESTIONS : QUESTIONS, state.questionIndex ?? 0, state.gameMode, 4)
  const key = { intro: 'introAnswers', pairs: 'answers', guided: 'guidedAnswers', factor: 'factorAnswers' }[activity]
  const answer = state[key]?.[teamIndex] ?? []
  const revealedNow = activity === 'intro' ? state.introRevealed : activity === 'guided' ? state.guidedRevealed : activity === 'factor' ? state.factorRevealed : state.revealed
  const finishedNow = activity === 'intro' ? state.introFinished : activity === 'guided' ? state.guidedFinished : activity === 'factor' ? state.factorFinished : state.finished
  const questionIndex = activity === 'intro' ? state.introQuestionIndex : activity === 'guided' ? state.guidedQuestionIndex : activity === 'factor' ? state.factorQuestionIndex : state.questionIndex
  const answerContext = `${activity}:${questionIndex ?? 0}`
  if (answerContextRef.current !== answerContext || sending.current === 0) {
    answerContextRef.current = answerContext
    answerRef.current = answer
  }

  const updateAnswer = (nextAnswer) => {
    answerRef.current = nextAnswer
    const roomTeamCount = state.teamCount ?? payload.room?.teamCount ?? 4
    const answers = Array.isArray(state[key]) && state[key].length >= roomTeamCount ? state[key].map((item) => [...item]) : blankAnswers(roomTeamCount)
    answers[teamIndex] = nextAnswer
    setPayload((current) => ({ ...current, state: { ...current.state, [key]: answers } }))
    sending.current += 1
    sendQueue.current = sendQueue.current.catch(() => {}).then(async () => {
      const response = await fetch(`/api/rooms/${session.code}/answer`, { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.token}` }, body: JSON.stringify({ activity, answer: nextAnswer }) })
      if (!response.ok) throw new Error('answer rejected')
      setError('')
    })
      .catch(() => setError('ส่งคำตอบไม่สำเร็จ ระบบจะลองเชื่อมต่อใหม่'))
      .finally(() => { sending.current -= 1 })
  }
  const updateSlot = (slot, value, size) => {
    const currentAnswer = answerRef.current
    const next = currentAnswer.length === size ? [...currentAnswer] : Array(size).fill(null)
    next[slot] = value
    updateAnswer(next)
  }
  const selectPair = (number) => {
    const currentAnswer = answerRef.current
    updateAnswer(currentAnswer.includes(number) ? currentAnswer.filter((value) => value !== number) : currentAnswer.length < 2 ? [...currentAnswer, number] : [currentAnswer[1], number])
  }
  const introSize = (question.common === 1 ? 3 : 4) + (question.innerA === 1 ? 0 : 1)
  const title = activity === 'intro' ? 'แจกแจงให้แจ่ม' : activity === 'guided' ? 'คู่คิดพิชิตวงเล็บ' : activity === 'factor' ? 'นักสืบตัวประกอบ' : 'คู่คูณชวนคิด'

  return <main className="paper-grid min-h-screen p-3">
    <div className="mx-auto max-w-3xl">
      <header className="mb-3 flex items-center gap-3 rounded-3xl p-4 text-white shadow-lg" style={{ backgroundColor: team.color }}><span className="text-4xl">{session.emoji ?? team.animal}</span><div className="min-w-0 flex-1"><p className="text-xs font-black opacity-75">{session.name ?? 'สมาชิก'} · ห้อง {session.code}</p><h1 className="truncate text-2xl font-black">{team.name}</h1></div><button onClick={leave} className="grid size-11 place-items-center rounded-xl bg-white/20" aria-label="ออกจากกลุ่ม"><LogOut/></button></header>
      {error && <p className="mb-3 rounded-xl bg-[#fff0eb] px-3 py-2 text-center text-sm font-black text-[#a33b2f]">{error}</p>}
      {state.roomStatus !== 'playing' ? <section className="grid min-h-[55vh] place-items-center rounded-[28px] bg-white p-8 text-center shadow-xl"><div><LoaderCircle className="mx-auto animate-spin text-[#d78a25]" size={48}/><p className="mt-4 text-sm font-black text-[#8b7559]">ครูเลือกกิจกรรม</p><h2 className="text-3xl font-black text-[#193b2b]">{title}</h2><p className="mt-2 font-bold text-[#68736d]">รอครูกดเริ่มกิจกรรม หน้านี้จะเปลี่ยนอัตโนมัติ</p></div></section> : finishedNow ? <section className="grid min-h-[55vh] place-items-center rounded-[28px] bg-white p-8 text-center shadow-xl"><div><Trophy className="mx-auto text-[#d88b20]" size={64}/><p className="mt-4 font-black text-[#a76c1d]">จบกิจกรรม {title}</p><h2 className="text-4xl font-black text-[#193b2b]">เก่งมาก!</h2><p className="mt-2 font-bold text-[#68736d]">รอครูเริ่มรอบใหม่หรือเลือกกิจกรรมถัดไป</p></div></section> : <>
        <div className="mb-3 flex items-center justify-between rounded-2xl bg-white px-4 py-3 shadow-sm"><div><p className="text-xs font-black text-[#778078]">กำลังเล่น</p><h2 className="text-xl font-black text-[#193b2b]">{title}</h2></div><span className="rounded-full bg-[#e6f5ec] px-3 py-1 text-sm font-black text-[#20704a]">ข้อ {(questionIndex ?? 0) + 1}</span></div>
        {activity === 'intro' ? <DistributivePlayArea teams={[team]} teamNames={[team.name]} questions={[question]} index={state.introQuestionIndex ?? 0} totalQuestions={state.introTotalQuestions ?? 10} answers={[answer]} revealed={Boolean(revealedNow)} hideControls onSelect={(_, slot, value) => updateSlot(slot, value, introSize)}/>
          : activity === 'guided' ? <GuidedPlayArea teams={[team]} teamNames={[team.name]} questions={[question]} index={state.guidedQuestionIndex ?? 0} answers={[answer]} revealed={Boolean(revealedNow)} numberMode={state.guidedNumberMode ?? 'positive'} hideControls onSelect={(_, slot, value) => updateSlot(slot, value, 2)}/>
            : activity === 'factor' ? <FactorPlayArea teams={[team]} teamNames={[team.name]} questions={[question]} index={state.factorQuestionIndex ?? 0} totalQuestions={state.factorTotalQuestions ?? 10} answers={[answer]} revealed={Boolean(revealedNow)} numberMode={state.factorNumberMode ?? 'mixed'} hideControls onSelect={(_, slot, value) => updateSlot(slot, value, 4)}/>
              : <TeamCard team={team} question={question} showQuestion integerMode={state.numberMode === 'integers'} answer={answer} choices={state.numberMode === 'integers' ? Array.from({ length: 13 }, (_, i) => i - 6) : Array.from({ length: 10 }, (_, i) => i + 1)} revealed={Boolean(revealedNow)} correct={Boolean(revealedNow) && isCorrect(answer, question)} onSelect={selectPair}/>}
        <p className="mt-3 rounded-2xl bg-white px-4 py-3 text-center font-black text-[#5f6c65]">{revealedNow ? 'ครูเฉลยแล้ว รอข้อถัดไป' : 'คำตอบของกลุ่มจะส่งให้ครูอัตโนมัติ'}</p>
      </>}
    </div>
  </main>
}

function SoloPractice({ onLeaveRoom }) {
  const savedProfile = (() => { try { return JSON.parse(localStorage.getItem('factor-rally-solo-profile-v1')) } catch { return null } })()
  const [name, setName] = useState(savedProfile?.name ?? '')
  const [emoji, setEmoji] = useState(savedProfile?.emoji ?? MEMBER_EMOJIS[0])
  const [started, setStarted] = useState(Boolean(savedProfile?.name))
  const [activity, setActivity] = useState('intro')
  const [questionIndex, setQuestionIndex] = useState(0)
  const [answer, setAnswer] = useState([])
  const [revealed, setRevealed] = useState(false)
  const [score, setScore] = useState(0)
  const [finished, setFinished] = useState(false)
  const totalQuestions = 10
  const team = { ...TEAMS[0], name: name || 'ผู้เล่น', animal: emoji }
  const question = activity === 'intro' ? DISTRIBUTIVE_QUESTIONS[questionIndex % DISTRIBUTIVE_QUESTIONS.length]
    : activity === 'guided' ? POSITIVE_GUIDED_QUESTIONS[questionIndex % POSITIVE_GUIDED_QUESTIONS.length]
      : activity === 'factor' ? MIXED_FACTOR_QUESTIONS[questionIndex % MIXED_FACTOR_QUESTIONS.length]
        : QUESTIONS[questionIndex % QUESTIONS.length]
  const ready = activity === 'intro' ? isDistributiveReady(answer, question)
    : activity === 'guided' ? answer.filter(Number.isFinite).length === 2
      : activity === 'factor' ? answer.filter(Number.isFinite).length === 4
        : answer.length === 2
  const correct = activity === 'intro' ? isDistributiveCorrect(answer, question)
    : activity === 'guided' ? isGuidedCorrect(answer, question)
      : activity === 'factor' ? isFactorCorrect(answer, question)
        : isCorrect(answer, question)
  const title = activity === 'intro' ? 'แจกแจงให้แจ่ม' : activity === 'guided' ? 'คู่คิดพิชิตวงเล็บ' : activity === 'factor' ? 'นักสืบตัวประกอบ' : 'คู่คูณชวนคิด'

  const resetAnswer = (nextActivity = activity) => {
    setAnswer(nextActivity === 'guided' ? [null, null] : nextActivity === 'factor' ? [null, null, null, null] : [])
    setRevealed(false)
  }
  const chooseActivity = (nextActivity) => {
    setActivity(nextActivity); setQuestionIndex(0); setScore(0); setFinished(false); resetAnswer(nextActivity)
  }
  const updateSlot = (slot, value, size) => setAnswer((current) => {
    const next = current.length === size ? [...current] : Array(size).fill(null)
    next[slot] = value
    return next
  })
  const selectPair = (number) => setAnswer((current) => current.includes(number) ? current.filter((value) => value !== number) : current.length < 2 ? [...current, number] : [current[1], number])
  const check = () => {
    if (!ready || revealed) return
    setRevealed(true)
    if (correct) setScore((value) => value + 1)
    playFeedbackSound([correct])
  }
  const next = () => {
    if (questionIndex + 1 >= totalQuestions) return setFinished(true)
    setQuestionIndex((value) => value + 1)
    resetAnswer()
  }
  const begin = (event) => {
    event.preventDefault()
    if (!name.trim()) return
    localStorage.setItem('factor-rally-solo-profile-v1', JSON.stringify({ name: name.trim(), emoji }))
    setName(name.trim()); setStarted(true)
  }

  if (!started) return <main className="paper-grid grid min-h-screen place-items-center p-4"><form onSubmit={begin} className="w-full max-w-md rounded-[28px] bg-white p-6 shadow-2xl"><button type="button" onClick={onLeaveRoom} className="mb-4 flex items-center gap-1 font-bold text-[#657068]"><ArrowLeft size={18}/> กลับ</button><div className="text-center"><span className="text-5xl">✏️</span><h1 className="mt-2 text-3xl font-black text-[#193b2b]">ฝึกเล่นคนเดียว</h1><p className="mt-1 font-bold text-[#68736d]">ตั้งชื่อก่อนเริ่มฝึก ระบบจะตรวจคำตอบให้ทันที</p></div><label className="mt-5 block text-sm font-black">ชื่อของฉัน</label><input autoFocus value={name} onChange={(event) => setName(event.target.value)} maxLength={24} className="mt-2 min-h-12 w-full rounded-xl border-2 border-[#d7d2c8] px-4 text-lg font-bold outline-none focus:border-[#40755b]" placeholder="เช่น น้องมิน"/><p className="mt-5 text-sm font-black">เลือกหน้าอิโมจิ</p><div className="mt-2 grid grid-cols-6 gap-2">{MEMBER_EMOJIS.map((item) => <button type="button" key={item} onClick={() => setEmoji(item)} className={`grid aspect-square place-items-center rounded-xl border-2 text-2xl ${emoji === item ? 'border-[#193b2b] bg-[#e9f2ed]' : 'border-[#e3ded4]'}`}>{item}</button>)}</div><button disabled={!name.trim()} className="mt-6 min-h-13 w-full rounded-xl bg-[#193b2b] px-5 py-3 text-lg font-black text-white disabled:opacity-35">เริ่มฝึก</button></form></main>

  if (finished) return <main className="paper-grid grid min-h-screen place-items-center p-4"><section className="w-full max-w-xl rounded-[30px] bg-white p-8 text-center shadow-2xl"><Trophy className="mx-auto text-[#d88b20]" size={64}/><p className="mt-3 text-5xl">{emoji}</p><h1 className="mt-2 text-4xl font-black text-[#193b2b]">เก่งมาก {name}!</h1><p className="mt-3 text-xl font-bold text-[#68736d]">ทำได้ {score}/{totalQuestions} คะแนน</p><div className="mt-6 grid grid-cols-2 gap-3"><button onClick={onLeaveRoom} className="min-h-12 rounded-xl bg-[#eeeae1] font-bold">กลับหน้าหลัก</button><button onClick={() => chooseActivity(activity)} className="min-h-12 rounded-xl bg-[#193b2b] font-black text-white">ฝึกอีกครั้ง</button></div></section></main>

  const introSize = activity === 'intro' ? (question.common === 1 ? 3 : 4) + (question.innerA === 1 ? 0 : 1) : 0
  return <main className="paper-grid min-h-screen p-3"><div className="mx-auto max-w-3xl"><header className="mb-3 flex flex-wrap items-center gap-3 rounded-3xl bg-[#193b2b] p-4 text-white shadow-lg"><span className="text-4xl">{emoji}</span><div className="min-w-0 flex-1"><p className="text-xs font-black text-white/65">โหมดฝึกคนเดียว</p><h1 className="truncate text-2xl font-black">{name} · {score} คะแนน</h1></div><button onClick={onLeaveRoom} className="grid size-11 place-items-center rounded-xl bg-white/15"><LogOut/></button></header><div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">{[['intro', '1 แจกแจง'], ['pairs', '1.1 คู่คูณ'], ['guided', '1.2 คู่คิด'], ['factor', '2 นักสืบ']].map(([value, label]) => <button key={value} onClick={() => chooseActivity(value)} className={`min-h-10 rounded-xl text-sm font-black ${activity === value ? 'bg-[#ffd05a] text-[#473510]' : 'bg-white text-[#647069]'}`}>{label}</button>)}</div><div className="mb-3 flex items-center justify-between rounded-2xl bg-white px-4 py-3 shadow-sm"><div><p className="text-xs font-black text-[#778078]">กำลังฝึก</p><h2 className="text-xl font-black text-[#193b2b]">{title}</h2></div><span className="rounded-full bg-[#e6f5ec] px-3 py-1 text-sm font-black text-[#20704a]">ข้อ {questionIndex + 1}/{totalQuestions}</span></div>
    {activity === 'intro' ? <DistributivePlayArea teams={[team]} teamNames={[team.name]} questions={[question]} index={questionIndex} totalQuestions={totalQuestions} answers={[answer]} revealed={revealed} hideControls onSelect={(_, slot, value) => updateSlot(slot, value, introSize)}/>
      : activity === 'guided' ? <GuidedPlayArea teams={[team]} teamNames={[team.name]} questions={[question]} index={questionIndex} answers={[answer]} revealed={revealed} numberMode="positive" hideControls onSelect={(_, slot, value) => updateSlot(slot, value, 2)}/>
        : activity === 'factor' ? <FactorPlayArea teams={[team]} teamNames={[team.name]} questions={[question]} index={questionIndex} totalQuestions={totalQuestions} answers={[answer]} revealed={revealed} numberMode="mixed" hideControls onSelect={(_, slot, value) => updateSlot(slot, value, 4)}/>
          : <><QuestionBanner question={question} index={questionIndex} totalQuestions={totalQuestions} revealed={revealed} mode="same" numberMode="positive"/><div className="mt-3"><TeamCard team={team} question={question} showQuestion integerMode={false} answer={answer} choices={Array.from({ length: 10 }, (_, i) => i + 1)} revealed={revealed} correct={revealed && correct} onSelect={selectPair}/></div></>}
    <div className={`mt-3 rounded-2xl p-3 text-center font-black ${revealed ? (correct ? 'bg-[#dff5e8] text-[#17613e]' : 'bg-[#fff0eb] text-[#a33b2f]') : 'bg-white text-[#5f6c65]'}`}>{revealed ? (correct ? '🎉 ถูกต้อง เก่งมาก!' : 'ลองดูเฉลยแล้วจำวิธีไว้ฝึกข้อต่อไปนะ') : 'เลือกคำตอบให้ครบ แล้วกดตรวจคำตอบ'}<button onClick={revealed ? next : check} disabled={!revealed && !ready} className="mx-auto mt-3 flex min-h-12 w-full max-w-md items-center justify-center gap-2 rounded-xl bg-[#193b2b] px-5 text-lg font-black text-white disabled:opacity-35">{revealed ? <>ข้อต่อไป <ChevronRight/></> : <><Check/> ตรวจคำตอบ</>}</button></div></div></main>
}

function SaveStatus({ status }) {
  const states = {
    loading: { icon: <LoaderCircle className="animate-spin" size={14}/>, text: 'กำลังเชื่อมต่อ' },
    saving: { icon: <Cloud size={14}/>, text: 'กำลังบันทึก' },
    saved: { icon: <Check size={14}/>, text: 'บันทึกแล้ว' },
    offline: { icon: <CloudOff size={14}/>, text: 'ออฟไลน์' },
  }
  const current = states[status] ?? states.loading
  return <span className={`hidden min-h-10 items-center gap-1.5 rounded-xl px-3 text-xs font-black xl:flex ${status === 'offline' ? 'bg-[#fff0e7] text-[#a7462b]' : 'bg-[#e7f3eb] text-[#276647]'}`}>{current.icon}{current.text}</span>
}

function ScoreSidebar({ teams, scores, answers, members, teamNames, questions, totalQuestions, revealed, isAnswerCorrect = isCorrect, isAnswerReady, answerSize = 2, onAdjustScore, onAdd, onRemove }) {
  return <aside className="score-sidebar rounded-[24px] bg-[#173c2c] p-3 text-white shadow-xl" aria-label="แถบคะแนนด้านซ้าย">
    <div className="flex items-center justify-between px-2 py-2"><div><p className="text-[10px] font-black uppercase tracking-[.18em] text-[#acc8b9]">Score board</p><h2 className="text-lg font-black">พลังของทีม</h2></div><Trophy className="text-[#ffc45d]" size={26}/></div>
    <div className="score-team-grid mt-2 grid grid-cols-2 gap-2">
      {teams.map((team, index) => {
        const correct = revealed && isAnswerCorrect(answers[index], questions[index])
        const ready = isAnswerReady ? isAnswerReady(answers[index], questions[index]) : answers[index].filter(Number.isFinite).length === answerSize
        return <div key={team.name} className="rounded-2xl p-3 text-[#1d2922]" style={{ backgroundColor: team.pale }}>
          <div className="flex items-center gap-2"><span className="text-3xl" role="img">{team.animal}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-black" style={{ color: team.color }}>{teamNames[index]}</p><p className="text-[11px] font-bold text-[#657068]">{revealed ? (correct ? '+1 พลัง!' : 'ไม่ได้แต้ม') : (ready ? 'เลือกแล้ว ✓' : 'กำลังคิด')}</p></div><strong className="text-3xl font-black" style={{ color: team.color }}>{scores[index]}</strong></div>
          <div className="mt-2 h-3 overflow-hidden rounded-full bg-white/80"><div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(100, scores[index] / totalQuestions * 100)}%`, backgroundColor: team.color }}/></div>
          <div className="mt-2 grid grid-cols-2 gap-2" aria-label={`ปรับคะแนน ${teamNames[index]}`}>
            <button type="button" onClick={() => onAdjustScore(index, -1)} disabled={scores[index] <= 0} className="min-h-9 rounded-lg border-2 border-white bg-white/70 text-lg font-black text-[#9a4935] shadow-sm transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-35" aria-label={`ลดคะแนน ${teamNames[index]} 1 คะแนน`}>− คะแนน</button>
            <button type="button" onClick={() => onAdjustScore(index, 1)} className="min-h-9 rounded-lg border-2 border-white bg-white text-lg font-black shadow-sm transition hover:brightness-105" style={{ color: team.color }} aria-label={`เพิ่มคะแนน ${teamNames[index]} 1 คะแนน`}>+ คะแนน</button>
          </div>
          <div className="mt-2 space-y-1">
            {members[index].map((member) => <div key={member.id} className="group flex items-center gap-1.5 rounded-lg bg-white/65 px-2 py-1 text-xs font-bold"><span className="text-base">{member.emoji}</span><span className="min-w-0 flex-1 truncate">{member.name}</span><span className="font-black" style={{ color: team.color }}>{scores[index]}</span><button onClick={() => onRemove(index, member.id)} className="ml-1 hidden text-[#9a5b55] group-hover:block" aria-label={`ลบ ${member.name}`}><Trash2 size={12}/></button></div>)}
          </div>
          {onAdd && <button onClick={() => onAdd(index)} className="mt-2 flex min-h-8 w-full items-center justify-center gap-1 rounded-lg border border-dashed bg-white/45 text-xs font-black" style={{ borderColor: team.color, color: team.color }}><Plus size={13}/> เพิ่มสมาชิก</button>}
        </div>
      })}
    </div>
    <div className="mt-3 rounded-xl bg-white/10 p-2 text-center text-xs font-bold text-[#c9ddd2]">เต็ม {totalQuestions} พลัง · ถูก 1 ข้อ ได้ 1 พลัง</div>
  </aside>
}

function FactorSettingsModal({ teams, names, mode, numberMode, totalQuestions = 10, currentQuestion, title = 'ตั้งค่านักสืบตัวประกอบ', icon = '🔎', showNumberMode = true, showQuestionCount = false, onCancel, onApply }) {
  const [draftNames, setDraftNames] = useState(names)
  const [draftMode, setDraftMode] = useState(mode)
  const [draftNumberMode, setDraftNumberMode] = useState(numberMode)
  const [draftTotal, setDraftTotal] = useState(totalQuestions)
  return <div className="fixed inset-0 z-30 grid place-items-center overflow-y-auto bg-[#17231d]/65 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="factor-settings-title">
    <form onSubmit={(event) => { event.preventDefault(); onApply(draftNames, draftMode, draftNumberMode, draftTotal) }} className="w-full max-w-2xl rounded-[28px] bg-white p-6 shadow-2xl">
      <div className="flex items-center gap-3"><div className="grid size-12 place-items-center rounded-2xl bg-[#eee9ff] text-2xl">{icon}</div><div><p className="text-xs font-black uppercase tracking-wider text-[#8276b4]">Factor settings</p><h2 id="factor-settings-title" className="text-2xl font-black">{title}</h2></div></div>
      <p className="mt-5 text-sm font-black text-[#4e5a53]">ชื่อกลุ่ม</p>
      <div className="mt-2 grid grid-cols-2 gap-3">{teams.map((team, index) => <label key={team.name} className="flex items-center gap-2 rounded-xl border-2 p-2" style={{ borderColor: team.color, backgroundColor: team.pale }}><span className="text-2xl">{team.animal}</span><input value={draftNames[index]} onChange={(event) => setDraftNames((current) => current.map((name, i) => i === index ? event.target.value : name))} maxLength={20} className="min-w-0 flex-1 rounded-lg bg-white/85 px-3 py-2 font-black outline-none" aria-label={`ชื่อกลุ่มที่ ${index + 1}`}/></label>)}</div>

      <p className="mt-5 text-sm font-black text-[#4e5a53]">รูปแบบโจทย์</p>
      <div className="mt-2 grid gap-3 sm:grid-cols-2">
        <button type="button" onClick={() => setDraftMode('same')} className={`rounded-2xl border-2 p-4 text-left ${draftMode === 'same' ? 'border-[#2878c8] bg-[#e8f2ff]' : 'border-[#ded8cb]'}`}><strong className="text-lg">👥 โจทย์เหมือนกัน</strong><p className="mt-1 text-sm font-bold text-[#68736d]">ทั้ง {teams.length} กลุ่มแก้สมการเดียวกัน</p></button>
        <button type="button" onClick={() => setDraftMode('different')} className={`rounded-2xl border-2 p-4 text-left ${draftMode === 'different' ? 'border-[#e76f2e] bg-[#fff0e7]' : 'border-[#ded8cb]'}`}><strong className="text-lg">🔥 โจทย์แตกต่างกัน</strong><p className="mt-1 text-sm font-bold text-[#68736d]">แต่ละการ์ดมีสมการของกลุ่มตัวเอง</p></button>
      </div>

      {showQuestionCount && <><p className="mt-5 text-sm font-black text-[#4e5a53]">จำนวนข้อ</p>
      <div className="mt-2 grid grid-cols-4 gap-2">{QUESTION_COUNT_OPTIONS.map((count) => {
        const unavailable = count < currentQuestion
        return <button type="button" key={count} disabled={unavailable} onClick={() => setDraftTotal(count)} className={`min-h-12 rounded-xl border-2 text-lg font-black ${draftTotal === count ? 'border-[#6d4317] bg-[#fff3df] text-[#6d4317]' : 'border-[#ded8cb] bg-white text-[#68736d]'} disabled:cursor-not-allowed disabled:opacity-30`}>{count} ข้อ</button>
      })}</div></>}

      {showNumberMode && <><p className="mt-5 text-sm font-black text-[#4e5a53]">ชนิดของจำนวน</p>
      <div className="mt-2 grid gap-3 sm:grid-cols-2">
        <button type="button" onClick={() => setDraftNumberMode('positive')} className={`rounded-2xl border-2 p-4 text-left ${draftNumberMode === 'positive' ? 'border-[#249263] bg-[#e8f7ef]' : 'border-[#ded8cb]'}`}><strong className="text-lg">🌱 จำนวนบวก</strong><p className="mt-1 text-sm font-bold text-[#68736d]">ใช้เฉพาะจำนวนบวก</p></button>
        <button type="button" onClick={() => setDraftNumberMode('mixed')} className={`rounded-2xl border-2 p-4 text-left ${draftNumberMode === 'mixed' ? 'border-[#8459c4] bg-[#f1ebfb]' : 'border-[#ded8cb]'}`}><strong className="text-lg">± จำนวนเต็มแบบผสม</strong><p className="mt-1 text-sm font-bold text-[#68736d]">มีทั้งจำนวนบวกและจำนวนติดลบ</p></button>
      </div></>}

      <p className="mt-3 rounded-xl bg-[#fff4d9] px-3 py-2 text-xs font-bold text-[#77551e]">กำลังเล่นข้อ {currentQuestion}/{showQuestionCount ? draftTotal : 10} · เปลี่ยนการตั้งค่าแล้วเลขข้อ คะแนน และสมาชิกจะนับต่อ โดยล้างเฉพาะคำตอบปัจจุบัน</p>
      <div className="mt-5 grid grid-cols-2 gap-3"><button type="button" onClick={onCancel} className="min-h-12 rounded-xl bg-[#eeeae1] font-bold">ยกเลิก</button><button type="submit" className="min-h-12 rounded-xl bg-[#30265f] font-black text-white">บันทึกการตั้งค่า</button></div>
    </form>
  </div>
}

function SettingsModal({ teams, names, mode, numberMode, totalQuestions, currentQuestion, onCancel, onApply }) {
  const [draftNames, setDraftNames] = useState(names)
  const [draftMode, setDraftMode] = useState(mode)
  const [draftNumberMode, setDraftNumberMode] = useState(numberMode)
  const [draftTotal, setDraftTotal] = useState(totalQuestions)
  return <div className="fixed inset-0 z-30 grid place-items-center overflow-y-auto bg-[#17231d]/65 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="settings-title">
    <form onSubmit={(event) => { event.preventDefault(); onApply(draftNames, draftMode, draftNumberMode, draftTotal) }} className="w-full max-w-2xl rounded-[28px] bg-white p-6 shadow-2xl">
      <div className="flex items-center gap-3"><div className="grid size-12 place-items-center rounded-2xl bg-[#e8f1ec] text-[#193b2b]"><Settings size={26}/></div><div><p className="text-xs font-black uppercase tracking-wider text-[#718078]">Game settings</p><h2 id="settings-title" className="text-2xl font-black">ตั้งชื่อกลุ่มและเลือกโหมด</h2></div></div>
      <p className="mt-5 text-sm font-black text-[#4e5a53]">ชื่อกลุ่ม</p>
      <div className="mt-2 grid grid-cols-2 gap-3">{teams.map((team, index) => <label key={team.name} className="flex items-center gap-2 rounded-xl border-2 p-2" style={{ borderColor: team.color, backgroundColor: team.pale }}><span className="text-2xl">{team.animal}</span><input value={draftNames[index]} onChange={(event) => setDraftNames((current) => current.map((name, i) => i === index ? event.target.value : name))} maxLength={20} className="min-w-0 flex-1 rounded-lg bg-white/85 px-3 py-2 font-black outline-none" aria-label={`ชื่อกลุ่มที่ ${index + 1}`}/></label>)}</div>
      <p className="mt-5 text-sm font-black text-[#4e5a53]">รูปแบบโจทย์</p>
      <div className="mt-2 grid gap-3 sm:grid-cols-2">
        <button type="button" onClick={() => setDraftMode('same')} className={`rounded-2xl border-2 p-4 text-left ${draftMode === 'same' ? 'border-[#2878c8] bg-[#e8f2ff]' : 'border-[#ded8cb]'}`}><div className="flex items-center gap-2"><span className="text-2xl">🤝</span><strong className="text-lg">โจทย์เหมือนกัน</strong></div><p className="mt-1 text-sm font-bold text-[#68736d]">ทั้ง {teams.length} กลุ่มแก้โจทย์เดียวกัน เหมาะสำหรับเริ่มเล่น</p></button>
        <button type="button" onClick={() => setDraftMode('different')} className={`rounded-2xl border-2 p-4 text-left ${draftMode === 'different' ? 'border-[#e76f2e] bg-[#fff0e7]' : 'border-[#ded8cb]'}`}><div className="flex items-center gap-2"><span className="text-2xl">🔥</span><strong className="text-lg">โจทย์แตกต่างกัน</strong></div><p className="mt-1 text-sm font-bold text-[#68736d]">แต่ละกลุ่มได้โจทย์ของตัวเอง เพิ่มความท้าทาย</p></button>
      </div>
      <p className="mt-5 text-sm font-black text-[#4e5a53]">จำนวนข้อ</p>
      <div className="mt-2 grid grid-cols-4 gap-2">{QUESTION_COUNT_OPTIONS.map((count) => {
        const unavailable = count < currentQuestion
        return <button type="button" key={count} disabled={unavailable} onClick={() => setDraftTotal(count)} className={`min-h-12 rounded-xl border-2 text-lg font-black ${draftTotal === count ? 'border-[#193b2b] bg-[#e8f1ec] text-[#193b2b]' : 'border-[#ded8cb] bg-white text-[#68736d]'} disabled:cursor-not-allowed disabled:opacity-30`}>{count} ข้อ</button>
      })}</div>
      <p className="mt-5 text-sm font-black text-[#4e5a53]">ชนิดของจำนวน</p>
      <div className="mt-2 grid gap-3 sm:grid-cols-2">
        <button type="button" onClick={() => setDraftNumberMode('positive')} className={`rounded-2xl border-2 p-4 text-left ${draftNumberMode === 'positive' ? 'border-[#249263] bg-[#e8f7ef]' : 'border-[#ded8cb]'}`}><div className="flex items-center gap-2"><span className="text-2xl">🌱</span><strong className="text-lg">จำนวนบวก</strong></div><p className="mt-1 text-sm font-bold text-[#68736d]">เลือกตัวเลข 1 ถึง 10</p></button>
        <button type="button" onClick={() => setDraftNumberMode('integers')} className={`rounded-2xl border-2 p-4 text-left ${draftNumberMode === 'integers' ? 'border-[#8459c4] bg-[#f1ebfb]' : 'border-[#ded8cb]'}`}><div className="flex items-center gap-2"><span className="text-2xl">➕➖</span><strong className="text-lg">จำนวนเต็มแบบผสม</strong></div><p className="mt-1 text-sm font-bold text-[#68736d]">มีจำนวนติดลบ ตั้งแต่ −6 ถึง 6</p></button>
      </div>
      <p className="mt-3 rounded-xl bg-[#fff4d9] px-3 py-2 text-xs font-bold text-[#77551e]">เปลี่ยนโหมดระหว่างเล่นได้ เลขข้อ คะแนน และสมาชิกจะนับต่อ โดยล้างเฉพาะคำตอบของข้อปัจจุบัน</p>
      <div className="mt-5 grid grid-cols-2 gap-3"><button type="button" onClick={onCancel} className="min-h-12 rounded-xl bg-[#eeeae1] font-bold">ยกเลิก</button><button type="submit" className="min-h-12 rounded-xl bg-[#193b2b] font-black text-white">บันทึกการตั้งค่า</button></div>
    </form>
  </div>
}

function MemberModal({ team, onCancel, onAdd }) {
  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState(MEMBER_EMOJIS[0])
  const submit = (event) => {
    event.preventDefault()
    const cleanName = name.trim()
    if (cleanName) onAdd(cleanName, emoji)
  }
  return <div className="fixed inset-0 z-30 grid place-items-center bg-[#17231d]/65 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="member-title">
    <form onSubmit={submit} className="w-full max-w-md rounded-[28px] bg-white p-6 shadow-2xl">
      <div className="flex items-center gap-3"><div className="grid size-12 place-items-center rounded-2xl text-3xl" style={{ backgroundColor: team.pale }}>{team.animal}</div><div><p className="text-xs font-black uppercase tracking-wider" style={{ color: team.color }}>{team.name}</p><h2 id="member-title" className="text-2xl font-black">เพิ่มสมาชิก</h2></div></div>
      <label className="mt-5 block text-sm font-black text-[#4e5a53]">ชื่อสมาชิก</label>
      <input autoFocus value={name} onChange={(event) => setName(event.target.value)} maxLength={24} placeholder="เช่น น้องมิน" className="mt-2 min-h-12 w-full rounded-xl border-2 border-[#d7d2c8] px-4 text-lg font-bold outline-none focus:border-[#40755b]" />
      <p className="mt-5 text-sm font-black text-[#4e5a53]">เลือกอิโมจิประจำตัว</p>
      <div className="mt-2 grid grid-cols-6 gap-2">{MEMBER_EMOJIS.map((item) => <button type="button" key={item} onClick={() => setEmoji(item)} aria-pressed={emoji === item} className={`grid aspect-square place-items-center rounded-xl border-2 text-2xl ${emoji === item ? 'border-[#193b2b] bg-[#e9f2ed] shadow-sm' : 'border-[#e3ded4] bg-[#faf8f3]'}`}>{item}</button>)}</div>
      <div className="mt-6 grid grid-cols-2 gap-3"><button type="button" onClick={onCancel} className="min-h-12 rounded-xl bg-[#eeeae1] font-bold">ยกเลิก</button><button type="submit" disabled={!name.trim()} className="flex min-h-12 items-center justify-center gap-2 rounded-xl font-black text-white disabled:opacity-35" style={{ backgroundColor: team.color }}><UserPlus size={18}/> เพิ่มสมาชิก</button></div>
    </form>
  </div>
}

function QuestionBanner({ question, index, totalQuestions, revealed, mode, numberMode }) {
  return <section className="flex min-h-[116px] items-center justify-between gap-4 rounded-[24px] bg-[#193b2b] px-5 py-4 text-white shadow-lg">
    <div className="shrink-0"><p className="text-xs font-bold text-[#b8d2c4]">ข้อ {index + 1}/{totalQuestions}</p><h2 className="mt-1 text-lg font-black">หาจำนวน 2 จำนวน</h2><span className="mt-1 inline-block rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold text-[#c8d9d0]">{numberMode === 'integers' ? 'จำนวนเต็ม + / −' : 'จำนวนบวก'}</span></div>
    {mode === 'same' ? <><div className="flex flex-1 flex-wrap items-center justify-center gap-2"><div className="rounded-xl bg-white/10 px-4 py-2 text-sm">คูณกันได้ <strong className="ml-2 text-3xl text-[#ffc45d]">{question.product}</strong></div><span className="font-black text-white/50">และ</span><div className="rounded-xl bg-white/10 px-4 py-2 text-sm">บวกกันได้ <strong className="ml-2 text-3xl text-[#ffc45d]">{question.sum}</strong></div></div><div className={`min-w-32 rounded-xl px-4 py-2 text-center ${revealed ? 'pop bg-[#ffc45d] text-[#39270a]' : 'bg-white/10 text-[#c8d9d0]'}`}><p className="text-[10px] font-black uppercase">{revealed ? 'เฉลย' : 'โหมดเดียวกัน'}</p><strong className="text-xl">{revealed ? `${question.m} และ ${question.n}` : '???'}</strong></div></> : <div className="flex flex-1 items-center justify-center gap-3 rounded-xl bg-white/10 px-4 py-3"><span className="text-3xl">🔥</span><div><p className="font-black text-[#ffc45d]">โหมดท้าทาย</p><p className="text-sm font-bold text-[#c8d9d0]">แต่ละกลุ่มดูโจทย์ของตัวเองบนการ์ด</p></div></div>}
  </section>
}

function TeamCard({ team, question, showQuestion, integerMode, answer, choices, revealed, correct, onSelect }) {
  return <article className={`relative overflow-hidden rounded-[22px] border-2 p-3 shadow-sm ${revealed ? (correct ? 'answer-correct ring-4 ring-[#52b77d]/30' : 'answer-wrong opacity-85') : ''}`} style={{ borderColor: team.color, backgroundColor: team.pale }}>
    <div className="mb-2 flex items-center justify-between"><div className="flex items-center gap-2"><span className="text-2xl" role="img">{team.animal}</span><h3 className="text-lg font-black" style={{ color: team.color }}>{team.name}</h3></div><div className="flex items-center gap-1.5"><span className="grid size-8 place-items-center rounded-lg bg-white text-lg font-black" style={{ color: team.color }}>{answer[0] ?? '?'}</span><span className="font-black" style={{ color: team.color }}>×</span><span className="grid size-8 place-items-center rounded-lg bg-white text-lg font-black" style={{ color: team.color }}>{answer[1] ?? '?'}</span><span className={`ml-1 rounded-full px-2 py-1 text-[10px] font-black ${revealed ? (correct ? 'bg-[#17613e] text-white' : 'bg-[#b84f37] text-white') : answer.length === 2 ? 'bg-white text-[#3f5b4c]' : 'bg-black/5 text-[#6f766f]'}`}>{revealed ? (correct ? 'ถูก +1' : 'ยังไม่ถูก') : answer.length === 2 ? 'พร้อม' : 'เลือก 2 ตัว'}</span></div></div>
    {showQuestion && <div className="mb-2 flex items-center justify-center gap-2 rounded-xl bg-white/65 px-2 py-1.5 text-xs font-bold"><span>คูณได้ <strong className="text-lg" style={{ color: team.color }}>{question.product}</strong></span><span className="text-black/25">•</span><span>บวกได้ <strong className="text-lg" style={{ color: team.color }}>{question.sum}</strong></span>{revealed && <span className="ml-1 rounded-lg bg-white px-2 py-1 font-black" style={{ color: team.color }}>เฉลย {question.m}, {question.n}</span>}</div>}
    <div className={`grid gap-1.5 ${integerMode ? 'grid-cols-7' : 'grid-cols-5'}`}>
      {choices.map((number) => {
        const selected = answer.includes(number)
        return <button key={number} onClick={() => onSelect(number)} disabled={revealed} aria-pressed={selected} className={`team-number min-h-10 rounded-xl border-2 text-lg font-black transition active:translate-y-0.5 ${selected ? 'text-white shadow-sm' : `border-white bg-white/80 ${number < 0 ? 'text-[#b23f35]' : 'text-[#29362f]'} hover:bg-white`} disabled:cursor-default`} style={selected ? { backgroundColor: team.color, borderColor: team.color } : undefined}>{number}</button>
      })}
    </div>
  </article>
}

function resultText(answers, questions, teamNames, teams = TEAMS) {
  const winners = teams.map((_, index) => index).filter((index) => isCorrect(answers[index], questions[index])).map((index) => teamNames[index])
  return winners.length ? `${winners.join(', ')} ได้กลุ่มละ 1 คะแนน` : 'ข้อนี้ยังไม่มีกลุ่มตอบถูก'
}

function ConfirmReset({ onCancel, onConfirm }) {
  return <div className="fixed inset-0 z-20 grid place-items-center bg-[#17231d]/60 p-4 backdrop-blur-sm"><div className="w-full max-w-sm rounded-[28px] bg-white p-6 text-center shadow-2xl"><RotateCcw className="mx-auto text-[#d76824]" size={38}/><h2 className="mt-3 text-2xl font-black">รีเซตคะแนนทั้งหมด?</h2><p className="mt-2 text-[#69716c]">คะแนนของทุกทีมในทุกกิจกรรมจะกลับเป็น 0 แต่โจทย์ปัจจุบันยังอยู่เหมือนเดิม</p><div className="mt-5 grid grid-cols-2 gap-3"><button onClick={onCancel} className="min-h-12 rounded-xl bg-[#eeeae1] font-bold">ยกเลิก</button><button onClick={onConfirm} className="min-h-12 rounded-xl bg-[#d85e35] font-bold text-white">รีเซตคะแนน</button></div></div></div>
}

function Results({ teams, scores, members, teamNames, totalQuestions, onReset, onLeave, activityName = 'คู่คูณชวนคิด' }) {
  const top = Math.max(...scores)
  const winnerIndexes = teams.map((_, index) => index).filter((index) => scores[index] === top)
  return <main className="paper-grid grid min-h-screen place-items-center p-5">
    <div className="w-full max-w-4xl text-center">
      <Trophy className="mx-auto text-[#d88b20]" size={64}/><p className="mt-3 font-black text-[#a76c1d]">{activityName} · จบครบ {totalQuestions} ข้อ</p><h1 className="text-5xl font-black text-[#193b2b]">เก่งมากทุกทีม!</h1>
      <p className="mt-2 text-lg font-bold text-[#647069]">ผู้ชนะคือ {winnerIndexes.map((index) => `${teams[index].animal} ${teamNames[index]}`).join(' และ ')} · {top} คะแนน</p>
      <div className="mt-7 grid grid-cols-2 gap-3 lg:grid-cols-3">{teams.map((team, index) => <div key={team.name} className="rounded-3xl border-2 p-5" style={{ backgroundColor: team.pale, borderColor: team.color }}><div className="text-5xl">{team.animal}</div><h2 className="mt-2 font-black" style={{ color: team.color }}>{teamNames[index]}</h2><p className="text-4xl font-black" style={{ color: team.color }}>{scores[index]}</p><div className="mt-3 space-y-1">{members[index].map((member) => <div key={member.id} className="flex items-center rounded-lg bg-white/70 px-2 py-1 text-xs font-bold"><span className="mr-1">{member.emoji}</span><span className="flex-1 truncate text-left">{member.name}</span><strong style={{ color: team.color }}>{scores[index]}</strong></div>)}</div></div>)}</div>
      <div className="mt-7 flex flex-wrap justify-center gap-3">
        <button onClick={onLeave} className="inline-flex min-h-14 items-center gap-2 rounded-2xl border-2 border-[#cfc8bb] bg-white px-6 text-lg font-black text-[#59645e]"><ArrowLeft/> กลับหน้าสร้างห้อง</button>
        <button onClick={onReset} className="inline-flex min-h-14 items-center gap-2 rounded-2xl bg-[#193b2b] px-8 text-lg font-black text-white"><RotateCcw/> เล่นอีกครั้ง</button>
      </div>
    </div>
  </main>
}
