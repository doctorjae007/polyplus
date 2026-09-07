import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, Check, ChevronRight, Cloud, CloudOff, Copy, Eye, GraduationCap, LoaderCircle, LogOut, Pause, Play, Plus, RotateCcw, Settings, Smartphone, Sparkles, Trash2, Trophy, UserPlus, Users, Wifi } from 'lucide-react'
import { FACTOR_QUESTIONS, MIXED_FACTOR_QUESTIONS, POSITIVE_FACTOR_QUESTIONS, FactorPlayArea, isFactorCorrect } from './FactorDetective'
import { GUIDED_QUESTION_COUNT, MIXED_GUIDED_QUESTIONS, POSITIVE_GUIDED_QUESTIONS, GuidedPlayArea, isGuidedCorrect } from './GuidedFactor'
import { DISTRIBUTIVE_QUESTIONS, DistributivePlayArea, blankDistributiveAnswers, isDistributiveCorrect, isDistributiveReady } from './DistributiveIntro'
import { FeedbackEffects, playFeedbackSound } from './FeedbackEffects'

const TEAMS = [
  { name: 'ทีมฟ้า', animal: '🐬', color: '#2878c8', pale: '#ddecff' },
  { name: 'ทีมส้ม', animal: '🦊', color: '#e76f2e', pale: '#ffe5d6' },
  { name: 'ทีมเขียว', animal: '🐢', color: '#249263', pale: '#d9f3e5' },
  { name: 'ทีมม่วง', animal: '🦄', color: '#8459c4', pale: '#eadffc' },
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

const blankAnswers = () => TEAMS.map(() => [])
const blankFactorAnswers = () => TEAMS.map(() => [null, null, null, null])
const blankGuidedAnswers = () => TEAMS.map(() => [null, null])
const blankMembers = () => TEAMS.map(() => [])
const STORAGE_KEY = 'factor-rally-state-v4'
const CLASSROOM_SESSION_KEY = 'factor-rally-classroom-session-v1'
const DEVICE_KEY = 'factor-rally-device-v1'
const MEMBER_EMOJIS = ['😀', '😎', '🐯', '🐰', '🐼', '🦁', '🐸', '🐵', '🦋', '⭐', '🚀', '⚽']
const isCorrect = (answer, q) => answer.length === 2 && answer[0] * answer[1] === q.product && answer[0] + answer[1] === q.sum

export default function App() {
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
  }
  if (session?.role === 'teacher') return <TeacherGame classroom={session} onLeaveRoom={closeSession}/>
  if (session?.role === 'student') return <StudentRoom session={session} onLeaveRoom={closeSession}/>
  if (session?.role === 'solo') return <TeacherGame onLeaveRoom={closeSession}/>
  return <ClassroomHome onOpenSession={openSession}/>
}

