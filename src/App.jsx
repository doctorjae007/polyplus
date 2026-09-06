import { useEffect, useMemo, useState } from 'react'
import { ChevronRight, Eye, LockKeyhole, Pencil, RotateCcw, Sparkles, Trophy, UsersRound, X } from 'lucide-react'

const TEAMS = [
  { name: 'ทีมฟ้า', animal: '🐬', color: '#2878c8', pale: '#ddecff' },
  { name: 'ทีมส้ม', animal: '🦊', color: '#e76f2e', pale: '#ffe5d6' },
  { name: 'ทีมเขียว', animal: '🐢', color: '#249263', pale: '#d9f3e5' },
  { name: 'ทีมม่วง', animal: '🦄', color: '#8459c4', pale: '#eadffc' },
]

const QUESTIONS = [
  { m: 2, n: 5 }, { m: 3, n: 4 }, { m: 1, n: 8 }, { m: 3, n: 6 },
  { m: 2, n: 7 }, { m: 4, n: 5 }, { m: 3, n: 8 }, { m: 5, n: 6 },
  { m: 4, n: 7 }, { m: 5, n: 8 }, { m: 6, n: 7 }, { m: 4, n: 9 },
  { m: 6, n: 8 }, { m: 5, n: 9 }, { m: 7, n: 8 }, { m: 6, n: 9 },
].map((q) => ({ ...q, product: q.m * q.n, sum: q.m + q.n }))

const emptyAnswers = () => TEAMS.map(() => [])
const emptyLocks = () => TEAMS.map(() => false)
const STORAGE_KEY = 'factor-rally-state-v2'
const isCorrect = (answer, question) => answer.length === 2 && answer[0] * answer[1] === question.product && answer[0] + answer[1] === question.sum

