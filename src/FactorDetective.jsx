import { useId, useState } from 'react'
import { ChevronRight, Eye } from 'lucide-react'

const buildQuestions = (questions) => questions.map((question) => ({
  ...question,
  a: question.p * question.q,
  b: question.p * question.s + question.q * question.r,
  c: question.r * question.s,
}))

export const POSITIVE_FACTOR_QUESTIONS = buildQuestions([
  { p: 1, q: 1, r: 1, s: 5 },
  { p: 1, q: 1, r: 2, s: 3 },
  { p: 2, q: 1, r: 1, s: 3 },
  { p: 2, q: 1, r: 2, s: 3 },
  { p: 2, q: 3, r: 1, s: 2 },
  { p: 3, q: 1, r: 1, s: 2 },
  { p: 3, q: 2, r: 1, s: 3 },
  { p: 4, q: 1, r: 1, s: 2 },
  { p: 2, q: 2, r: 1, s: 3 },
  { p: 3, q: 2, r: 2, s: 3 },
])

export const MIXED_FACTOR_QUESTIONS = buildQuestions([
  { p: 1, q: 1, r: -3, s: 5 },
  { p: 1, q: 1, r: 2, s: 3 },
  { p: 1, q: 1, r: -1, s: -4 },
  { p: 2, q: 1, r: 1, s: 3 },
  { p: 2, q: 1, r: -1, s: 4 },
  { p: 3, q: 1, r: 2, s: -1 },
  { p: 2, q: 3, r: 1, s: 2 },
  { p: 2, q: 3, r: -1, s: -2 },
  { p: 3, q: 2, r: -2, s: 1 },
  { p: 4, q: 1, r: -1, s: 2 },
])

export const FACTOR_QUESTIONS = MIXED_FACTOR_QUESTIONS

const POSITIVE_CHOICES = [1, 2, 3, 4, 5, 6, 7]
const MIXED_CHOICES = [-7, -6, -5, -4, -3, -2, -1, 1, 2, 3, 4, 5, 6, 7]
const filled = (answer) => answer.length === 4 && answer.filter(Number.isFinite).length === 4
const signedTerm = (value) => value < 0 ? `− ${Math.abs(value)}` : `+ ${value}`

const polynomial = ({ a, b, c }) => {
  const leading = a === 1 ? 'x²' : a === -1 ? '−x²' : `${a}x²`
  const middle = b === 0 ? '' : ` ${signedTerm(b)}x`
  const last = c === 0 ? '' : ` ${signedTerm(c)}`
  return `${leading}${middle}${last}`
}

const linearFactor = (coefficient, constant) => {
  const xTerm = coefficient === 1 ? 'x' : coefficient === -1 ? '−x' : `${coefficient}x`
  return `(${xTerm} ${signedTerm(constant)})`
}

const candidateAnswer = (answer) => filled(answer)
  ? `${linearFactor(answer[0], answer[2])}${linearFactor(answer[1], answer[3])}`
  : '(□x □)(□x □)'

export function FactorPlayArea({ teams, teamNames, questions, index, answers, revealed, numberMode, onSelect, onReveal, onNext }) {
  const allReady = answers.every(filled)
  const winners = teams
    .map((_, teamIndex) => teamIndex)
    .filter((teamIndex) => isFactorCorrect(answers[teamIndex], questions[teamIndex]))
    .map((teamIndex) => teamNames[teamIndex])
  const choices = numberMode === 'mixed' ? MIXED_CHOICES : POSITIVE_CHOICES

  return <>
    <section className="team-board-grid grid gap-3" aria-label="ตารางแยกตัวประกอบของทั้งสี่กลุ่ม">
      {teams.map((team, teamIndex) => <FactorTeamCard
        key={team.name}
        team={{ ...team, name: teamNames[teamIndex] }}
        questionIndex={index}
        question={questions[teamIndex]}
        choices={choices}
        answer={answers[teamIndex]}
        revealed={revealed}
        onSelect={(slot, number) => onSelect(teamIndex, slot, number)}
      />)}
    </section>

    <div className="mt-3 flex items-center gap-3 rounded-2xl bg-white p-2 shadow-sm">
      <p className="hidden flex-1 pl-2 text-sm font-bold text-[#70776f] sm:block">
        {revealed
          ? (winners.length ? `${winners.join(', ')} ได้กลุ่มละ 1 คะแนน` : 'ข้อนี้ยังไม่มีกลุ่มตอบถูก ลองดูคำใบ้ก่อนเริ่มข้อถัดไป')
          : `พร้อมแล้ว ${answers.filter(filled).length}/4 กลุ่ม`}
      </p>
      <button onClick={revealed ? onNext : onReveal} disabled={!revealed && !allReady} className={`flex min-h-14 flex-1 items-center justify-center gap-2 rounded-xl px-6 text-lg font-black sm:max-w-md ${revealed ? 'bg-[#30265f] text-white' : 'bg-[#ffd05a] text-[#352111]'} disabled:cursor-not-allowed disabled:opacity-35`}>
        {revealed ? <>ข้อต่อไป <ChevronRight/></> : <><Eye/> ครูตรวจพร้อมกัน</>}
      </button>
    </div>
  </>
}

