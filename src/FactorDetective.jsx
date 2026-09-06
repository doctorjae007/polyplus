import { useState } from 'react'
import { ChevronRight, Eye, Search } from 'lucide-react'

export const FACTOR_QUESTIONS = [
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
].map((question) => ({
  ...question,
  a: question.p * question.q,
  b: question.p * question.s + question.q * question.r,
  c: question.r * question.s,
}))

const FACTOR_CHOICES = [-7, -6, -5, -4, -3, -2, -1, 1, 2, 3, 4, 5, 6, 7]
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

export function FactorPlayArea({ teams, teamNames, question, index, answers, revealed, onSelect, onReveal, onNext }) {
  const allReady = answers.every(filled)
  const winners = teams
    .map((_, teamIndex) => teamIndex)
    .filter((teamIndex) => isFactorCorrect(answers[teamIndex], question))
    .map((teamIndex) => teamNames[teamIndex])

  return <>
    <section className="factor-banner flex min-h-[116px] items-center justify-between gap-4 rounded-[24px] bg-[#30265f] px-5 py-4 text-white shadow-lg">
      <div className="shrink-0">
        <p className="text-xs font-bold text-[#d6cff8]">ข้อ {index + 1}/10</p>
        <h2 className="mt-1 flex items-center gap-2 text-lg font-black"><Search size={20}/> ตารางคูณทแยง</h2>
        <p className="mt-1 text-xs font-bold text-[#c9c0ef]">เติมตัวหน้าและตัวหลัง ระบบหาพจน์กลางให้</p>
      </div>
      <div className="flex flex-1 items-center justify-center">
        <div className="rounded-2xl bg-white px-8 py-3 text-center text-[#30265f] shadow-inner">
          <p className="text-xs font-black uppercase tracking-wider text-[#8276b4]">แยกตัวประกอบ</p>
          <strong className="text-3xl font-black sm:text-4xl">{polynomial(question)}</strong>
        </div>
      </div>
      <div className={`hidden min-w-40 rounded-xl px-3 py-2 text-center sm:block ${revealed ? 'pop bg-[#ffd86a] text-[#39270a]' : 'bg-white/10 text-[#d6cff8]'}`}>
        <p className="text-[10px] font-black uppercase">{revealed ? 'เฉลย' : 'คูณทแยง ↘ ↙'}</p>
        <strong className="text-sm">{revealed ? `${linearFactor(question.p, question.r)}${linearFactor(question.q, question.s)}` : 'หน้า × หลัง แล้วบวกกัน'}</strong>
      </div>
    </section>

    <section className="team-board-grid mt-3 grid gap-3" aria-label="ตารางแยกตัวประกอบของทั้งสี่กลุ่ม">
      {teams.map((team, teamIndex) => <FactorTeamCard
        key={team.name}
        team={{ ...team, name: teamNames[teamIndex] }}
        question={question}
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

function FactorTeamCard({ team, question, answer, revealed, onSelect }) {
  const [activeSlot, setActiveSlot] = useState(0)
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

  return <article className={`relative overflow-hidden rounded-[22px] border-2 p-3 shadow-sm ${revealed ? (correct ? 'ring-4 ring-[#52b77d]/30' : 'opacity-90') : ''}`} style={{ borderColor: team.color, backgroundColor: team.pale }}>
    <div className="mb-2 flex items-center justify-between gap-2">
      <div className="flex min-w-0 items-center gap-2"><span className="text-2xl">{team.animal}</span><h3 className="truncate text-lg font-black" style={{ color: team.color }}>{team.name}</h3></div>
      <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-black ${revealed ? (correct ? 'bg-[#17613e] text-white' : 'bg-[#b84f37] text-white') : ready ? 'bg-white text-[#3f5b4c]' : 'bg-black/5 text-[#6f766f]'}`}>{revealed ? (correct ? 'ถูก +1' : 'ตรวจตาราง') : ready ? 'พร้อม' : 'เติม 4 ช่อง'}</span>
    </div>

    <div className="rounded-xl bg-white/75 px-2 py-2 shadow-inner">
      <table className="w-full table-fixed text-center text-sm font-bold" aria-label={`ตารางคำตอบของ ${team.name}`}>
        <tbody>
          <FactorRow label="หน้า" target={question.a} values={[p, q]} slots={[0, 1]} activeSlot={activeSlot} setActiveSlot={setActiveSlot} color={team.color} disabled={revealed}/>
          <tr aria-hidden="true"><td/><td className="py-0 text-[10px] font-black text-[#968cae]" colSpan="5">↘ คูณทแยง ↙</td></tr>
          <FactorRow label="หลัง" target={question.c} values={[r, s]} slots={[2, 3]} activeSlot={activeSlot} setActiveSlot={setActiveSlot} color={team.color} disabled={revealed}/>
          <tr className="border-t border-[#ddd7e7]">
            <th className="w-12 py-1 text-left text-[#756d88]">กลาง</th>
            <td className="w-10 font-black">{question.b}</td><td className="w-5">=</td>
            <td className="py-1 text-left text-xs font-black" colSpan="3" style={{ color: team.color }}>
              {ready ? <>{p}×{s} + {q}×{r} = {crossOne} {crossTwo < 0 ? '−' : '+'} {Math.abs(crossTwo)} = {crossSum}</> : 'ระบบคำนวณให้อัตโนมัติ'}
            </td>
          </tr>
          <tr className="border-t border-[#ddd7e7]">
            <th className="py-1 text-left text-[#756d88]">ตอบ</th><td className="py-1 text-left text-base font-black" colSpan="5" style={{ color: team.color }}>{candidateAnswer(answer)}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <p className={`mt-2 min-h-5 text-center text-xs font-black ${revealed && !correct ? 'text-[#a34435]' : 'text-[#52635a]'}`}>{hint}</p>
    <div className="mt-2 grid grid-cols-7 gap-1.5">
      {FACTOR_CHOICES.map((number) => <button key={number} onClick={() => chooseNumber(number)} disabled={revealed} className={`team-number min-h-9 rounded-lg border-2 border-white bg-white/85 text-base font-black transition active:translate-y-0.5 ${number < 0 ? 'text-[#b23f35]' : 'text-[#29362f]'} hover:bg-white disabled:cursor-default`}>{number}</button>)}
    </div>
  </article>
}

function FactorRow({ label, target, values, slots, activeSlot, setActiveSlot, color, disabled }) {
  return <tr>
    <th className="w-12 py-1 text-left text-[#756d88]">{label}</th>
    <td className="w-10 font-black">{target}</td><td className="w-5">=</td>
    <td className="w-12"><Slot value={values[0]} slot={slots[0]} activeSlot={activeSlot} setActiveSlot={setActiveSlot} color={color} disabled={disabled}/></td>
    <td className="w-6">×</td>
    <td className="w-12"><Slot value={values[1]} slot={slots[1]} activeSlot={activeSlot} setActiveSlot={setActiveSlot} color={color} disabled={disabled}/></td>
  </tr>
}

function Slot({ value, slot, activeSlot, setActiveSlot, color, disabled }) {
  const active = slot === activeSlot && !disabled
  return <button type="button" onClick={() => setActiveSlot(slot)} disabled={disabled} aria-label={`ช่องที่ ${slot + 1}`} className={`mx-auto grid min-h-9 min-w-10 place-items-center rounded-lg border-2 bg-white px-1 text-lg font-black shadow-sm ${active ? 'ring-2 ring-offset-1' : ''}`} style={{ color, borderColor: active ? color : '#ded8e8', '--tw-ring-color': color }}>{Number.isFinite(value) ? value : '□'}</button>
}

export function isFactorCorrect(answer, question) {
  if (!filled(answer)) return false
  const [p, q, r, s] = answer
  return p * q === question.a && r * s === question.c && p * s + q * r === question.b
}
