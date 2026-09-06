import { useEffect, useMemo, useState } from 'react'
import { ChevronRight, Eye, Plus, RotateCcw, Settings, Sparkles, Trash2, Trophy, UserPlus } from 'lucide-react'

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
const blankMembers = () => TEAMS.map(() => [])
const STORAGE_KEY = 'factor-rally-state-v4'
const MEMBER_EMOJIS = ['😀', '😎', '🐯', '🐰', '🐼', '🦁', '🐸', '🐵', '🦋', '⭐', '🚀', '⚽']
const isCorrect = (answer, q) => answer.length === 2 && answer[0] * answer[1] === q.product && answer[0] + answer[1] === q.sum

export default function App() {
  const [questionIndex, setQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState(blankAnswers)
  const [scores, setScores] = useState(() => TEAMS.map(() => 0))
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
  const questionBank = numberMode === 'integers' ? INTEGER_QUESTIONS : QUESTIONS
  const teamQuestions = TEAMS.map((_, index) => gameMode === 'same' ? questionBank[questionIndex] : questionBank[(questionIndex + index * 4) % questionBank.length])
  const question = teamQuestions[0]
  const choices = useMemo(() => numberMode === 'integers' ? Array.from({ length: 13 }, (_, i) => i - 6) : Array.from({ length: 10 }, (_, i) => i + 1), [numberMode])
  const allReady = answers.every((answer) => answer.length === 2)

  useEffect(() => {
    try {
      const state = JSON.parse(localStorage.getItem(STORAGE_KEY))
      if (!state) return
      const savedTotal = QUESTION_COUNT_OPTIONS.includes(state.totalQuestions) ? state.totalQuestions : 10
      const oldGameFinished = Boolean(state.finished) || (state.questionIndex ?? 0) >= savedTotal
      setQuestionIndex(oldGameFinished ? 0 : (state.questionIndex ?? 0))
      setAnswers(oldGameFinished ? blankAnswers() : (state.answers ?? blankAnswers()))
      setScores(oldGameFinished ? TEAMS.map(() => 0) : (state.scores ?? TEAMS.map(() => 0)))
      setMembers(state.members ?? blankMembers())
      setTeamNames(state.teamNames ?? TEAMS.map((team) => team.name))
      setGameMode(state.gameMode ?? 'same')
      setNumberMode(state.numberMode ?? 'positive')
      setTotalQuestions(savedTotal)
      setRevealed(oldGameFinished ? false : Boolean(state.revealed))
      setFinished(false)
    } catch { localStorage.removeItem(STORAGE_KEY) }
  }, [])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ questionIndex, answers, scores, members, teamNames, gameMode, numberMode, totalQuestions, revealed, finished }))
  }, [questionIndex, answers, scores, members, teamNames, gameMode, numberMode, totalQuestions, revealed, finished])

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
    setScores((current) => current.map((score, index) => score + (isCorrect(answers[index], teamQuestions[index]) ? 1 : 0)))
    setRevealed(true)
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

  if (finished) return <Results scores={scores} members={members} teamNames={teamNames} totalQuestions={totalQuestions} onReset={reset} />

  return <main className="paper-grid min-h-screen p-3 lg:p-4">
    <div className="game-shell mx-auto max-w-[1600px] gap-4">
      <ScoreSidebar scores={scores} answers={answers} members={members} teamNames={teamNames} questions={teamQuestions} totalQuestions={totalQuestions} revealed={revealed} onAdd={setMemberTeam} onRemove={removeMember} />

      <div className="min-w-0">
        <header className="mb-3 flex h-12 items-center justify-between gap-3">
          <div className="flex items-center gap-3"><div className="grid size-10 place-items-center rounded-xl bg-[#193b2b] text-xl font-black text-white">×</div><div><h1 className="text-xl font-black text-[#193b2b]">คู่คูณชวนคิด</h1><p className="text-xs font-bold text-[#6d756f]">ทุกกลุ่มเลือกพร้อมกัน · ครูเฉลยครั้งเดียว</p></div></div>
          <div className="flex gap-2"><button onClick={() => setShowSettings(true)} className="flex min-h-10 items-center gap-2 rounded-xl border border-[#d8d2c5] bg-white px-3 text-sm font-bold text-[#5c635e]"><Settings size={16}/> ตั้งค่าเกม</button><button onClick={() => setShowReset(true)} className="flex min-h-10 items-center gap-2 rounded-xl border border-[#d8d2c5] bg-white px-3 text-sm font-bold text-[#5c635e]"><RotateCcw size={16}/> เริ่มใหม่</button></div>
        </header>

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
      </div>
    </div>
    {showReset && <ConfirmReset onCancel={() => setShowReset(false)} onConfirm={reset} />}
    {memberTeam !== null && <MemberModal team={{ ...TEAMS[memberTeam], name: teamNames[memberTeam] }} onCancel={() => setMemberTeam(null)} onAdd={addMember} />}
    {showSettings && <SettingsModal names={teamNames} mode={gameMode} numberMode={numberMode} totalQuestions={totalQuestions} currentQuestion={questionIndex + 1} onCancel={() => setShowSettings(false)} onApply={applySettings} />}
  </main>
}

