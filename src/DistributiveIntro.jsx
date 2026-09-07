import { useRef, useState } from 'react'
import { ChevronRight, Eye, Eraser } from 'lucide-react'

export const DISTRIBUTIVE_QUESTIONS = [
  { a: 1, b: 3, common: 1, innerA: 1, innerB: 3 },
  { a: 3, b: 18, common: 3, innerA: 1, innerB: 6 },
  { a: 4, b: 16, common: 4, innerA: 1, innerB: 4 },
  { a: 2, b: -8, common: 2, innerA: 1, innerB: -4 },
  { a: 7, b: -21, common: 7, innerA: 1, innerB: -3 },
  { a: 6, b: -15, common: 3, innerA: 2, innerB: -5 },
  { a: 5, b: -25, common: 5, innerA: 1, innerB: -5 },
  { a: 10, b: 2, common: 2, innerA: 5, innerB: 1 },
  { a: 8, b: 2, common: 2, innerA: 4, innerB: 1 },
  { a: 12, b: -18, common: 6, innerA: 2, innerB: -3 },
]

const expectedTokens = (question) => [
  ...(question.common === 1 ? [] : [question.common]),
  'x',
  ...(question.innerA === 1 ? [] : [question.innerA]),
  'x',
  Math.abs(question.innerB),
]

export const blankDistributiveAnswers = () => Array.from({ length: 4 }, () => [])
export const isDistributiveReady = (answer, question) => answer.length === expectedTokens(question).length && answer.every((token) => token !== null)
export const isDistributiveCorrect = (answer, question) => isDistributiveReady(answer, question)
  && expectedTokens(question).every((token, index) => answer[index] === token)

const polynomial = ({ a, b }) => `${a === 1 ? '' : a}x² ${b < 0 ? '−' : '+'} ${Math.abs(b) === 1 ? '' : Math.abs(b)}x`
const factored = ({ common, innerA, innerB }) => `${common === 1 ? '' : common}x(${innerA === 1 ? '' : innerA}x ${innerB < 0 ? '−' : '+'} ${Math.abs(innerB)})`

const choicesFor = (question) => {
  const required = expectedTokens(question).filter(Number.isFinite)
  const distractors = [1, 2, 3, 4, 5, 6, 7, 8].filter((number) => !required.includes(number))
  return ['x', ...new Set([...required, ...distractors.slice(0, 5)])]
}

