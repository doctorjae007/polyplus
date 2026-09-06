import { useEffect, useMemo, useState } from 'react'
import { Check, ChevronRight, Lightbulb, RotateCcw, Sparkles, Trophy, UsersRound, X } from 'lucide-react'

const TEAMS = [
  { name: 'ทีมฟ้า', color: '#2878c8', pale: '#e8f2ff' },
  { name: 'ทีมส้ม', color: '#e76f2e', pale: '#fff0e7' },
  { name: 'ทีมเขียว', color: '#249263', pale: '#e8f7ef' },
  { name: 'ทีมม่วง', color: '#8459c4', pale: '#f1ebfb' },
]

const QUESTIONS = [
  { m: 2, n: 5 }, { m: 3, n: 4 }, { m: 1, n: 8 }, { m: 3, n: 6 },
  { m: 2, n: 7 }, { m: 4, n: 5 }, { m: 3, n: 8 }, { m: 5, n: 6 },
  { m: 4, n: 7 }, { m: 5, n: 8 }, { m: 6, n: 7 }, { m: 4, n: 9 },
  { m: 6, n: 8 }, { m: 5, n: 9 }, { m: 7, n: 8 }, { m: 6, n: 9 },
].map((q) => ({ ...q, product: q.m * q.n, sum: q.m + q.n }))

const initialScores = TEAMS.map(() => ({ score: 0, correct: 0 }))
const pointsForAttempt = (attempt) => [3, 2, 1][Math.min(attempt - 1, 2)]

