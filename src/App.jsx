import { useEffect, useMemo, useState } from 'react'
import { ChevronRight, Eye, RotateCcw, Sparkles, Trophy } from 'lucide-react'

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

const blankAnswers = () => TEAMS.map(() => [])
const STORAGE_KEY = 'factor-rally-state-v4'
const isCorrect = (answer, q) => answer.length === 2 && answer[0] * answer[1] === q.product && answer[0] + answer[1] === q.sum

export default function App() {
  const [questionIndex, setQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState(blankAnswers)
  const [scores, setScores] = useState(() => TEAMS.map(() => 0))
  const [revealed, setRevealed] = useState(false)
  const [finished, setFinished] = useState(false)
  const [showReset, setShowReset] = useState(false)
  const question = QUESTIONS[questionIndex]
  const choices = useMemo(() => Array.from({ length: 10 }, (_, i) => i + 1), [])
  const allReady = answers.every((answer) => answer.length === 2)

  useEffect(() => {
    try {
      const state = JSON.parse(localStorage.getItem(STORAGE_KEY))
      if (!state) return
      setQuestionIndex(state.questionIndex ?? 0)
      setAnswers(state.answers ?? blankAnswers())
      setScores(state.scores ?? TEAMS.map(() => 0))
      setRevealed(Boolean(state.revealed))
      setFinished(Boolean(state.finished))
    } catch { localStorage.removeItem(STORAGE_KEY) }
  }, [])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ questionIndex, answers, scores, revealed, finished }))
  }, [questionIndex, answers, scores, revealed, finished])

  const selectNumber = (teamIndex, number) => {
    if (revealed) return
    setAnswers((current) => current.map((answer, index) => {
      if (index !== teamIndex) return answer
      if (answer.includes(number)) return answer.filter((value) => value !== number)
      return answer.length < 2 ? [...answer, number] : [answer[1], number]
    }))
  }

  const reveal = () => {
    if (!allReady || revealed) return
    setScores((current) => current.map((score, index) => score + (isCorrect(answers[index], question) ? 1 : 0)))
    setRevealed(true)
  }

  const nextQuestion = () => {
    if (questionIndex === QUESTIONS.length - 1) return setFinished(true)
    setQuestionIndex((value) => value + 1)
    setAnswers(blankAnswers())
    setRevealed(false)
  }

  const reset = () => {
    setQuestionIndex(0); setAnswers(blankAnswers()); setScores(TEAMS.map(() => 0))
    setRevealed(false); setFinished(false); setShowReset(false); localStorage.removeItem(STORAGE_KEY)
  }

  if (finished) return <Results scores={scores} onReset={reset} />

  return <main className="paper-grid min-h-screen p-3 lg:p-4">
    <div className="game-shell mx-auto max-w-[1600px] gap-4">
      <ScoreSidebar scores={scores} answers={answers} question={question} revealed={revealed} />

      <div className="min-w-0">
        <header className="mb-3 flex h-12 items-center justify-between gap-3">
          <div className="flex items-center gap-3"><div className="grid size-10 place-items-center rounded-xl bg-[#193b2b] text-xl font-black text-white">×</div><div><h1 className="text-xl font-black text-[#193b2b]">คู่คูณชวนคิด</h1><p className="text-xs font-bold text-[#6d756f]">ทุกกลุ่มเลือกพร้อมกัน · ครูเฉลยครั้งเดียว</p></div></div>
          <button onClick={() => setShowReset(true)} className="flex min-h-10 items-center gap-2 rounded-xl border border-[#d8d2c5] bg-white px-3 text-sm font-bold text-[#5c635e]"><RotateCcw size={16}/> เริ่มใหม่</button>
        </header>

        <QuestionBanner question={question} index={questionIndex} revealed={revealed} />

        <section className="team-board-grid mt-3 grid gap-3" aria-label="คำตอบของทั้งสี่กลุ่ม">
          {TEAMS.map((team, index) => <TeamCard key={team.name} team={team} answer={answers[index]} choices={choices} revealed={revealed} correct={revealed && isCorrect(answers[index], question)} onSelect={(number) => selectNumber(index, number)} />)}
        </section>

        <div className="mt-3 flex items-center gap-3 rounded-2xl bg-white p-2 shadow-sm">
          <p className="hidden flex-1 pl-2 text-sm font-bold text-[#70776f] sm:block">{revealed ? resultText(answers, question) : `พร้อมแล้ว ${answers.filter((a) => a.length === 2).length}/4 กลุ่ม`}</p>
          <button onClick={revealed ? nextQuestion : reveal} disabled={!revealed && !allReady} className={`flex min-h-14 flex-1 items-center justify-center gap-2 rounded-xl px-6 text-lg font-black sm:max-w-md ${revealed ? 'bg-[#193b2b] text-white' : 'bg-[#ef9940] text-[#352111]'} disabled:cursor-not-allowed disabled:opacity-35`}>
            {revealed ? <>ข้อต่อไป <ChevronRight/></> : <><Eye/> ครูเฉลยพร้อมกัน</>}
          </button>
        </div>
      </div>
    </div>
    {showReset && <ConfirmReset onCancel={() => setShowReset(false)} onConfirm={reset} />}
  </main>
}