function TeacherGame({ classroom, onLeaveRoom }) {
  const [roomStatus, setRoomStatus] = useState('lobby')
  const [roomMeta, setRoomMeta] = useState(null)
  const [activity, setActivity] = useState('intro')
  const [introQuestionIndex, setIntroQuestionIndex] = useState(0)
  const [introAnswers, setIntroAnswers] = useState(blankDistributiveAnswers)
  const [introScores, setIntroScores] = useState(() => TEAMS.map(() => 0))
  const [introGameMode, setIntroGameMode] = useState('same')
  const [introRevealed, setIntroRevealed] = useState(false)
  const [introFinished, setIntroFinished] = useState(false)
  const [questionIndex, setQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState(blankAnswers)
  const [scores, setScores] = useState(() => TEAMS.map(() => 0))
  const [factorQuestionIndex, setFactorQuestionIndex] = useState(0)
  const [factorAnswers, setFactorAnswers] = useState(blankFactorAnswers)
  const [factorScores, setFactorScores] = useState(() => TEAMS.map(() => 0))
  const [factorGameMode, setFactorGameMode] = useState('same')
  const [factorNumberMode, setFactorNumberMode] = useState('mixed')
  const [factorRevealed, setFactorRevealed] = useState(false)
  const [factorFinished, setFactorFinished] = useState(false)
  const [guidedQuestionIndex, setGuidedQuestionIndex] = useState(0)
  const [guidedAnswers, setGuidedAnswers] = useState(blankGuidedAnswers)
  const [guidedScores, setGuidedScores] = useState(() => TEAMS.map(() => 0))
  const [guidedGameMode, setGuidedGameMode] = useState('same')
  const [guidedNumberMode, setGuidedNumberMode] = useState('positive')
  const [guidedRevealed, setGuidedRevealed] = useState(false)
  const [guidedFinished, setGuidedFinished] = useState(false)
  const [feedback, setFeedback] = useState(null)
  const [members, setMembers] = useState(blankMembers)
  const [teamNames, setTeamNames] = useState(() => TEAMS.map((team) => team.name))
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
  const questionBank = numberMode === 'integers' ? INTEGER_QUESTIONS : QUESTIONS
  const teamQuestions = TEAMS.map((_, index) => gameMode === 'same' ? questionBank[questionIndex] : questionBank[(questionIndex + index * 4) % questionBank.length])
  const factorQuestionBank = factorNumberMode === 'mixed' ? MIXED_FACTOR_QUESTIONS : POSITIVE_FACTOR_QUESTIONS
  const factorTeamQuestions = TEAMS.map((_, index) => factorGameMode === 'same' ? factorQuestionBank[factorQuestionIndex] : factorQuestionBank[(factorQuestionIndex + index * 3) % factorQuestionBank.length])
  const guidedQuestionBank = guidedNumberMode === 'mixed' ? MIXED_GUIDED_QUESTIONS : POSITIVE_GUIDED_QUESTIONS
  const guidedTeamQuestions = TEAMS.map((_, index) => guidedGameMode === 'same' ? guidedQuestionBank[guidedQuestionIndex] : guidedQuestionBank[(guidedQuestionIndex + index * 3) % guidedQuestionBank.length])
  const introTeamQuestions = TEAMS.map((_, index) => introGameMode === 'same' ? DISTRIBUTIVE_QUESTIONS[introQuestionIndex] : DISTRIBUTIVE_QUESTIONS[(introQuestionIndex + index * 3) % DISTRIBUTIVE_QUESTIONS.length])
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
      setAnswers(invalidIndex ? blankAnswers() : (state.answers ?? blankAnswers()))
      setScores(state.scores ?? TEAMS.map(() => 0))
      setActivity(['intro', 'pairs', 'guided', 'factor'].includes(state.activity) ? state.activity : 'intro')
      setIntroQuestionIndex((state.introQuestionIndex ?? 0) < DISTRIBUTIVE_QUESTIONS.length ? (state.introQuestionIndex ?? 0) : 0)
      const savedIntroAnswers = Array.isArray(state.introAnswers) && state.introAnswers.length === TEAMS.length && state.introAnswers.every(Array.isArray)
        ? state.introAnswers
        : blankDistributiveAnswers()
      setIntroAnswers(savedIntroAnswers)
      setIntroScores(state.introScores ?? TEAMS.map(() => 0))
      setIntroGameMode(state.introGameMode === 'different' ? 'different' : 'same')
      setIntroRevealed(Boolean(state.introRevealed))
      setIntroFinished(Boolean(state.introFinished))
      setFactorQuestionIndex((state.factorQuestionIndex ?? 0) < FACTOR_QUESTIONS.length ? (state.factorQuestionIndex ?? 0) : 0)
      const savedFactorAnswers = Array.isArray(state.factorAnswers) && state.factorAnswers.length === TEAMS.length && state.factorAnswers.every((answer) => Array.isArray(answer) && answer.length === 4)
        ? state.factorAnswers
        : blankFactorAnswers()
      setFactorAnswers(savedFactorAnswers)
      setFactorScores(state.factorScores ?? TEAMS.map(() => 0))
      setFactorGameMode(state.factorGameMode === 'different' ? 'different' : 'same')
      setFactorNumberMode(state.factorNumberMode === 'positive' ? 'positive' : 'mixed')
      setFactorRevealed(Boolean(state.factorRevealed))
      setFactorFinished(Boolean(state.factorFinished))
      setGuidedQuestionIndex((state.guidedQuestionIndex ?? 0) < GUIDED_QUESTION_COUNT ? (state.guidedQuestionIndex ?? 0) : 0)
      const savedGuidedAnswers = Array.isArray(state.guidedAnswers) && state.guidedAnswers.length === TEAMS.length && state.guidedAnswers.every((answer) => Array.isArray(answer) && answer.length === 2) ? state.guidedAnswers : blankGuidedAnswers()
      setGuidedAnswers(savedGuidedAnswers)
      setGuidedScores(state.guidedScores ?? TEAMS.map(() => 0))
      setGuidedGameMode(state.guidedGameMode === 'different' ? 'different' : 'same')
      setGuidedNumberMode(state.guidedNumberMode === 'mixed' ? 'mixed' : 'positive')
      setGuidedRevealed(Boolean(state.guidedRevealed))
      setGuidedFinished(Boolean(state.guidedFinished))
      setMembers(state.members ?? blankMembers())
      setTeamNames(state.teamNames ?? TEAMS.map((team) => team.name))
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
    const state = { roomStatus, activity, introQuestionIndex, introAnswers, introScores, introGameMode, introRevealed, introFinished, questionIndex, answers, scores, factorQuestionIndex, factorAnswers, factorScores, factorGameMode, factorNumberMode, factorRevealed, factorFinished, guidedQuestionIndex, guidedAnswers, guidedScores, guidedGameMode, guidedNumberMode, guidedRevealed, guidedFinished, members, teamNames, gameMode, numberMode, totalQuestions, revealed, finished }
    if (!classroom) localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    setSaveStatus('saving')
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(classroom ? `/api/rooms/${classroom.code}` : '/api/game-state', { method: 'PUT', headers: { 'Content-Type': 'application/json', ...(classroom ? { Authorization: `Bearer ${classroom.token}` } : {}) }, body: JSON.stringify(state) })
        if (!response.ok) throw new Error('save failed')
        setSaveStatus('saved')
      } catch { setSaveStatus('offline') }
    }, 450)
    return () => clearTimeout(timer)
  }, [hydrated, roomStatus, activity, introQuestionIndex, introAnswers, introScores, introGameMode, introRevealed, introFinished, questionIndex, answers, scores, factorQuestionIndex, factorAnswers, factorScores, factorGameMode, factorNumberMode, factorRevealed, factorFinished, guidedQuestionIndex, guidedAnswers, guidedScores, guidedGameMode, guidedNumberMode, guidedRevealed, guidedFinished, members, teamNames, gameMode, numberMode, totalQuestions, revealed, finished, classroom?.code, classroom?.token])

  useEffect(() => {
    if (!hydrated || !classroom) return undefined
    const syncAnswers = (setter, incoming) => {
      if (!Array.isArray(incoming)) return
      setter((current) => JSON.stringify(current) === JSON.stringify(incoming) ? current : incoming)
    }
    const poll = async () => {
      try {
        const response = await fetch(`/api/rooms/${classroom.code}`, { headers: { Authorization: `Bearer ${classroom.token}` } })
        if (response.status === 404 || response.status === 401) return onLeaveRoom()
        if (!response.ok) return
        const payload = await response.json()
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
    const results = TEAMS.map((_, index) => isDistributiveCorrect(introAnswers[index], introTeamQuestions[index]))
    setIntroScores((current) => current.map((score, index) => score + (results[index] ? 1 : 0)))
    setIntroRevealed(true)
    playFeedbackSound(results)
    setFeedback({ id: Date.now(), results })
  }

  const nextIntroQuestion = () => {
    if (introQuestionIndex === DISTRIBUTIVE_QUESTIONS.length - 1) return setIntroFinished(true)
    setIntroQuestionIndex((value) => value + 1)
    setIntroAnswers(blankDistributiveAnswers())
    setIntroRevealed(false)
  }

  const resetIntro = () => {
    setIntroQuestionIndex(0); setIntroAnswers(blankDistributiveAnswers()); setIntroScores(TEAMS.map(() => 0))
    setIntroRevealed(false); setIntroFinished(false); setShowReset(false)
  }

  const reveal = () => {
    if (!allReady || revealed) return
    const results = TEAMS.map((_, index) => isCorrect(answers[index], teamQuestions[index]))
    setScores((current) => current.map((score, index) => score + (results[index] ? 1 : 0)))
    setRevealed(true)
    playFeedbackSound(results)
    setFeedback({ id: Date.now(), results })
  }

  const nextQuestion = () => {
    if (questionIndex === totalQuestions - 1) return setFinished(true)
    setQuestionIndex((value) => value + 1)
    setAnswers(blankAnswers())
    setRevealed(false)
  }

  const reset = () => {
    setQuestionIndex(0); setAnswers(blankAnswers()); setScores(TEAMS.map(() => 0))
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
    const results = TEAMS.map((_, index) => isFactorCorrect(factorAnswers[index], factorTeamQuestions[index]))
    setFactorScores((current) => current.map((score, index) => score + (results[index] ? 1 : 0)))
    setFactorRevealed(true)
    playFeedbackSound(results)
    setFeedback({ id: Date.now(), results })
  }

  const nextFactorQuestion = () => {
    if (factorQuestionIndex === FACTOR_QUESTIONS.length - 1) return setFactorFinished(true)
    setFactorQuestionIndex((value) => value + 1)
    setFactorAnswers(blankFactorAnswers())
    setFactorRevealed(false)
  }

  const resetFactor = () => {
    setFactorQuestionIndex(0); setFactorAnswers(blankFactorAnswers()); setFactorScores(TEAMS.map(() => 0))
    setFactorRevealed(false); setFactorFinished(false); setShowReset(false)
  }

  const selectGuidedNumber = (teamIndex, slot, number) => {
    if (guidedRevealed) return
    setGuidedAnswers((current) => current.map((answer, index) => index === teamIndex ? answer.map((value, answerSlot) => answerSlot === slot ? number : value) : answer))
  }

  const revealGuided = () => {
    if (guidedRevealed || !guidedAnswers.every((answer) => answer.filter(Number.isFinite).length === 2)) return
    const results = TEAMS.map((_, index) => isGuidedCorrect(guidedAnswers[index], guidedTeamQuestions[index]))
    setGuidedScores((current) => current.map((score, index) => score + (results[index] ? 1 : 0)))
    setGuidedRevealed(true)
    playFeedbackSound(results)
    setFeedback({ id: Date.now(), results })
  }

  const nextGuidedQuestion = () => {
    if (guidedQuestionIndex === GUIDED_QUESTION_COUNT - 1) return setGuidedFinished(true)
    setGuidedQuestionIndex((value) => value + 1)
    setGuidedAnswers(blankGuidedAnswers())
    setGuidedRevealed(false)
  }

  const resetGuided = () => {
    setGuidedQuestionIndex(0); setGuidedAnswers(blankGuidedAnswers()); setGuidedScores(TEAMS.map(() => 0))
    setGuidedRevealed(false); setGuidedFinished(false); setShowReset(false)
  }

  const applyIntroSettings = (names, mode) => {
    setTeamNames(names.map((name, index) => name.trim() || TEAMS[index].name))
    if (mode !== introGameMode) {
      setIntroGameMode(mode)
      setIntroAnswers(blankDistributiveAnswers())
      setIntroRevealed(false)
      if (introRevealed) {
        if (introQuestionIndex >= DISTRIBUTIVE_QUESTIONS.length - 1) setIntroFinished(true)
        else setIntroQuestionIndex((value) => value + 1)
      }
    }
    setShowSettings(false)
  }

  const applyFactorSettings = (names, mode, nextNumberMode) => {
    setTeamNames(names.map((name, index) => name.trim() || TEAMS[index].name))
    if (mode !== factorGameMode || nextNumberMode !== factorNumberMode) {
      setFactorGameMode(mode)
      setFactorNumberMode(nextNumberMode)
      setFactorAnswers(blankFactorAnswers())
      setFactorRevealed(false)
      if (factorRevealed) {
        if (factorQuestionIndex >= FACTOR_QUESTIONS.length - 1) setFactorFinished(true)
        else setFactorQuestionIndex((value) => value + 1)
      }
    }
    setShowSettings(false)
  }

  const applyGuidedSettings = (names, mode, nextNumberMode) => {
    setTeamNames(names.map((name, index) => name.trim() || TEAMS[index].name))
    if (mode !== guidedGameMode || nextNumberMode !== guidedNumberMode) {
      setGuidedGameMode(mode)
      setGuidedNumberMode(nextNumberMode)
      setGuidedAnswers(blankGuidedAnswers())
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

  const removeMember = (teamIndex, memberId) => {
    setMembers((current) => current.map((list, index) => index === teamIndex ? list.filter((member) => member.id !== memberId) : list))
  }

  const applySettings = (names, mode, nextNumberMode, nextTotalQuestions) => {
    setTeamNames(names.map((name, index) => name.trim() || TEAMS[index].name))
    if (mode !== gameMode || nextNumberMode !== numberMode || nextTotalQuestions !== totalQuestions) {
      setGameMode(mode)
      setNumberMode(nextNumberMode)
      setTotalQuestions(nextTotalQuestions)
      setAnswers(blankAnswers())
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
    if (response.ok) setRoomMeta((current) => ({ ...current, occupiedTeams: (current?.occupiedTeams ?? []).filter((index) => index !== teamIndex) }))
  }

  if (!hydrated) return <main className="paper-grid grid min-h-screen place-items-center"><div className="text-center text-[#193b2b]"><LoaderCircle className="mx-auto animate-spin" size={44}/><p className="mt-3 font-black">กำลังโหลดห้องเรียน…</p></div></main>
  if (activity === 'intro' && introFinished) return <Results scores={introScores} members={members} teamNames={teamNames} totalQuestions={DISTRIBUTIVE_QUESTIONS.length} onReset={resetIntro} activityName="แจกแจงให้แจ่ม" />
  if (activity === 'pairs' && finished) return <Results scores={scores} members={members} teamNames={teamNames} totalQuestions={totalQuestions} onReset={reset} />
  if (activity === 'guided' && guidedFinished) return <Results scores={guidedScores} members={members} teamNames={teamNames} totalQuestions={GUIDED_QUESTION_COUNT} onReset={resetGuided} activityName="คู่คิดพิชิตวงเล็บ" />
  if (activity === 'factor' && factorFinished) return <Results scores={factorScores} members={members} teamNames={teamNames} totalQuestions={FACTOR_QUESTIONS.length} onReset={resetFactor} activityName="นักสืบตัวประกอบ" />

  const activeScores = activity === 'intro' ? introScores : activity === 'factor' ? factorScores : activity === 'guided' ? guidedScores : scores
  const activeAnswers = activity === 'intro' ? introAnswers : activity === 'factor' ? factorAnswers : activity === 'guided' ? guidedAnswers : answers
  const activeQuestions = activity === 'intro' ? introTeamQuestions : activity === 'factor' ? factorTeamQuestions : activity === 'guided' ? guidedTeamQuestions : teamQuestions
  const activeTotal = activity === 'intro' ? DISTRIBUTIVE_QUESTIONS.length : activity === 'factor' ? FACTOR_QUESTIONS.length : activity === 'guided' ? GUIDED_QUESTION_COUNT : totalQuestions
  const activeRevealed = activity === 'intro' ? introRevealed : activity === 'factor' ? factorRevealed : activity === 'guided' ? guidedRevealed : revealed
  const activeReset = activity === 'intro' ? resetIntro : activity === 'factor' ? resetFactor : activity === 'guided' ? resetGuided : reset
  const activeCorrect = activity === 'intro' ? isDistributiveCorrect : activity === 'factor' ? isFactorCorrect : activity === 'guided' ? isGuidedCorrect : isCorrect
  const activeAnswerSize = activity === 'factor' ? 4 : 2
  const activeReady = activity === 'intro' ? isDistributiveReady : null
  const activityTitle = activity === 'intro' ? 'แจกแจงให้แจ่ม' : activity === 'factor' ? 'นักสืบตัวประกอบ' : activity === 'guided' ? 'คู่คิดพิชิตวงเล็บ' : 'คู่คูณชวนคิด'
  const activityIcon = activity === 'intro' ? '⇄' : activity === 'factor' ? '🔎' : activity === 'guided' ? '🧩' : '×'

  return <main className="paper-grid min-h-screen p-3 lg:px-4 lg:py-1">
    <div className="game-shell mx-auto max-w-[1600px] gap-4">
      <ScoreSidebar scores={activeScores} answers={activeAnswers} members={members} teamNames={teamNames} questions={activeQuestions} totalQuestions={activeTotal} revealed={activeRevealed} isAnswerCorrect={activeCorrect} isAnswerReady={activeReady} answerSize={activeAnswerSize} onAdd={setMemberTeam} onRemove={removeMember} />

      <div className="min-w-0">
        {classroom && <RoomControlBar code={classroom.code} status={roomStatus} occupiedTeams={roomMeta?.occupiedTeams ?? []} onToggle={() => setRoomStatus((status) => status === 'playing' ? 'lobby' : 'playing')} onUnlock={unlockTeam} onLeave={onLeaveRoom}/>}
        <header className="mb-3 flex min-h-12 flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3"><div className={`grid size-10 place-items-center rounded-xl text-xl font-black text-white ${activity === 'intro' ? 'bg-[#6d4317]' : activity === 'factor' ? 'bg-[#30265f]' : activity === 'guided' ? 'bg-[#174c63]' : 'bg-[#193b2b]'}`}>{activityIcon}</div><div><h1 className="text-xl font-black text-[#193b2b]">{activityTitle}</h1><p className="text-xs font-bold text-[#6d756f]">ทุกกลุ่มเลือกพร้อมกัน · ครูเฉลยครั้งเดียว</p></div></div>
          <div className="flex flex-wrap justify-end gap-2">
            <SaveStatus status={saveStatus}/>
            <div className="flex rounded-xl bg-white p-1 shadow-sm" aria-label="เลือกแบบฝึก">
              {[['intro', '1 แจกแจง'], ['pairs', '1.1 คู่คูณ'], ['guided', '1.2 คู่คิด'], ['factor', '2 นักสืบ']].map(([value, label]) => <button key={value} onClick={() => chooseActivity(value)} className={`min-h-8 rounded-lg px-2.5 text-xs font-black transition ${activity === value ? 'bg-[#ffd05a] text-[#473510]' : 'text-[#647069] hover:bg-[#f4f1e9]'}`}>{label}</button>)}
            </div>
            <button onClick={() => setShowSettings(true)} className="flex min-h-10 items-center gap-2 rounded-xl border border-[#d8d2c5] bg-white px-3 text-sm font-bold text-[#5c635e]"><Settings size={16}/> ตั้งค่าเกม</button>
            <button onClick={() => setShowReset(true)} className="flex min-h-10 items-center gap-2 rounded-xl border border-[#d8d2c5] bg-white px-3 text-sm font-bold text-[#5c635e]"><RotateCcw size={16}/> เริ่มใหม่</button>
          </div>
        </header>

        {activity === 'intro'
          ? <DistributivePlayArea teams={TEAMS} teamNames={teamNames} questions={introTeamQuestions} index={introQuestionIndex} answers={introAnswers} revealed={introRevealed} onSelect={selectIntroToken} onReveal={revealIntro} onNext={nextIntroQuestion}/>
          : activity === 'factor'
          ? <FactorPlayArea teams={TEAMS} teamNames={teamNames} questions={factorTeamQuestions} index={factorQuestionIndex} answers={factorAnswers} revealed={factorRevealed} numberMode={factorNumberMode} onSelect={selectFactorNumber} onReveal={revealFactor} onNext={nextFactorQuestion}/>
          : activity === 'guided'
            ? <GuidedPlayArea teams={TEAMS} teamNames={teamNames} questions={guidedTeamQuestions} index={guidedQuestionIndex} answers={guidedAnswers} revealed={guidedRevealed} numberMode={guidedNumberMode} onSelect={selectGuidedNumber} onReveal={revealGuided} onNext={nextGuidedQuestion}/>
          : <>
            <QuestionBanner question={question} index={questionIndex} totalQuestions={totalQuestions} revealed={revealed} mode={gameMode} numberMode={numberMode} />
            <section className="team-board-grid mt-3 grid gap-3" aria-label="คำตอบของทั้งสี่กลุ่ม">
              {TEAMS.map((team, index) => <TeamCard key={team.name} team={{ ...team, name: teamNames[index] }} question={teamQuestions[index]} showQuestion={gameMode === 'different'} integerMode={numberMode === 'integers'} answer={answers[index]} choices={choices} revealed={revealed} correct={revealed && isCorrect(answers[index], teamQuestions[index])} onSelect={(number) => selectNumber(index, number)} />)}
            </section>
            <div className="mt-3 flex items-center gap-3 rounded-2xl bg-white p-2 shadow-sm">
              <p className="hidden flex-1 pl-2 text-sm font-bold text-[#70776f] sm:block">{revealed ? resultText(answers, teamQuestions, teamNames) : `พร้อมแล้ว ${answers.filter((a) => a.length === 2).length}/4 กลุ่ม`}</p>
              <button onClick={revealed ? nextQuestion : reveal} disabled={!revealed && !allReady} className={`flex min-h-14 flex-1 items-center justify-center gap-2 rounded-xl px-6 text-lg font-black sm:max-w-md ${revealed ? 'bg-[#193b2b] text-white' : 'bg-[#ef9940] text-[#352111]'} disabled:cursor-not-allowed disabled:opacity-35`}>
                {revealed ? <>ข้อต่อไป <ChevronRight/></> : <><Eye/> ครูเฉลยพร้อมกัน</>}
              </button>
            </div>
          </>}
      </div>
    </div>
    {showReset && <ConfirmReset onCancel={() => setShowReset(false)} onConfirm={activeReset} />}
    <FeedbackEffects feedback={feedback} teams={TEAMS} teamNames={teamNames} onDone={() => setFeedback(null)} />
    {memberTeam !== null && <MemberModal team={{ ...TEAMS[memberTeam], name: teamNames[memberTeam] }} onCancel={() => setMemberTeam(null)} onAdd={addMember} />}
    {showSettings && (activity === 'pairs'
      ? <SettingsModal names={teamNames} mode={gameMode} numberMode={numberMode} totalQuestions={totalQuestions} currentQuestion={questionIndex + 1} onCancel={() => setShowSettings(false)} onApply={applySettings} />
      : <FactorSettingsModal
          names={teamNames}
          mode={activity === 'intro' ? introGameMode : activity === 'factor' ? factorGameMode : guidedGameMode}
          numberMode={activity === 'factor' ? factorNumberMode : guidedNumberMode}
          currentQuestion={(activity === 'intro' ? introQuestionIndex : activity === 'factor' ? factorQuestionIndex : guidedQuestionIndex) + 1}
          title={activity === 'intro' ? 'ตั้งค่าแจกแจงให้แจ่ม' : activity === 'factor' ? 'ตั้งค่านักสืบตัวประกอบ' : 'ตั้งค่าคู่คิดพิชิตวงเล็บ'}
          icon={activity === 'intro' ? '⇄' : activity === 'factor' ? '🔎' : '🧩'}
          showNumberMode={activity !== 'intro'}
          onCancel={() => setShowSettings(false)}
          onApply={activity === 'intro' ? applyIntroSettings : activity === 'factor' ? applyFactorSettings : applyGuidedSettings}
        />)}
  </main>
}

function ClassroomHome({ onOpenSession }) {
  const [code, setCode] = useState('')
  const [room, setRoom] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const createRoom = async () => {
    setLoading(true); setError('')
    try {
      const response = await fetch('/api/rooms', { method: 'POST' })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error)
      onOpenSession({ role: 'teacher', code: payload.code, token: payload.teacherToken })
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
    setLoading(true); setError('')
    let deviceId = localStorage.getItem(DEVICE_KEY)
    if (!deviceId) { deviceId = crypto.randomUUID(); localStorage.setItem(DEVICE_KEY, deviceId) }
    try {
      const response = await fetch(`/api/rooms/${room.code}/join`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ teamIndex, deviceId }) })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error)
      onOpenSession({ role: 'student', code: room.code, teamIndex, token: payload.playerToken })
    } catch { setError('กลุ่มนี้มีผู้เข้าแล้ว กรุณาเลือกกลุ่มอื่นหรือแจ้งครูให้ปลดล็อก') }
    finally { setLoading(false) }
  }

  return <main className="paper-grid grid min-h-screen place-items-center p-4">
    <section className="w-full max-w-4xl overflow-hidden rounded-[32px] bg-white shadow-2xl">
      <div className="bg-[#193b2b] px-6 py-7 text-white sm:px-10"><div className="flex items-center gap-4"><div className="grid size-14 place-items-center rounded-2xl bg-[#ffd05a] text-3xl">✦</div><div><p className="text-sm font-black text-[#b8d2c4]">FACTOR RALLY</p><h1 className="text-3xl font-black">ห้องเรียนแยกตัวประกอบ</h1></div></div></div>
      {!room ? <div className="grid gap-5 p-6 sm:grid-cols-2 sm:p-10">
        <div className="rounded-3xl border-2 border-[#cfe1d7] bg-[#edf8f1] p-6">
          <GraduationCap className="text-[#1f6a48]" size={42}/><h2 className="mt-3 text-2xl font-black text-[#193b2b]">สำหรับครู</h2><p className="mt-1 font-bold text-[#607068]">สร้างห้อง เลือกกิจกรรม และควบคุมการเฉลยจากจอหลัก</p>
          <button onClick={createRoom} disabled={loading} className="mt-6 flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#193b2b] text-lg font-black text-white disabled:opacity-50"><Users/> {loading ? 'กำลังสร้างห้อง…' : 'สร้างห้องใหม่'}</button>
        </div>
        <form onSubmit={findRoom} className="rounded-3xl border-2 border-[#f0d8ad] bg-[#fff8e8] p-6">
          <Smartphone className="text-[#9a5b18]" size={42}/><h2 className="mt-3 text-2xl font-black text-[#5a3915]">สำหรับนักเรียน</h2><p className="mt-1 font-bold text-[#796750]">ใส่รหัส 6 หลักที่ครูแสดงบนหน้าจอ</p>
          <input inputMode="numeric" value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="000000" aria-label="รหัสห้อง 6 หลัก" className="mt-5 min-h-14 w-full rounded-2xl border-2 border-[#dfc28f] bg-white px-4 text-center text-3xl font-black tracking-[.3em] outline-none focus:border-[#9a5b18]"/>
          <button disabled={loading} className="mt-3 min-h-14 w-full rounded-2xl bg-[#ef9940] text-lg font-black text-[#40250d] disabled:opacity-50">เข้าห้องเรียน</button>
        </form>
        <button onClick={() => onOpenSession({ role: 'solo' })} className="sm:col-span-2 text-sm font-black text-[#68736d] underline underline-offset-4">เล่นบนเครื่องเดียวแบบเดิม</button>
        {error && <p className="sm:col-span-2 rounded-xl bg-[#fff0eb] px-4 py-3 text-center font-black text-[#a33b2f]">{error}</p>}
      </div> : <div className="p-6 sm:p-10">
        <button onClick={() => { setRoom(null); setError('') }} className="flex items-center gap-1 font-black text-[#66736c]"><ArrowLeft size={18}/> เปลี่ยนรหัสห้อง</button>
        <div className="mt-4 text-center"><p className="text-sm font-black text-[#7a746b]">ห้อง {room.code}</p><h2 className="text-3xl font-black text-[#193b2b]">เลือกกลุ่มของคุณ</h2><p className="mt-1 font-bold text-[#6b746e]">หนึ่งมือถือประจำหนึ่งกลุ่ม</p></div>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">{TEAMS.map((team, index) => {
          const occupied = room.occupiedTeams.includes(index)
          return <button key={team.name} disabled={occupied || loading} onClick={() => joinTeam(index)} className="rounded-3xl border-2 p-5 text-center disabled:cursor-not-allowed disabled:grayscale" style={{ borderColor: team.color, backgroundColor: occupied ? '#eeeae1' : team.pale }}><span className="text-5xl">{team.animal}</span><strong className="mt-2 block text-lg" style={{ color: occupied ? '#777' : team.color }}>{room.teamNames[index]}</strong><span className="mt-1 block text-xs font-black text-[#6e756f]">{occupied ? 'มีผู้เข้าแล้ว' : 'เลือกกลุ่มนี้'}</span></button>
        })}</div>
        {error && <p className="mt-4 rounded-xl bg-[#fff0eb] px-4 py-3 text-center font-black text-[#a33b2f]">{error}</p>}
      </div>}
    </section>
  </main>
}