function App() {
  const [questionIndex, setQuestionIndex] = useState(0)
  const [teamIndex, setTeamIndex] = useState(0)
  const [selected, setSelected] = useState([])
  const [attempt, setAttempt] = useState(1)
  const [feedback, setFeedback] = useState(null)
  const [scores, setScores] = useState(initialScores)
  const [finished, setFinished] = useState(false)
  const [showReset, setShowReset] = useState(false)

  const question = QUESTIONS[questionIndex]
  const round = Math.floor(questionIndex / 4) + 1
  const currentTeam = TEAMS[teamIndex]
  const choices = useMemo(() => {
    const max = Math.max(10, question.m, question.n)
    return Array.from({ length: max }, (_, i) => i + 1)
  }, [question])

  useEffect(() => {
    const saved = localStorage.getItem('factor-rally-state')
    if (!saved) return
    try {
      const state = JSON.parse(saved)
      setQuestionIndex(state.questionIndex ?? 0)
      setTeamIndex(state.teamIndex ?? 0)
      setScores(state.scores ?? initialScores)
      setFinished(Boolean(state.finished))
    } catch { localStorage.removeItem('factor-rally-state') }
  }, [])

  useEffect(() => {
    localStorage.setItem('factor-rally-state', JSON.stringify({ questionIndex, teamIndex, scores, finished }))
  }, [questionIndex, teamIndex, scores, finished])

  const selectNumber = (number) => {
    if (feedback?.correct) return
    setFeedback(null)
    setSelected((current) => current.includes(number)
      ? current.filter((value) => value !== number)
      : current.length < 2 ? [...current, number] : [current[1], number])
  }

  const checkAnswer = () => {
    if (selected.length !== 2) return
    const [a, b] = selected
    const productRight = a * b === question.product
    const sumRight = a + b === question.sum
    if (productRight && sumRight) {
      const earned = pointsForAttempt(attempt)
      setScores((current) => current.map((item, index) => index === teamIndex
        ? { score: item.score + earned, correct: item.correct + 1 }
        : item))
      setFeedback({ correct: true, text: `เยี่ยมมาก! รับ ${earned} คะแนน` })
      return
    }
    let text = 'ลองดูทั้งผลคูณและผลบวกอีกครั้ง'
    if (productRight) text = 'ผลคูณถูกแล้ว แต่ผลบวกยังไม่ใช่ ลองเปลี่ยนหนึ่งจำนวน'
    else if (sumRight) text = 'ผลบวกถูกแล้ว แต่ผลคูณยังไม่ใช่ ลองหาคู่อื่นที่บวกได้เท่าเดิม'
    else if (a * b < question.product) text = 'ผลคูณยังน้อยเกินไป ลองเพิ่มหนึ่งในจำนวนที่เลือก'
    else if (a * b > question.product) text = 'ผลคูณยังมากเกินไป ลองลดหนึ่งในจำนวนที่เลือก'
    setAttempt((value) => value + 1)
    setFeedback({ correct: false, text })
  }

  const nextQuestion = () => {
    if (questionIndex === QUESTIONS.length - 1) {
      setFinished(true)
      return
    }
    setQuestionIndex((value) => value + 1)
    setTeamIndex((value) => (value + 1) % TEAMS.length)
    setSelected([])
    setAttempt(1)
    setFeedback(null)
  }

  const resetGame = () => {
    setQuestionIndex(0); setTeamIndex(0); setSelected([]); setAttempt(1)
    setFeedback(null); setScores(initialScores); setFinished(false); setShowReset(false)
    localStorage.removeItem('factor-rally-state')
  }

  if (finished) return <Results scores={scores} onReset={resetGame} />

  return (
    <main className="paper-grid min-h-screen px-4 py-4 sm:px-6 lg:px-8 lg:py-6">
      <div className="mx-auto max-w-[1500px]">
        <header className="mb-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="grid size-11 place-items-center rounded-2xl bg-[#193b2b] text-xl font-black text-white shadow-sm rotate-[-3deg]">×</div>
            <div>
              <h1 className="text-xl font-black tracking-tight text-[#193b2b] sm:text-2xl">คู่คูณชวนคิด</h1>
              <p className="text-xs font-semibold text-[#6d756f] sm:text-sm">ตามหาสองจำนวนลับให้ครบทั้ง 16 ข้อ</p>
            </div>
          </div>
          <button onClick={() => setShowReset(true)} className="flex min-h-11 items-center gap-2 rounded-xl border border-[#d8d2c5] bg-white/70 px-4 text-sm font-bold text-[#5c635e] hover:bg-white" aria-label="เริ่มเกมใหม่">
            <RotateCcw size={17} /> <span className="hidden sm:inline">เริ่มใหม่</span>
          </button>
        </header>

        <section className="mb-4 grid grid-cols-2 gap-2 lg:grid-cols-4" aria-label="คะแนนแต่ละกลุ่ม">
          {TEAMS.map((team, index) => {
            const active = index === teamIndex
            return <div key={team.name} className={`relative overflow-hidden rounded-2xl border bg-white p-3 transition-all ${active ? 'border-transparent shadow-md ring-2' : 'border-[#ded8cb]'}`} style={{ '--tw-ring-color': active ? team.color : 'transparent' }}>
              {active && <div className="absolute inset-x-0 top-0 h-1" style={{ backgroundColor: team.color }} />}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0"><span className="size-3 shrink-0 rounded-full" style={{ backgroundColor: team.color }} /><span className="truncate font-extrabold">{team.name}</span></div>
                <span className="text-2xl font-black" style={{ color: team.color }}>{scores[index].score}</span>
              </div>
              <div className="mt-1 flex justify-between text-xs font-semibold text-[#7b807c]"><span>{active ? 'กำลังเล่น' : `ตอบถูก ${scores[index].correct}`}</span><span>คะแนน</span></div>
            </div>
          })}
        </section>

        <div className="grid gap-4 lg:grid-cols-[1fr_1.3fr]">
          <section className="flex min-h-[360px] flex-col rounded-[28px] bg-[#193b2b] p-5 text-white shadow-xl shadow-[#193b2b]/10 sm:p-7">
            <div className="flex items-center justify-between">
              <span className="rounded-full bg-white/12 px-3 py-1.5 text-sm font-bold">รอบที่ {round} · ข้อ {questionIndex + 1}/16</span>
              <div className="flex gap-1.5">{[1,2,3,4].map((value) => <span key={value} className={`h-2 w-7 rounded-full ${value <= round ? 'bg-[#ffc45d]' : 'bg-white/20'}`} />)}</div>
            </div>
            <div className="my-auto py-6 text-center">
              <p className="mb-3 text-sm font-bold uppercase tracking-[.18em] text-[#b8d2c4]">โจทย์ของ {currentTeam.name}</p>
              <h2 className="text-2xl font-black sm:text-3xl">จำนวนสองจำนวนที่...</h2>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <div className="rounded-2xl bg-white/10 px-5 py-4"><span className="text-sm text-[#c3d9cd]">คูณกันได้</span><strong className="ml-3 text-4xl text-[#ffc45d]">{question.product}</strong></div>
                <span className="text-2xl font-black text-white/40">และ</span>
                <div className="rounded-2xl bg-white/10 px-5 py-4"><span className="text-sm text-[#c3d9cd]">บวกกันได้</span><strong className="ml-3 text-4xl text-[#ffc45d]">{question.sum}</strong></div>
              </div>
            </div>
            <div className="rounded-2xl bg-black/15 p-3 text-center text-sm font-semibold text-[#d5e3dc]">เลือก 2 จำนวนที่ทำให้เงื่อนไขทั้งคู่เป็นจริง</div>
          </section>

          <section className="rounded-[28px] border border-[#ded8cb] bg-[#fffdf8] p-5 shadow-sm sm:p-7">
            <div className="mb-4 flex items-end justify-between">
              <div><p className="text-sm font-bold text-[#7b807c]">คำตอบของทีม</p><h3 className="text-xl font-black">เลือกจำนวน 2 จำนวน</h3></div>
              <span className="rounded-full bg-[#f1ece1] px-3 py-1 text-xs font-bold text-[#706e67]">ครั้งที่ {attempt}</span>
            </div>
            <div className="grid grid-cols-5 gap-2.5 sm:gap-3">
              {choices.map((number) => {
                const isSelected = selected.includes(number)
                return <button key={number} onClick={() => selectNumber(number)} aria-pressed={isSelected} className={`number-button aspect-square min-h-14 rounded-2xl border-2 text-2xl font-black sm:text-3xl ${isSelected ? 'selected border-[#193b2b] bg-[#236342] text-white' : 'border-[#ded8cb] bg-white text-[#27342d] hover:border-[#8a9c92]'}`}>{number}</button>
              })}
            </div>

            <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-2xl bg-[#f2eee5] p-3">
              <AnswerSlot value={selected[0]} /><X className="mx-auto text-[#a49e92]" size={20} /><AnswerSlot value={selected[1]} />
            </div>

            {feedback && <div className={`pop mt-4 flex min-h-14 items-center gap-3 rounded-2xl px-4 py-3 font-bold ${feedback.correct ? 'bg-[#e5f5ea] text-[#17613e]' : 'bg-[#fff1d5] text-[#795313]'}`} role="status">
              {feedback.correct ? <Check size={22} /> : <Lightbulb size={22} />}<span className="flex-1">{feedback.text}</span>
            </div>}

            <button onClick={feedback?.correct ? nextQuestion : checkAnswer} disabled={selected.length !== 2} className="mt-4 flex min-h-16 w-full items-center justify-center gap-2 rounded-2xl bg-[#ef9940] px-6 text-xl font-black text-[#352111] shadow-[0_5px_0_#bd6923] transition hover:bg-[#f5a550] active:translate-y-1 active:shadow-none disabled:cursor-not-allowed disabled:opacity-40">
              {feedback?.correct ? <>ข้อต่อไป <ChevronRight /></> : <>ตรวจคำตอบ <Check /></>}
            </button>
          </section>
        </div>
      </div>
      {showReset && <ConfirmReset onCancel={() => setShowReset(false)} onConfirm={resetGame} />}
    </main>
  )
}

function AnswerSlot({ value }) {
  return <div className={`grid min-h-14 place-items-center rounded-xl border-2 border-dashed text-2xl font-black ${value ? 'border-[#547461] bg-white text-[#193b2b]' : 'border-[#c9c2b5] text-[#aaa398]'}`}>{value ?? '?'}</div>
}

function ConfirmReset({ onCancel, onConfirm }) {
  return <div className="fixed inset-0 z-20 grid place-items-center bg-[#17231d]/55 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="reset-title">
    <div className="w-full max-w-sm rounded-[28px] bg-white p-6 text-center shadow-2xl">
      <div className="mx-auto mb-3 grid size-14 place-items-center rounded-full bg-[#fff0e1] text-[#d76824]"><RotateCcw /></div>
      <h2 id="reset-title" className="text-2xl font-black">เริ่มเกมใหม่?</h2><p className="mt-2 text-[#69716c]">คะแนนและความคืบหน้าทั้งหมดจะถูกล้าง</p>
      <div className="mt-6 grid grid-cols-2 gap-3"><button onClick={onCancel} className="min-h-12 rounded-xl bg-[#eeeae1] font-bold">ยกเลิก</button><button onClick={onConfirm} className="min-h-12 rounded-xl bg-[#d85e35] font-bold text-white">เริ่มใหม่</button></div>
    </div>
  </div>
}

function Results({ scores, onReset }) {
  const topScore = Math.max(...scores.map((item) => item.score))
  const winners = TEAMS.filter((_, i) => scores[i].score === topScore).map((team) => team.name)
  return <main className="paper-grid min-h-screen p-5 sm:p-8">
    <div className="mx-auto max-w-4xl text-center">
      <div className="mx-auto mt-6 grid size-20 place-items-center rounded-full bg-[#ffc45d] text-[#5d3d08] shadow-lg"><Trophy size={42} /></div>
      <p className="mt-5 text-sm font-black uppercase tracking-[.2em] text-[#a76c1d]">จบครบทั้ง 4 รอบแล้ว</p>
      <h1 className="mt-2 text-4xl font-black text-[#193b2b] sm:text-6xl">เก่งมากทุกทีม!</h1>
      <p className="mt-3 text-lg font-semibold text-[#647069]">ผู้ชนะคือ {winners.join(' และ ')} ด้วย {topScore} คะแนน</p>
      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {TEAMS.map((team, index) => <div key={team.name} className="rounded-3xl border bg-white p-5 shadow-sm" style={{ borderColor: scores[index].score === topScore ? team.color : '#ded8cb' }}>
          <div className="mx-auto mb-3 grid size-12 place-items-center rounded-2xl" style={{ color: team.color, backgroundColor: team.pale }}><UsersRound /></div>
          <h2 className="font-black">{team.name}</h2><p className="mt-1 text-4xl font-black" style={{ color: team.color }}>{scores[index].score}</p><p className="text-sm font-semibold text-[#777f79]">ตอบถูก {scores[index].correct} ข้อ</p>
          {scores[index].score === topScore && <div className="mt-3 flex items-center justify-center gap-1 text-xs font-black text-[#a76c1d]"><Sparkles size={14}/> อันดับหนึ่ง</div>}
        </div>)}
      </div>
      <button onClick={onReset} className="mt-8 inline-flex min-h-16 items-center gap-2 rounded-2xl bg-[#193b2b] px-8 text-xl font-black text-white shadow-[0_5px_0_#0d281b] active:translate-y-1 active:shadow-none"><RotateCcw /> เล่นอีกครั้ง</button>
    </div>
  </main>
}

export default App