function App() {
  const [questionIndex, setQuestionIndex] = useState(0)
  const [activeTeam, setActiveTeam] = useState(0)
  const [answers, setAnswers] = useState(emptyAnswers)
  const [locked, setLocked] = useState(emptyLocks)
  const [scores, setScores] = useState(() => TEAMS.map(() => 0))
  const [revealed, setRevealed] = useState(false)
  const [finished, setFinished] = useState(false)
  const [showReset, setShowReset] = useState(false)

  const question = QUESTIONS[questionIndex]
  const round = Math.floor(questionIndex / 4) + 1
  const choices = useMemo(() => Array.from({ length: 10 }, (_, i) => i + 1), [])
  const allReady = locked.every(Boolean)

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (!saved) return
    try {
      const state = JSON.parse(saved)
      setQuestionIndex(state.questionIndex ?? 0)
      setActiveTeam(state.activeTeam ?? 0)
      setAnswers(state.answers ?? emptyAnswers())
      setLocked(state.locked ?? emptyLocks())
      setScores(state.scores ?? TEAMS.map(() => 0))
      setRevealed(Boolean(state.revealed))
      setFinished(Boolean(state.finished))
    } catch { localStorage.removeItem(STORAGE_KEY) }
  }, [])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ questionIndex, activeTeam, answers, locked, scores, revealed, finished }))
  }, [questionIndex, activeTeam, answers, locked, scores, revealed, finished])

  const selectNumber = (number) => {
    if (revealed || locked[activeTeam]) return
    setAnswers((current) => current.map((answer, index) => {
      if (index !== activeTeam) return answer
      if (answer.includes(number)) return answer.filter((value) => value !== number)
      return answer.length < 2 ? [...answer, number] : [answer[1], number]
    }))
  }

  const saveTeamAnswer = () => {
    if (answers[activeTeam].length !== 2) return
    const nextLocks = locked.map((value, index) => index === activeTeam ? true : value)
    setLocked(nextLocks)
    const next = nextLocks.findIndex((value) => !value)
    if (next !== -1) setActiveTeam(next)
  }

  const editTeam = (index) => {
    if (revealed) return
    setActiveTeam(index)
    if (locked[index]) setLocked((current) => current.map((value, i) => i === index ? false : value))
  }

  const revealAll = () => {
    if (!allReady || revealed) return
    setScores((current) => current.map((score, index) => score + (isCorrect(answers[index], question) ? 1 : 0)))
    setRevealed(true)
  }

  const nextQuestion = () => {
    if (questionIndex === QUESTIONS.length - 1) return setFinished(true)
    setQuestionIndex((value) => value + 1)
    setActiveTeam(0)
    setAnswers(emptyAnswers())
    setLocked(emptyLocks())
    setRevealed(false)
  }

  const resetGame = () => {
    setQuestionIndex(0); setActiveTeam(0); setAnswers(emptyAnswers()); setLocked(emptyLocks())
    setScores(TEAMS.map(() => 0)); setRevealed(false); setFinished(false); setShowReset(false)
    localStorage.removeItem(STORAGE_KEY)
  }

  if (finished) return <Results scores={scores} onReset={resetGame} />

  return (
    <main className="paper-grid min-h-screen px-4 py-4 sm:px-6 lg:px-8 lg:py-6">
      <div className="mx-auto max-w-[1500px]">
        <div className="grid items-start gap-4 md:grid-cols-[minmax(0,1fr)_250px] xl:grid-cols-[minmax(0,1fr)_290px]">
        <div className="min-w-0">
        <header className="mb-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="grid size-11 place-items-center rounded-2xl bg-[#193b2b] text-xl font-black text-white shadow-sm rotate-[-3deg]">×</div>
            <div><h1 className="text-xl font-black tracking-tight text-[#193b2b] sm:text-2xl">คู่คูณชวนคิด</h1><p className="text-xs font-semibold text-[#6d756f] sm:text-sm">หนึ่งโจทย์ ทุกทีมช่วยกันคิด แล้วเฉลยพร้อมกัน</p></div>
          </div>
          <button onClick={() => setShowReset(true)} className="flex min-h-11 items-center gap-2 rounded-xl border border-[#d8d2c5] bg-white/70 px-4 text-sm font-bold text-[#5c635e] hover:bg-white"><RotateCcw size={17} /> <span className="hidden sm:inline">เริ่มใหม่</span></button>
        </header>

        <div className="grid min-w-0 gap-4 xl:grid-cols-[.85fr_1.15fr]">
          <QuestionPanel question={question} questionIndex={questionIndex} round={round} revealed={revealed} />
          <section className="rounded-[28px] border-2 p-4 shadow-sm transition-colors sm:p-6" style={{ borderColor: revealed ? '#ded8cb' : TEAMS[activeTeam].color, backgroundColor: revealed ? '#fffdf8' : TEAMS[activeTeam].pale }}>
            <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="เลือกกลุ่มที่จะตอบ">
              {TEAMS.map((team, index) => {
                const active = index === activeTeam && !revealed
                const correct = revealed && isCorrect(answers[index], question)
                return <button key={team.name} onClick={() => editTeam(index)} disabled={revealed} className={`relative min-h-20 overflow-hidden rounded-2xl border-2 px-3 py-2 text-left transition ${active ? 'scale-[1.02] shadow-md' : 'opacity-90'} disabled:cursor-default disabled:opacity-100`} style={{ borderColor: team.color, backgroundColor: team.pale }}>
                  <span className="absolute inset-x-0 top-0 h-1" style={{ backgroundColor: team.color }} />
                  <div className="flex items-center justify-between gap-1"><span className="font-black" style={{ color: team.color }}><span className="mr-1" role="img">{team.animal}</span>{team.name}</span>{locked[index] && !revealed ? <LockKeyhole size={16} style={{ color: team.color }} /> : null}</div>
                  <div className="mt-1 text-sm font-bold text-[#69716c]">{revealed ? <span className={correct ? 'text-[#187044]' : 'text-[#b6492f]'}>{answers[index].join(' × ')} {correct ? '✓' : '✕'}</span> : locked[index] ? 'พร้อมเฉลย ✓' : active ? 'กำลังเลือก…' : 'แตะเพื่อเลือก'}</div>
                </button>
              })}
            </div>

            {!revealed && <>
              <div className="mb-3 flex items-end justify-between"><div><p className="text-sm font-bold text-[#7b807c]">คำตอบของกลุ่ม</p><h3 className="text-xl font-black" style={{ color: TEAMS[activeTeam].color }}>{TEAMS[activeTeam].name} เลือก 2 จำนวน</h3></div>{locked[activeTeam] && <button onClick={() => editTeam(activeTeam)} className="flex items-center gap-1 rounded-full bg-[#f1ece1] px-3 py-1.5 text-xs font-bold"><Pencil size={13}/> แก้คำตอบ</button>}</div>
              <div className="grid grid-cols-5 gap-2 sm:gap-3">
                {choices.map((number) => {
                  const selected = answers[activeTeam].includes(number)
                  return <button key={number} onClick={() => selectNumber(number)} disabled={locked[activeTeam]} aria-pressed={selected} className={`number-button aspect-square min-h-14 rounded-2xl border-2 text-2xl font-black sm:text-3xl ${selected ? 'selected text-white' : 'border-[#ded8cb] bg-white text-[#27342d] hover:border-[#8a9c92]'} disabled:cursor-not-allowed`} style={selected ? { backgroundColor: TEAMS[activeTeam].color, borderColor: TEAMS[activeTeam].color } : undefined}>{number}</button>
                })}
              </div>
              <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-2xl bg-[#f2eee5] p-2.5"><AnswerSlot value={answers[activeTeam][0]} /><X className="mx-auto text-[#a49e92]" size={20} /><AnswerSlot value={answers[activeTeam][1]} /></div>
              {!locked[activeTeam] && <button onClick={saveTeamAnswer} disabled={answers[activeTeam].length !== 2} className="mt-3 flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl px-5 text-lg font-black text-white shadow-[0_4px_0_#173c2c] active:translate-y-1 active:shadow-none disabled:cursor-not-allowed disabled:opacity-35" style={{ backgroundColor: TEAMS[activeTeam].color }}><LockKeyhole size={20}/> บันทึกคำตอบ {TEAMS[activeTeam].name}</button>}
            </>}

            {revealed && <RevealSummary answers={answers} question={question} />}
            <button onClick={revealed ? nextQuestion : revealAll} disabled={!revealed && !allReady} className={`mt-4 flex min-h-16 w-full items-center justify-center gap-2 rounded-2xl px-6 text-xl font-black transition active:translate-y-1 active:shadow-none disabled:cursor-not-allowed disabled:opacity-40 ${revealed ? 'bg-[#193b2b] text-white shadow-[0_5px_0_#0d281b]' : 'bg-[#ef9940] text-[#352111] shadow-[0_5px_0_#bd6923]'}`}>
              {revealed ? <>ข้อต่อไป <ChevronRight /></> : <><Eye /> เฉลยพร้อมกัน</>}
            </button>
            {!revealed && <p className="mt-2 text-center text-xs font-bold text-[#85877f]">{locked.filter(Boolean).length}/4 กลุ่มพร้อมแล้ว · กลุ่มที่ตอบถูกได้ 1 คะแนน</p>}
          </section>
          </div>
          </div>
          <ScoreSidebar scores={scores} answers={answers} locked={locked} question={question} revealed={revealed} />
        </div>
      </div>
      {showReset && <ConfirmReset onCancel={() => setShowReset(false)} onConfirm={resetGame} />}
    </main>
  )
}

function ScoreSidebar({ scores, answers, locked, question, revealed }) {
  return <aside className="overflow-hidden rounded-[28px] border border-[#d8d2c5] bg-[#173c2c] p-3 text-white shadow-xl md:sticky md:top-4 md:min-h-[calc(100vh-2rem)]" aria-label="แถบคะแนน">
    <div className="flex items-center justify-between px-2 py-2">
      <div><p className="text-xs font-bold uppercase tracking-[.16em] text-[#acc8b9]">Score board</p><h2 className="text-xl font-black">พลังของแต่ละทีม</h2></div>
      <Trophy className="text-[#ffc45d]" size={28} />
    </div>
    <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-1">
      {TEAMS.map((team, index) => {
        const correct = revealed && isCorrect(answers[index], question)
        const status = revealed ? (correct ? '+1 พลัง!' : 'ข้อนี้ยังไม่ได้') : (locked[index] ? 'พร้อมเฉลย' : 'รอคำตอบ')
        return <div key={team.name} className="rounded-2xl p-3 text-[#1d2922] shadow-sm" style={{ backgroundColor: team.pale }}>
          <div className="flex items-center gap-2">
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-white/75 text-3xl" role="img" aria-label={`สัตว์ประจำ${team.name}`}>{team.animal}</span>
            <div className="min-w-0 flex-1"><p className="truncate text-sm font-black" style={{ color: team.color }}>{team.name}</p><p className="text-xs font-bold text-[#637068]">{status}</p></div>
            <div className="text-right"><strong className="text-3xl font-black leading-none" style={{ color: team.color }}>{scores[index]}</strong><span className="block text-[10px] font-bold text-[#707970]">/ 16</span></div>
          </div>
          <div className="mt-3 h-3 overflow-hidden rounded-full bg-white/80 ring-1 ring-black/5" aria-label={`พลัง ${scores[index]} จาก 16`}>
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${(scores[index] / 16) * 100}%`, backgroundColor: team.color }} />
          </div>
        </div>
      })}
    </div>
    <div className="mt-3 rounded-2xl bg-white/10 px-3 py-2 text-center text-xs font-bold text-[#c9ddd2]">ตอบถูก 1 ข้อ = เพิ่มพลัง 1 ช่อง</div>
  </aside>
}

function QuestionPanel({ question, questionIndex, round, revealed }) {
  return <section className="flex min-h-[360px] flex-col rounded-[28px] bg-[#193b2b] p-5 text-white shadow-xl shadow-[#193b2b]/10 sm:p-7">
    <div className="flex items-center justify-between"><span className="rounded-full bg-white/12 px-3 py-1.5 text-sm font-bold">รอบที่ {round} · ข้อ {questionIndex + 1}/16</span><div className="flex gap-1.5">{[1,2,3,4].map((value) => <span key={value} className={`h-2 w-7 rounded-full ${value <= round ? 'bg-[#ffc45d]' : 'bg-white/20'}`} />)}</div></div>
    <div className="my-auto py-6 text-center">
      <p className="mb-3 text-sm font-bold uppercase tracking-[.18em] text-[#b8d2c4]">โจทย์เดียวกันสำหรับทุกกลุ่ม</p><h2 className="text-2xl font-black sm:text-3xl">จำนวนสองจำนวนที่...</h2>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3"><div className="rounded-2xl bg-white/10 px-5 py-4"><span className="text-sm text-[#c3d9cd]">คูณกันได้</span><strong className="ml-3 text-4xl text-[#ffc45d]">{question.product}</strong></div><span className="text-2xl font-black text-white/40">และ</span><div className="rounded-2xl bg-white/10 px-5 py-4"><span className="text-sm text-[#c3d9cd]">บวกกันได้</span><strong className="ml-3 text-4xl text-[#ffc45d]">{question.sum}</strong></div></div>
      {revealed && <div className="pop mt-6 rounded-2xl bg-[#ffc45d] px-5 py-4 text-[#37270d]"><p className="text-xs font-black uppercase tracking-wider">เฉลย</p><p className="text-4xl font-black">{question.m} และ {question.n}</p></div>}
    </div>
    <div className="rounded-2xl bg-black/15 p-3 text-center text-sm font-semibold text-[#d5e3dc]">{revealed ? 'ตรวจคำตอบและคะแนนของทุกกลุ่มได้ทางขวา' : 'แต่ละกลุ่มเลือกคำตอบและบันทึกไว้ ครูค่อยกดเฉลยพร้อมกัน'}</div>
  </section>
}

function RevealSummary({ answers, question }) {
  const winners = TEAMS.filter((_, index) => isCorrect(answers[index], question))
  return <div className="pop rounded-2xl bg-[#f2eee5] p-4 text-center" role="status"><p className="text-sm font-bold text-[#737870]">ผลข้อนี้</p>{winners.length ? <p className="mt-1 text-lg font-black text-[#17613e]">{winners.map((team) => team.name).join(', ')} ได้กลุ่มละ 1 คะแนน</p> : <p className="mt-1 text-lg font-black text-[#a34c32]">ยังไม่มีกลุ่มตอบถูกในข้อนี้</p>}</div>
}

function AnswerSlot({ value }) {
  return <div className={`grid min-h-12 place-items-center rounded-xl border-2 border-dashed text-2xl font-black ${value ? 'border-[#547461] bg-white text-[#193b2b]' : 'border-[#c9c2b5] text-[#aaa398]'}`}>{value ?? '?'}</div>
}

function ConfirmReset({ onCancel, onConfirm }) {
  return <div className="fixed inset-0 z-20 grid place-items-center bg-[#17231d]/55 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="reset-title"><div className="w-full max-w-sm rounded-[28px] bg-white p-6 text-center shadow-2xl"><div className="mx-auto mb-3 grid size-14 place-items-center rounded-full bg-[#fff0e1] text-[#d76824]"><RotateCcw /></div><h2 id="reset-title" className="text-2xl font-black">เริ่มเกมใหม่?</h2><p className="mt-2 text-[#69716c]">คะแนนและความคืบหน้าทั้งหมดจะถูกล้าง</p><div className="mt-6 grid grid-cols-2 gap-3"><button onClick={onCancel} className="min-h-12 rounded-xl bg-[#eeeae1] font-bold">ยกเลิก</button><button onClick={onConfirm} className="min-h-12 rounded-xl bg-[#d85e35] font-bold text-white">เริ่มใหม่</button></div></div></div>
}

function Results({ scores, onReset }) {
  const topScore = Math.max(...scores)
  const winners = TEAMS.filter((_, i) => scores[i] === topScore).map((team) => team.name)
  return <main className="paper-grid min-h-screen p-5 sm:p-8"><div className="mx-auto max-w-4xl text-center"><div className="mx-auto mt-6 grid size-20 place-items-center rounded-full bg-[#ffc45d] text-[#5d3d08] shadow-lg"><Trophy size={42} /></div><p className="mt-5 text-sm font-black uppercase tracking-[.2em] text-[#a76c1d]">จบครบทั้ง 4 รอบแล้ว</p><h1 className="mt-2 text-4xl font-black text-[#193b2b] sm:text-6xl">เก่งมากทุกทีม!</h1><p className="mt-3 text-lg font-semibold text-[#647069]">ผู้ชนะคือ {winners.join(' และ ')} ด้วย {topScore} คะแนน</p><div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{TEAMS.map((team, index) => <div key={team.name} className="rounded-3xl border bg-white p-5 shadow-sm" style={{ borderColor: scores[index] === topScore ? team.color : '#ded8cb' }}><div className="mx-auto mb-3 grid size-12 place-items-center rounded-2xl" style={{ color: team.color, backgroundColor: team.pale }}><UsersRound /></div><h2 className="font-black">{team.name}</h2><p className="mt-1 text-4xl font-black" style={{ color: team.color }}>{scores[index]}</p><p className="text-sm font-semibold text-[#777f79]">ตอบถูก {scores[index]} ข้อ</p>{scores[index] === topScore && <div className="mt-3 flex items-center justify-center gap-1 text-xs font-black text-[#a76c1d]"><Sparkles size={14}/> อันดับหนึ่ง</div>}</div>)}</div><button onClick={onReset} className="mt-8 inline-flex min-h-16 items-center gap-2 rounded-2xl bg-[#193b2b] px-8 text-xl font-black text-white shadow-[0_5px_0_#0d281b] active:translate-y-1 active:shadow-none"><RotateCcw /> เล่นอีกครั้ง</button></div></main>
}

export default App