function RoomControlBar({ code, status, occupiedTeams, onToggle, onUnlock, onLeave }) {
  const [copied, setCopied] = useState(false)
  const copyCode = async () => { try { await navigator.clipboard.writeText(code); setCopied(true); window.setTimeout(() => setCopied(false), 1200) } catch {} }
  return <section className="mb-2 flex flex-wrap items-center gap-2 rounded-2xl bg-[#fff4d9] px-3 py-2 shadow-sm">
    <div className="flex items-center gap-2"><Wifi size={18} className="text-[#8b581c]"/><span className="text-xs font-black text-[#7b674e]">รหัสห้อง</span><strong className="text-2xl font-black tracking-[.16em] text-[#5d390f]">{code}</strong><button onClick={copyCode} className="grid size-9 place-items-center rounded-lg bg-white text-[#7c5425]" aria-label="คัดลอกรหัสห้อง"><Copy size={16}/></button>{copied && <span className="text-xs font-black text-[#27704b]">คัดลอกแล้ว</span>}</div>
    <div className="flex flex-1 flex-wrap justify-center gap-1">{TEAMS.map((team, index) => <button key={team.name} onClick={() => occupiedTeams.includes(index) && onUnlock(index)} className={`rounded-full px-2 py-1 text-xs font-black ${occupiedTeams.includes(index) ? 'bg-white' : 'bg-black/5 opacity-45'}`} style={{ color: team.color }} title={occupiedTeams.includes(index) ? 'แตะเพื่อปลดล็อกกลุ่ม' : 'ยังไม่มีผู้เข้า'}>{team.animal} {occupiedTeams.includes(index) ? 'เชื่อมต่อ' : 'ว่าง'}</button>)}</div>
    <button onClick={onToggle} className={`flex min-h-10 items-center gap-2 rounded-xl px-4 font-black ${status === 'playing' ? 'bg-[#fff] text-[#9b5220]' : 'bg-[#193b2b] text-white'}`}>{status === 'playing' ? <><Pause size={17}/> พักกิจกรรม</> : <><Play size={17}/> เริ่มกิจกรรม</>}</button>
    <button onClick={onLeave} className="grid size-10 place-items-center rounded-xl bg-white text-[#8e4b3c]" aria-label="ออกจากห้อง"><LogOut size={18}/></button>
  </section>
}