function FactorTeamCard({ team, questionIndex, question, choices, answer, revealed, onSelect }) {
  const [activeSlot, setActiveSlot] = useState(0)
  const arrowMarkerId = useId().replaceAll(':', '')
  const ready = filled(answer)
  const [p, q, r, s] = answer
  const frontOkay = ready && p * q === question.a
  const backOkay = ready && r * s === question.c
  const crossOne = ready ? p * s : null
  const crossTwo = ready ? q * r : null
  const crossSum = ready ? crossOne + crossTwo : null
  const middleOkay = ready && crossSum === question.b
  const correct = frontOkay && backOkay && middleOkay

  let hint = 'แตะช่องในตาราง แล้วเลือกตัวเลขด้านล่าง'
  if (revealed && correct) hint = 'เยี่ยมมาก ตารางและวงเล็บถูกต้อง!'
  else if (revealed && !frontOkay) hint = `ตัวหน้ายังคูณกันไม่ได้ ${question.a}`
  else if (revealed && !backOkay) hint = `ตัวหลังยังคูณกันไม่ได้ ${question.c}`
  else if (revealed && !middleOkay) hint = `หน้าและหลังถูกแล้ว ลองสลับตำแหน่งให้แนวทแยงรวมได้ ${question.b}`
  else if (ready) hint = 'ระบบคำนวณแนวทแยงแล้ว พร้อมให้ครูตรวจ'

  const chooseNumber = (number) => {
    onSelect(activeSlot, number)
    setActiveSlot((activeSlot + 1) % 4)
  }

  return <article className={`relative overflow-hidden rounded-[22px] border-2 p-3 shadow-sm ${revealed ? (correct ? 'answer-correct ring-4 ring-[#52b77d]/30' : 'answer-wrong opacity-90') : ''}`} style={{ borderColor: team.color, backgroundColor: team.pale }}>
    <div className="mb-2 flex items-center gap-2">
      <div className="flex min-w-0 items-center gap-2"><span className="text-2xl">{team.animal}</span><h3 className="truncate text-lg font-black" style={{ color: team.color }}>{team.name}</h3></div>
      <div className="ml-1 flex min-w-0 flex-1 items-center justify-center gap-2 rounded-xl bg-white/80 px-3 py-1.5 shadow-sm">
        <span className="shrink-0 text-[10px] font-black text-[#777083]">ข้อ {questionIndex + 1}/10</span>
        <strong className="truncate text-xl font-black text-[#30265f]">{polynomial(question)}</strong>
        {revealed && <span className="hidden shrink-0 rounded-lg bg-[#fff0b9] px-2 py-1 text-xs font-black text-[#5a4311] xl:inline">เฉลย {linearFactor(question.p, question.r)}{linearFactor(question.q, question.s)}</span>}
      </div>
      <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-black ${revealed ? (correct ? 'bg-[#17613e] text-white' : 'bg-[#b84f37] text-white') : ready ? 'bg-white text-[#3f5b4c]' : 'bg-black/5 text-[#6f766f]'}`}>{revealed ? (correct ? 'ถูก +1' : 'ตรวจตาราง') : ready ? 'พร้อม' : 'เติม 4 ช่อง'}</span>
    </div>

    <div className="factor-card-body grid gap-3">
      <div className="min-w-0">
        <div className="relative rounded-xl bg-white/75 px-3 py-2 shadow-inner">
          <svg className="factor-cross-arrows pointer-events-none absolute z-20 overflow-visible" viewBox="0 0 160 72" aria-hidden="true" style={{ color: team.color }}>
            <defs>
              <marker id={`${arrowMarkerId}-head`} markerWidth="9" markerHeight="9" refX="7" refY="4.5" orient="auto" markerUnits="strokeWidth">
                <path d="M0,0 L9,4.5 L0,9 Z" fill={team.color}/>
              </marker>
            </defs>
            <path d="M28 66 C54 43 106 29 132 6" fill="none" stroke="white" strokeWidth="7" strokeLinecap="round" opacity=".9"/>
            <path d="M132 66 C106 43 54 29 28 6" fill="none" stroke="white" strokeWidth="7" strokeLinecap="round" opacity=".9"/>
            <path d="M28 66 C54 43 106 29 132 6" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" markerEnd={`url(#${arrowMarkerId}-head)`}/>
            <path d="M132 66 C106 43 54 29 28 6" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" markerEnd={`url(#${arrowMarkerId}-head)`}/>
          </svg>
          <table className="w-full table-fixed text-center text-base font-bold" aria-label={`ตารางคำตอบของ ${team.name}`}>
            <tbody>
              <FactorRow label="หน้า" target={question.a} values={[p, q]} slots={[0, 1]} activeSlot={activeSlot} setActiveSlot={setActiveSlot} color={team.color} disabled={revealed}/>
              <tr className="h-10" aria-hidden="true"><td/><td colSpan="5"><span className="sr-only">คูณทแยง</span></td></tr>
              <FactorRow label="หลัง" target={question.c} values={[r, s]} slots={[2, 3]} activeSlot={activeSlot} setActiveSlot={setActiveSlot} color={team.color} disabled={revealed}/>
              <tr className="border-t border-[#ddd7e7]">
                <th className="w-14 py-2 text-left text-[#756d88]">กลาง</th>
                <td className="w-12 text-xl font-black">{question.b}</td><td className="w-6">=</td>
                <td className="py-2 text-left text-sm font-black" colSpan="3" style={{ color: team.color }}>
                  {ready ? <>({p}×{s}) + ({q}×{r}) = {crossOne} {crossTwo < 0 ? '−' : '+'} {Math.abs(crossTwo)} = {crossSum}</> : 'ระบบคำนวณให้อัตโนมัติ'}
                </td>
              </tr>
              <tr className="border-t border-[#ddd7e7]">
                <th className="py-2 text-left text-[#756d88]">ตอบ</th><td className="py-2 text-left text-xl font-black" colSpan="5" style={{ color: team.color }}>{candidateAnswer(answer)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className={`mt-2 min-h-6 text-center text-sm font-black ${revealed && !correct ? 'text-[#a34435]' : 'text-[#52635a]'}`}>{hint}</p>
      </div>
      <div className="factor-number-panel rounded-xl bg-white/45 p-2">
        <p className="mb-2 text-center text-sm font-black" style={{ color: team.color }}>เลือกตัวเลข</p>
        <div className="factor-number-pad grid grid-cols-7 gap-1.5">
          {choices.map((number) => <button key={number} onClick={() => chooseNumber(number)} disabled={revealed} className={`team-number min-h-11 rounded-lg border-2 border-white bg-white/90 text-lg font-black shadow-sm transition active:translate-y-0.5 ${number < 0 ? 'text-[#b23f35]' : 'text-[#29362f]'} hover:bg-white disabled:cursor-default`}>{number}</button>)}
        </div>
      </div>
    </div>
  </article>
}

function FactorRow({ label, target, values, slots, activeSlot, setActiveSlot, color, disabled }) {
  return <tr>
    <th className="w-14 py-2 text-left text-[#756d88]">{label}</th>
    <td className="w-12 text-xl font-black">{target}</td><td className="w-6">=</td>
    <td className="w-16"><Slot value={values[0]} slot={slots[0]} activeSlot={activeSlot} setActiveSlot={setActiveSlot} color={color} disabled={disabled}/></td>
    <td className="w-8 text-lg">×</td>
    <td className="w-16"><Slot value={values[1]} slot={slots[1]} activeSlot={activeSlot} setActiveSlot={setActiveSlot} color={color} disabled={disabled}/></td>
  </tr>
}

function Slot({ value, slot, activeSlot, setActiveSlot, color, disabled }) {
  const active = slot === activeSlot && !disabled
  return <button type="button" onClick={() => setActiveSlot(slot)} disabled={disabled} aria-label={`ช่องที่ ${slot + 1}`} className={`mx-auto grid min-h-12 min-w-14 place-items-center rounded-xl border-2 bg-white px-2 text-2xl font-black shadow-sm ${active ? 'ring-2 ring-offset-1' : ''}`} style={{ color, borderColor: active ? color : '#ded8e8', '--tw-ring-color': color }}>{Number.isFinite(value) ? value : '□'}</button>
}

export function isFactorCorrect(answer, question) {
  if (!filled(answer)) return false
  const [p, q, r, s] = answer
  return p * q === question.a && r * s === question.c && p * s + q * r === question.b
}