function ScoreSidebar({ scores, answers, members, teamNames, questions, totalQuestions, revealed, onAdd, onRemove }) {
  return <aside className="score-sidebar rounded-[24px] bg-[#173c2c] p-3 text-white shadow-xl" aria-label="แถบคะแนนด้านซ้าย">
    <div className="flex items-center justify-between px-2 py-2"><div><p className="text-[10px] font-black uppercase tracking-[.18em] text-[#acc8b9]">Score board</p><h2 className="text-lg font-black">พลังของทีม</h2></div><Trophy className="text-[#ffc45d]" size={26}/></div>
    <div className="score-team-grid mt-2 grid grid-cols-2 gap-2">
      {TEAMS.map((team, index) => {
        const correct = revealed && isCorrect(answers[index], questions[index])
        return <div key={team.name} className="rounded-2xl p-3 text-[#1d2922]" style={{ backgroundColor: team.pale }}>
          <div className="flex items-center gap-2"><span className="text-3xl" role="img">{team.animal}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-black" style={{ color: team.color }}>{teamNames[index]}</p><p className="text-[11px] font-bold text-[#657068]">{revealed ? (correct ? '+1 พลัง!' : 'ไม่ได้แต้ม') : (answers[index].length === 2 ? 'เลือกแล้ว ✓' : 'กำลังคิด')}</p></div><strong className="text-3xl font-black" style={{ color: team.color }}>{scores[index]}</strong></div>
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
  return <article className={`relative overflow-hidden rounded-[22px] border-2 p-3 shadow-sm ${revealed ? (correct ? 'ring-4 ring-[#52b77d]/30' : 'opacity-85') : ''}`} style={{ borderColor: team.color, backgroundColor: team.pale }}>
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

function Results({ scores, members, teamNames, totalQuestions, onReset }) {
  const top = Math.max(...scores)
  const winnerIndexes = TEAMS.map((_, index) => index).filter((index) => scores[index] === top)
  return <main className="paper-grid grid min-h-screen place-items-center p-5">
    <div className="w-full max-w-4xl text-center">
      <Trophy className="mx-auto text-[#d88b20]" size={64}/><p className="mt-3 font-black text-[#a76c1d]">จบครบ {totalQuestions} ข้อ</p><h1 className="text-5xl font-black text-[#193b2b]">เก่งมากทุกทีม!</h1>
      <p className="mt-2 text-lg font-bold text-[#647069]">ผู้ชนะคือ {winnerIndexes.map((index) => `${TEAMS[index].animal} ${teamNames[index]}`).join(' และ ')} · {top} คะแนน</p>
      <div className="mt-7 grid grid-cols-2 gap-3 lg:grid-cols-4">{TEAMS.map((team, index) => <div key={team.name} className="rounded-3xl border-2 p-5" style={{ backgroundColor: team.pale, borderColor: team.color }}><div className="text-5xl">{team.animal}</div><h2 className="mt-2 font-black" style={{ color: team.color }}>{teamNames[index]}</h2><p className="text-4xl font-black" style={{ color: team.color }}>{scores[index]}</p><div className="mt-3 space-y-1">{members[index].map((member) => <div key={member.id} className="flex items-center rounded-lg bg-white/70 px-2 py-1 text-xs font-bold"><span className="mr-1">{member.emoji}</span><span className="flex-1 truncate text-left">{member.name}</span><strong style={{ color: team.color }}>{scores[index]}</strong></div>)}</div></div>)}</div>
      <button onClick={onReset} className="mt-7 inline-flex min-h-14 items-center gap-2 rounded-2xl bg-[#193b2b] px-8 text-lg font-black text-white"><RotateCcw/> เล่นอีกครั้ง</button>
    </div>
  </main>
}