export function DistributivePlayArea({ teams, teamNames, questions, index, answers, revealed, onSelect, onReveal, onNext, hideControls = false }) {
  const allReady = answers.every((answer, teamIndex) => isDistributiveReady(answer, questions[teamIndex]))
  const winners = teams.map((_, teamIndex) => teamIndex)
    .filter((teamIndex) => isDistributiveCorrect(answers[teamIndex], questions[teamIndex]))
    .map((teamIndex) => teamNames[teamIndex])

  return <>
    <section className="mb-3 flex min-h-[86px] items-center gap-4 rounded-[24px] bg-[#6d4317] px-5 py-3 text-white shadow-lg">
      <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[#ffd27a] text-2xl font-black text-[#54320e]">⇄</div>
      <div className="min-w-0 flex-1"><p className="text-xs font-black text-[#f3d8ad]">ชุดกิจกรรมที่ 1 · ข้อ {index + 1}/{DISTRIBUTIVE_QUESTIONS.length}</p><h2 className="text-xl font-black">ดึงตัวประกอบร่วม โดยใช้สมบัติการแจกแจง</h2><p className="text-sm font-bold text-[#f7e8cf]">เติมตัวเลขและ x ในช่องว่างให้ได้นิพจน์ที่ถูกต้อง</p></div>
    </section>

    <section className="team-board-grid grid gap-3" aria-label="คำตอบสมบัติการแจกแจงของทั้งสี่กลุ่ม">
      {teams.map((team, teamIndex) => <DistributiveTeamCard
        key={`${team.name}-${index}`}
        team={{ ...team, name: teamNames[teamIndex] }}
        question={questions[teamIndex]}
        answer={answers[teamIndex]}
        revealed={revealed}
        onSelect={(slot, token) => onSelect(teamIndex, slot, token)}
      />)}
    </section>

    {!hideControls && <div className="mt-3 flex items-center gap-3 rounded-2xl bg-white p-2 shadow-sm">
      <p className="hidden flex-1 pl-2 text-sm font-bold text-[#70776f] sm:block">{revealed ? (winners.length ? `${winners.join(', ')} ได้กลุ่มละ 1 คะแนน` : 'ข้อนี้ยังไม่มีกลุ่มตอบถูก') : `พร้อมแล้ว ${answers.filter((answer, teamIndex) => isDistributiveReady(answer, questions[teamIndex])).length}/4 กลุ่ม`}</p>
      <button onClick={revealed ? onNext : onReveal} disabled={!revealed && !allReady} className={`flex min-h-14 flex-1 items-center justify-center gap-2 rounded-xl px-6 text-lg font-black sm:max-w-md ${revealed ? 'bg-[#6d4317] text-white' : 'bg-[#ffd27a] text-[#54320e]'} disabled:cursor-not-allowed disabled:opacity-35`}>
        {revealed ? <>ข้อต่อไป <ChevronRight/></> : <><Eye/> ครูตรวจพร้อมกัน</>}
      </button>
    </div>}
  </>
}

function DistributiveTeamCard({ team, question, answer, revealed, onSelect }) {
  const expected = expectedTokens(question)
  const [activeSlot, setActiveSlot] = useState(0)
  const activeSlotRef = useRef(0)
  const selectSlot = (slot) => {
    activeSlotRef.current = slot
    setActiveSlot(slot)
  }
  const ready = isDistributiveReady(answer, question)
  const correct = isDistributiveCorrect(answer, question)
  let slot = 0
  const answerSlot = () => {
    const currentSlot = slot++
    return <TokenSlot key={currentSlot} value={answer[currentSlot]} slot={currentSlot} activeSlot={activeSlot} setActiveSlot={selectSlot} color={team.color} disabled={revealed}/>
  }
  const chooseToken = (token) => {
    const selectedSlot = activeSlotRef.current
    onSelect(selectedSlot, token)
    selectSlot((selectedSlot + 1) % expected.length)
  }

  return <article className={`rounded-[22px] border-2 p-3 shadow-sm ${revealed ? (correct ? 'answer-correct ring-4 ring-[#52b77d]/30' : 'answer-wrong') : ''}`} style={{ borderColor: team.color, backgroundColor: team.pale }}>
    <div className="mb-2 flex items-center gap-2">
      <span className="text-2xl">{team.animal}</span><h3 className="min-w-0 flex-1 truncate text-lg font-black" style={{ color: team.color }}>{team.name}</h3>
      <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-black ${revealed ? (correct ? 'bg-[#17613e] text-white' : 'bg-[#b84f37] text-white') : ready ? 'bg-white text-[#3f5b4c]' : 'bg-black/5 text-[#6f766f]'}`}>{revealed ? (correct ? 'ถูก +1' : 'ลองดูเฉลย') : ready ? 'พร้อม' : `เติม ${expected.length} ช่อง`}</span>
    </div>

    <div className="rounded-xl bg-white/75 p-3 text-center shadow-inner">
      <div className="flex flex-wrap items-center justify-center gap-1 text-2xl font-black text-[#26322b]">
        <span>{polynomial(question)}</span><span className="mx-1 text-[#8a8177]">=</span>
        {question.common !== 1 && answerSlot()}{answerSlot()}<span>(</span>{question.innerA !== 1 && answerSlot()}{answerSlot()}<span className="mx-0.5">{question.innerB < 0 ? '−' : '+'}</span>{answerSlot()}<span>)</span>
      </div>
      <p className={`mt-2 min-h-6 text-sm font-black ${revealed && !correct ? 'text-[#a34435]' : 'text-[#52635a]'}`}>{revealed ? `เฉลย: ${polynomial(question)} = ${factored(question)}` : 'แตะช่องว่าง แล้วเลือกตัวเลขหรือ x'}</p>
    </div>

    <div className="mt-2 rounded-xl bg-white/45 p-2">
      <div className="grid grid-cols-5 gap-1.5">
        {choicesFor(question).map((token) => <button key={token} onClick={() => chooseToken(token)} disabled={revealed} className="team-number min-h-10 rounded-lg border-2 border-white bg-white/90 text-lg font-black shadow-sm hover:bg-white disabled:cursor-default" style={{ color: token === 'x' ? team.color : '#29362f' }}>{token}</button>)}
        <button onClick={() => onSelect(activeSlot, null)} disabled={revealed} className="team-number grid min-h-10 place-items-center rounded-lg border-2 border-white bg-white/70 text-[#8b6250] shadow-sm disabled:cursor-default" aria-label="ล้างช่อที่เลือก"><Eraser size={18}/></button>
      </div>
    </div>
  </article>
}

function TokenSlot({ value, slot, activeSlot, setActiveSlot, color, disabled }) {
  const active = slot === activeSlot && !disabled
  return <button type="button" onClick={() => setActiveSlot(slot)} disabled={disabled} className={`inline-grid min-h-11 min-w-10 place-items-center rounded-lg border-2 bg-white px-1 text-xl font-black shadow-sm ${active ? 'ring-2 ring-offset-1' : ''}`} style={{ color, borderColor: active ? color : '#d8d3ca', '--tw-ring-color': color }}>{value ?? '□'}</button>
}