function ScoreSidebar({ scores, answers, question, revealed }) {
  return <aside className="score-sidebar rounded-[24px] bg-[#173c2c] p-3 text-white shadow-xl" aria-label="แถบคะแนนด้านซ้าย">
    <div className="flex items-center justify-between px-2 py-2"><div><p className="text-[10px] font-black uppercase tracking-[.18em] text-[#acc8b9]">Score board</p><h2 className="text-lg font-black">พลังของทีม</h2></div><Trophy className="text-[#ffc45d]" size={26}/></div>
    <div className="score-team-grid mt-2 grid grid-cols-2 gap-2">
      {TEAMS.map((team, index) => {
        const correct = revealed && isCorrect(answers[index], question)
        return <div key={team.name} className="rounded-2xl p-3 text-[#1d2922]" style={{ backgroundColor: team.pale }}>
          <div className="flex items-center gap-2"><span className="text-3xl" role="img">{team.animal}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-black" style={{ color: team.color }}>{team.name}</p><p className="text-[11px] font-bold text-[#657068]">{revealed ? (correct ? '+1 พลัง!' : 'ไม่ได้แต้ม') : (answers[index].length === 2 ? 'เลือกแล้ว ✓' : 'กำลังคิด')}</p></div><strong className="text-3xl font-black" style={{ color: team.color }}>{scores[index]}</strong></div>
          <div className="mt-2 h-3 overflow-hidden rounded-full bg-white/80"><div className="h-full rounded-full transition-all duration-500" style={{ width: `${scores[index] / 16 * 100}%`, backgroundColor: team.color }}/></div>
        </div>
      })}
    </div>
    <div className="mt-3 rounded-xl bg-white/10 p-2 text-center text-xs font-bold text-[#c9ddd2]">เต็ม 16 พลัง · ถูก 1 ข้อ ได้ 1 พลัง</div>
  </aside>
}

function QuestionBanner({ question, index, revealed }) {
  return <section className="flex min-h-[116px] items-center justify-between gap-4 rounded-[24px] bg-[#193b2b] px-5 py-4 text-white shadow-lg">
    <div className="shrink-0"><p className="text-xs font-bold text-[#b8d2c4]">รอบ {Math.floor(index / 4) + 1} · ข้อ {index + 1}/16</p><h2 className="mt-1 text-lg font-black">หาจำนวน 2 จำนวน</h2></div>
    <div className="flex flex-1 flex-wrap items-center justify-center gap-2"><div className="rounded-xl bg-white/10 px-4 py-2 text-sm">คูณกันได้ <strong className="ml-2 text-3xl text-[#ffc45d]">{question.product}</strong></div><span className="font-black text-white/50">และ</span><div className="rounded-xl bg-white/10 px-4 py-2 text-sm">บวกกันได้ <strong className="ml-2 text-3xl text-[#ffc45d]">{question.sum}</strong></div></div>
    <div className={`min-w-32 rounded-xl px-4 py-2 text-center ${revealed ? 'pop bg-[#ffc45d] text-[#39270a]' : 'bg-white/10 text-[#c8d9d0]'}`}><p className="text-[10px] font-black uppercase">{revealed ? 'เฉลย' : 'รอทุกทีม'}</p><strong className="text-xl">{revealed ? `${question.m} และ ${question.n}` : '???'}</strong></div>
  </section>
}

function TeamCard({ team, answer, choices, revealed, correct, onSelect }) {
  return <article className={`relative overflow-hidden rounded-[22px] border-2 p-3 shadow-sm ${revealed ? (correct ? 'ring-4 ring-[#52b77d]/30' : 'opacity-85') : ''}`} style={{ borderColor: team.color, backgroundColor: team.pale }}>
    <div className="mb-2 flex items-center justify-between"><div className="flex items-center gap-2"><span className="text-2xl" role="img">{team.animal}</span><h3 className="text-lg font-black" style={{ color: team.color }}>{team.name}</h3></div><div className="flex items-center gap-1.5"><span className="grid size-8 place-items-center rounded-lg bg-white text-lg font-black" style={{ color: team.color }}>{answer[0] ?? '?'}</span><span className="font-black" style={{ color: team.color }}>×</span><span className="grid size-8 place-items-center rounded-lg bg-white text-lg font-black" style={{ color: team.color }}>{answer[1] ?? '?'}</span><span className={`ml-1 rounded-full px-2 py-1 text-[10px] font-black ${revealed ? (correct ? 'bg-[#17613e] text-white' : 'bg-[#b84f37] text-white') : answer.length === 2 ? 'bg-white text-[#3f5b4c]' : 'bg-black/5 text-[#6f766f]'}`}>{revealed ? (correct ? 'ถูก +1' : 'ยังไม่ถูก') : answer.length === 2 ? 'พร้อม' : 'เลือก 2 ตัว'}</span></div></div>
    <div className="grid grid-cols-5 gap-1.5">
      {choices.map((number) => {
        const selected = answer.includes(number)
        return <button key={number} onClick={() => onSelect(number)} disabled={revealed} aria-pressed={selected} className={`team-number min-h-10 rounded-xl border-2 text-lg font-black transition active:translate-y-0.5 ${selected ? 'text-white shadow-sm' : 'border-white bg-white/80 text-[#29362f] hover:bg-white'} disabled:cursor-default`} style={selected ? { backgroundColor: team.color, borderColor: team.color } : undefined}>{number}</button>
      })}
    </div>
  </article>
}

function resultText(answers, question) {
  const winners = TEAMS.filter((_, index) => isCorrect(answers[index], question)).map((team) => team.name)
  return winners.length ? `${winners.join(', ')} ได้กลุ่มละ 1 คะแนน` : 'ข้อนี้ยังไม่มีกลุ่มตอบถูก'
}

function ConfirmReset({ onCancel, onConfirm }) {
  return <div className="fixed inset-0 z-20 grid place-items-center bg-[#17231d]/60 p-4 backdrop-blur-sm"><div className="w-full max-w-sm rounded-[28px] bg-white p-6 text-center shadow-2xl"><RotateCcw className="mx-auto text-[#d76824]" size={38}/><h2 className="mt-3 text-2xl font-black">เริ่มเกมใหม่?</h2><p className="mt-2 text-[#69716c]">คะแนนทั้งหมดจะถูกล้าง</p><div className="mt-5 grid grid-cols-2 gap-3"><button onClick={onCancel} className="min-h-12 rounded-xl bg-[#eeeae1] font-bold">ยกเลิก</button><button onClick={onConfirm} className="min-h-12 rounded-xl bg-[#d85e35] font-bold text-white">เริ่มใหม่</button></div></div></div>
}

function Results({ scores, onReset }) {
  const top = Math.max(...scores)
  const winners = TEAMS.filter((_, index) => scores[index] === top)
  return <main className="paper-grid grid min-h-screen place-items-center p-5"><div className="w-full max-w-4xl text-center"><Trophy className="mx-auto text-[#d88b20]" size={64}/><p className="mt-3 font-black text-[#a76c1d]">จบครบ 16 ข้อ</p><h1 className="text-5xl font-black text-[#193b2b]">เก่งมากทุกทีม!</h1><p className="mt-2 text-lg font-bold text-[#647069]">ผู้ชนะคือ {winners.map((team) => `${team.animal} ${team.name}`).join(' และ ')} · {top} คะแนน</p><div className="mt-7 grid grid-cols-2 gap-3 lg:grid-cols-4">{TEAMS.map((team, index) => <div key={team.name} className="rounded-3xl border-2 p-5" style={{ backgroundColor: team.pale, borderColor: team.color }}><div className="text-5xl">{team.animal}</div><h2 className="mt-2 font-black" style={{ color: team.color }}>{team.name}</h2><p className="text-4xl font-black" style={{ color: team.color }}>{scores[index]}</p></div>)}</div><button onClick={onReset} className="mt-7 inline-flex min-h-14 items-center gap-2 rounded-2xl bg-[#193b2b] px-8 text-lg font-black text-white"><RotateCcw/> เล่นอีกครั้ง</button></div></main>
}