function StudentRoom({ session, onLeaveRoom }) {
  const [payload, setPayload] = useState(null)
  const [error, setError] = useState('')
  const sending = useRef(0)

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

  const updateAnswer = (nextAnswer) => {
    const answers = Array.isArray(state[key]) && state[key].length === 4 ? state[key].map((item) => [...item]) : blankAnswers()
    answers[teamIndex] = nextAnswer
    setPayload((current) => ({ ...current, state: { ...current.state, [key]: answers } }))
    sending.current += 1
    fetch(`/api/rooms/${session.code}/answer`, { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.token}` }, body: JSON.stringify({ activity, answer: nextAnswer }) })
      .catch(() => setError('ส่งคำตอบไม่สำเร็จ ระบบจะลองเชื่อมต่อใหม่'))
      .finally(() => { sending.current -= 1 })
  }
  const updateSlot = (slot, value, size) => {
    const next = answer.length === size ? [...answer] : Array(size).fill(null)
    next[slot] = value
    updateAnswer(next)
  }
  const selectPair = (number) => updateAnswer(answer.includes(number) ? answer.filter((value) => value !== number) : answer.length < 2 ? [...answer, number] : [answer[1], number])
  const introSize = (question.common === 1 ? 3 : 4) + (question.innerA === 1 ? 0 : 1)
  const title = activity === 'intro' ? 'แจกแจงให้แจ่ม' : activity === 'guided' ? 'คู่คิดพิชิตวงเล็บ' : activity === 'factor' ? 'นักสืบตัวประกอบ' : 'คู่คูณชวนคิด'

  return <main className="paper-grid min-h-screen p-3">
    <div className="mx-auto max-w-3xl">
      <header className="mb-3 flex items-center gap-3 rounded-3xl p-4 text-white shadow-lg" style={{ backgroundColor: team.color }}><span className="text-4xl">{team.animal}</span><div className="min-w-0 flex-1"><p className="text-xs font-black opacity-75">ห้อง {session.code}</p><h1 className="truncate text-2xl font-black">{team.name}</h1></div><button onClick={leave} className="grid size-11 place-items-center rounded-xl bg-white/20" aria-label="ออกจากกลุ่ม"><LogOut/></button></header>
      {error && <p className="mb-3 rounded-xl bg-[#fff0eb] px-3 py-2 text-center text-sm font-black text-[#a33b2f]">{error}</p>}
      {state.roomStatus !== 'playing' ? <section className="grid min-h-[55vh] place-items-center rounded-[28px] bg-white p-8 text-center shadow-xl"><div><LoaderCircle className="mx-auto animate-spin text-[#d78a25]" size={48}/><p className="mt-4 text-sm font-black text-[#8b7559]">ครูเลือกกิจกรรม</p><h2 className="text-3xl font-black text-[#193b2b]">{title}</h2><p className="mt-2 font-bold text-[#68736d]">รอครูกดเริ่มกิจกรรม หน้านี้จะเปลี่ยนอัตโนมัติ</p></div></section> : finishedNow ? <section className="grid min-h-[55vh] place-items-center rounded-[28px] bg-white p-8 text-center shadow-xl"><div><Trophy className="mx-auto text-[#d88b20]" size={64}/><p className="mt-4 font-black text-[#a76c1d]">จบกิจกรรม {title}</p><h2 className="text-4xl font-black text-[#193b2b]">เก่งมาก!</h2><p className="mt-2 font-bold text-[#68736d]">รอครูเริ่มรอบใหม่หรือเลือกกิจกรรมถัดไป</p></div></section> : <>
        <div className="mb-3 flex items-center justify-between rounded-2xl bg-white px-4 py-3 shadow-sm"><div><p className="text-xs font-black text-[#778078]">กำลังเล่น</p><h2 className="text-xl font-black text-[#193b2b]">{title}</h2></div><span className="rounded-full bg-[#e6f5ec] px-3 py-1 text-sm font-black text-[#20704a]">ข้อ {(questionIndex ?? 0) + 1}</span></div>
        {activity === 'intro' ? <DistributivePlayArea teams={[team]} teamNames={[team.name]} questions={[question]} index={state.introQuestionIndex ?? 0} answers={[answer]} revealed={Boolean(revealedNow)} hideControls onSelect={(_, slot, value) => updateSlot(slot, value, introSize)}/>
          : activity === 'guided' ? <GuidedPlayArea teams={[team]} teamNames={[team.name]} questions={[question]} index={state.guidedQuestionIndex ?? 0} answers={[answer]} revealed={Boolean(revealedNow)} numberMode={state.guidedNumberMode ?? 'positive'} hideControls onSelect={(_, slot, value) => updateSlot(slot, value, 2)}/>
            : activity === 'factor' ? <FactorPlayArea teams={[team]} teamNames={[team.name]} questions={[question]} index={state.factorQuestionIndex ?? 0} answers={[answer]} revealed={Boolean(revealedNow)} numberMode={state.factorNumberMode ?? 'mixed'} hideControls onSelect={(_, slot, value) => updateSlot(slot, value, 4)}/>
              : <TeamCard team={team} question={question} showQuestion integerMode={state.numberMode === 'integers'} answer={answer} choices={state.numberMode === 'integers' ? Array.from({ length: 13 }, (_, i) => i - 6) : Array.from({ length: 10 }, (_, i) => i + 1)} revealed={Boolean(revealedNow)} correct={Boolean(revealedNow) && isCorrect(answer, question)} onSelect={selectPair}/>}
        <p className="mt-3 rounded-2xl bg-white px-4 py-3 text-center font-black text-[#5f6c65]">{revealedNow ? 'ครูเฉลยแล้ว รอข้อถัดไป' : 'คำตอบของกลุ่มจะส่งให้ครูอัตโนมัติ'}</p>
      </>}
    </div>
  </main>
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

function ScoreSidebar({ scores, answers, members, teamNames, questions, totalQuestions, revealed, isAnswerCorrect = isCorrect, isAnswerReady, answerSize = 2, onAdd, onRemove }) {
  return <aside className="score-sidebar rounded-[24px] bg-[#173c2c] p-3 text-white shadow-xl" aria-label="แถบคะแนนด้านซ้าย">
    <div className="flex items-center justify-between px-2 py-2"><div><p className="text-[10px] font-black uppercase tracking-[.18em] text-[#acc8b9]">Score board</p><h2 className="text-lg font-black">พลังของทีม</h2></div><Trophy className="text-[#ffc45d]" size={26}/></div>
    <div className="score-team-grid mt-2 grid grid-cols-2 gap-2">
      {TEAMS.map((team, index) => {
        const correct = revealed && isAnswerCorrect(answers[index], questions[index])
        const ready = isAnswerReady ? isAnswerReady(answers[index], questions[index]) : answers[index].filter(Number.isFinite).length === answerSize
        return <div key={team.name} className="rounded-2xl p-3 text-[#1d2922]" style={{ backgroundColor: team.pale }}>
          <div className="flex items-center gap-2"><span className="text-3xl" role="img">{team.animal}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-black" style={{ color: team.color }}>{teamNames[index]}</p><p className="text-[11px] font-bold text-[#657068]">{revealed ? (correct ? '+1 พลัง!' : 'ไม่ได้แต้ม') : (ready ? 'เลือกแล้ว ✓' : 'กำลังคิด')}</p></div><strong className="text-3xl font-black" style={{ color: team.color }}>{scores[index]}</strong></div>
          <div className="mt-2 h-3 overflow-hidden rounded-full bg-white/80"><div className="h-full rounded-full transition-all duration-500" style={{ width: `${scores[index] / totalQuestions * 100}%`, backgroundColor: team.color }}/></div>
          <div className="mt-2 space-y-1">
            {members[index].map((member) => <div key={member.id} className="group flex items-center gap-1.5 rounded-lg bg-white/65 px-2 py-1 text-xs font-bold"><span className="text-base">{member.emoji}</span><span className="min-w-0 flex-1 truncate">{member.name}</span><span className="font-black" style={{ color: team.color }}>{scores[index]}</span><button onClick={() => onRemove(index, member.id)} className="ml-1 hidden text-[#9a5b55] group-hover:block" aria-label={`ลบ ${member.name}`}><Trash2 size={12}/></button></div>)}
          </div>
          <button onClick={() => onAdd(index)} className="mt-2 flex min-h-8 w-full items-center justify-center gap-1 rounded-lg border border-dashed bg-white/45 text-xs font-black" style={{ borderColor: team.color, color: team.color }}><Plus size={13}/> เพิ่มสมาชิก</button>
        </div>
      })}
    </div>
    <div className="mt-3 rounded-xl bg-white/10 p-2 text-center text-xs font-bold text-[#c9ddd2]">เต็ม {totalQuestions} พลัง · ถูก 1 ข้อ ได้ 1 พลัง</div>
  </aside>
}

function FactorSettingsModal({ names, mode, numberMode, currentQuestion, title = 'ตั้งค่านักสืบตัวประกอบ', icon = '🔎', showNumberMode = true, onCancel, onApply }) {
  const [draftNames, setDraftNames] = useState(names)
  const [draftMode, setDraftMode] = useState(mode)
  const [draftNumberMode, setDraftNumberMode] = useState(numberMode)
  return <div className="fixed inset-0 z-30 grid place-items-center overflow-y-auto bg-[#17231d]/65 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="factor-settings-title">
    <form onSubmit={(event) => { event.preventDefault(); onApply(draftNames, draftMode, draftNumberMode) }} className="w-full max-w-2xl rounded-[28px] bg-white p-6 shadow-2xl">
      <div className="flex items-center gap-3"><div className="grid size-12 place-items-center rounded-2xl bg-[#eee9ff] text-2xl">{icon}</div><div><p className="text-xs font-black uppercase tracking-wider text-[#8276b4]">Factor settings</p><h2 id="factor-settings-title" className="text-2xl font-black">{title}</h2></div></div>
      <p className="mt-5 text-sm font-black text-[#4e5a53]">ชื่อกลุ่ม</p>
      <div className="mt-2 grid grid-cols-2 gap-3">{TEAMS.map((team, index) => <label key={team.name} className="flex items-center gap-2 rounded-xl border-2 p-2" style={{ borderColor: team.color, backgroundColor: team.pale }}><span className="text-2xl">{team.animal}</span><input value={draftNames[index]} onChange={(event) => setDraftNames((current) => current.map((name, i) => i === index ? event.target.value : name))} maxLength={20} className="min-w-0 flex-1 rounded-lg bg-white/85 px-3 py-2 font-black outline-none" aria-label={`ชื่อกลุ่มที่ ${index + 1}`}/></label>)}</div>

      <p className="mt-5 text-sm font-black text-[#4e5a53]">รูปแบบโจทย์</p>
      <div className="mt-2 grid gap-3 sm:grid-cols-2">
        <button type="button" onClick={() => setDraftMode('same')} className={`rounded-2xl border-2 p-4 text-left ${draftMode === 'same' ? 'border-[#2878c8] bg-[#e8f2ff]' : 'border-[#ded8cb]'}`}><strong className="text-lg">👥 โจทย์เหมือนกัน</strong><p className="mt-1 text-sm font-bold text-[#68736d]">ทั้ง 4 กลุ่มแก้สมการเดียวกัน</p></button>
        <button type="button" onClick={() => setDraftMode('different')} className={`rounded-2xl border-2 p-4 text-left ${draftMode === 'different' ? 'border-[#e76f2e] bg-[#fff0e7]' : 'border-[#ded8cb]'}`}><strong className="text-lg">🔥 โจทย์แตกต่างกัน</strong><p className="mt-1 text-sm font-bold text-[#68736d]">แต่ละการ์ดมีสมการของกลุ่มตัวเอง</p></button>
      </div>

      {showNumberMode && <><p className="mt-5 text-sm font-black text-[#4e5a53]">ชนิดของจำนวน</p>
      <div className="mt-2 grid gap-3 sm:grid-cols-2">
        <button type="button" onClick={() => setDraftNumberMode('positive')} className={`rounded-2xl border-2 p-4 text-left ${draftNumberMode === 'positive' ? 'border-[#249263] bg-[#e8f7ef]' : 'border-[#ded8cb]'}`}><strong className="text-lg">🌱 จำนวนบวก</strong><p className="mt-1 text-sm font-bold text-[#68736d]">ใช้เฉพาะจำนวนบวก</p></button>
        <button type="button" onClick={() => setDraftNumberMode('mixed')} className={`rounded-2xl border-2 p-4 text-left ${draftNumberMode === 'mixed' ? 'border-[#8459c4] bg-[#f1ebfb]' : 'border-[#ded8cb]'}`}><strong className="text-lg">± จำนวนเต็มแบบผสม</strong><p className="mt-1 text-sm font-bold text-[#68736d]">มีทั้งจำนวนบวกและจำนวนติดลบ</p></button>
      </div></>}

      <p className="mt-3 rounded-xl bg-[#fff4d9] px-3 py-2 text-xs font-bold text-[#77551e]">กำลังเล่นข้อ {currentQuestion}/10 · เปลี่ยนโหมดแล้วเลขข้อ คะแนน และสมาชิกจะนับต่อ โดยล้างเฉพาะคำตอบปัจจุบัน</p>
      <div className="mt-5 grid grid-cols-2 gap-3"><button type="button" onClick={onCancel} className="min-h-12 rounded-xl bg-[#eeeae1] font-bold">ยกเลิก</button><button type="submit" className="min-h-12 rounded-xl bg-[#30265f] font-black text-white">บันทึกการตั้งค่า</button></div>
    </form>
  </div>
}

function SettingsModal({ names, mode, numberMode, totalQuestions, currentQuestion, onCancel, onApply }) {
  const [draftNames, setDraftNames] = useState(names)
  const [draftMode, setDraftMode] = useState(mode)
  const [draftNumberMode, setDraftNumberMode] = useState(numberMode)
  const [draftTotal, setDraftTotal] = useState(totalQuestions)
  return <div className="fixed inset-0 z-30 grid place-items-center overflow-y-auto bg-[#17231d]/65 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="settings-title">
    <form onSubmit={(event) => { event.preventDefault(); onApply(draftNames, draftMode, draftNumberMode, draftTotal) }} className="w-full max-w-2xl rounded-[28px] bg-white p-6 shadow-2xl">
      <div className="flex items-center gap-3"><div className="grid size-12 place-items-center rounded-2xl bg-[#e8f1ec] text-[#193b2b]"><Settings size={26}/></div><div><p className="text-xs font-black uppercase tracking-wider text-[#718078]">Game settings</p><h2 id="settings-title" className="text-2xl font-black">ตั้งชื่อกลุ่มและเลือกโหมด</h2></div></div>
      <p className="mt-5 text-sm font-black text-[#4e5a53]">ชื่อกลุ่ม</p>
      <div className="mt-2 grid grid-cols-2 gap-3">{TEAMS.map((team, index) => <label key={team.name} className="flex items-center gap-2 rounded-xl border-2 p-2" style={{ borderColor: team.color, backgroundColor: team.pale }}><span className="text-2xl">{team.animal}</span><input value={draftNames[index]} onChange={(event) => setDraftNames((current) => current.map((name, i) => i === index ? event.target.value : name))} maxLength={20} className="min-w-0 flex-1 rounded-lg bg-white/85 px-3 py-2 font-black outline-none" aria-label={`ชื่อกลุ่มที่ ${index + 1}`}/></label>)}</div>
      <p className="mt-5 text-sm font-black text-[#4e5a53]">รูปแบบโจทย์</p>
      <div className="mt-2 grid gap-3 sm:grid-cols-2">
        <button type="button" onClick={() => setDraftMode('same')} className={`rounded-2xl border-2 p-4 text-left ${draftMode === 'same' ? 'border-[#2878c8] bg-[#e8f2ff]' : 'border-[#ded8cb]'}`}><div className="flex items-center gap-2"><span className="text-2xl">🤝</span><strong className="text-lg">โจทย์เหมือนกัน</strong></div><p className="mt-1 text-sm font-bold text-[#68736d]">ทั้ง 4 กลุ่มแก้โจทย์เดียวกัน เหมาะสำหรับเริ่มเล่น</p></button>
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

function resultText(answers, questions, teamNames) {
  const winners = TEAMS.map((_, index) => index).filter((index) => isCorrect(answers[index], questions[index])).map((index) => teamNames[index])
  return winners.length ? `${winners.join(', ')} ได้กลุ่มละ 1 คะแนน` : 'ข้อนี้ยังไม่มีกลุ่มตอบถูก'
}

function ConfirmReset({ onCancel, onConfirm }) {
  return <div className="fixed inset-0 z-20 grid place-items-center bg-[#17231d]/60 p-4 backdrop-blur-sm"><div className="w-full max-w-sm rounded-[28px] bg-white p-6 text-center shadow-2xl"><RotateCcw className="mx-auto text-[#d76824]" size={38}/><h2 className="mt-3 text-2xl font-black">เริ่มเกมใหม่?</h2><p className="mt-2 text-[#69716c]">คะแนนทั้งหมดจะถูกล้าง</p><div className="mt-5 grid grid-cols-2 gap-3"><button onClick={onCancel} className="min-h-12 rounded-xl bg-[#eeeae1] font-bold">ยกเลิก</button><button onClick={onConfirm} className="min-h-12 rounded-xl bg-[#d85e35] font-bold text-white">เริ่มใหม่</button></div></div></div>
}

function Results({ scores, members, teamNames, totalQuestions, onReset, activityName = 'คู่คูณชวนคิด' }) {
  const top = Math.max(...scores)
  const winnerIndexes = TEAMS.map((_, index) => index).filter((index) => scores[index] === top)
  return <main className="paper-grid grid min-h-screen place-items-center p-5">
    <div className="w-full max-w-4xl text-center">
      <Trophy className="mx-auto text-[#d88b20]" size={64}/><p className="mt-3 font-black text-[#a76c1d]">{activityName} · จบครบ {totalQuestions} ข้อ</p><h1 className="text-5xl font-black text-[#193b2b]">เก่งมากทุกทีม!</h1>
      <p className="mt-2 text-lg font-bold text-[#647069]">ผู้ชนะคือ {winnerIndexes.map((index) => `${TEAMS[index].animal} ${teamNames[index]}`).join(' และ ')} · {top} คะแนน</p>
      <div className="mt-7 grid grid-cols-2 gap-3 lg:grid-cols-4">{TEAMS.map((team, index) => <div key={team.name} className="rounded-3xl border-2 p-5" style={{ backgroundColor: team.pale, borderColor: team.color }}><div className="text-5xl">{team.animal}</div><h2 className="mt-2 font-black" style={{ color: team.color }}>{teamNames[index]}</h2><p className="text-4xl font-black" style={{ color: team.color }}>{scores[index]}</p><div className="mt-3 space-y-1">{members[index].map((member) => <div key={member.id} className="flex items-center rounded-lg bg-white/70 px-2 py-1 text-xs font-bold"><span className="mr-1">{member.emoji}</span><span className="flex-1 truncate text-left">{member.name}</span><strong style={{ color: team.color }}>{scores[index]}</strong></div>)}</div></div>)}</div>
      <button onClick={onReset} className="mt-7 inline-flex min-h-14 items-center gap-2 rounded-2xl bg-[#193b2b] px-8 text-lg font-black text-white"><RotateCcw/> เล่นอีกครั้ง</button>
    </div>
  </main>
}
