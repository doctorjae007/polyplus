import { useState } from 'react'
import { ChevronRight, Eye } from 'lucide-react'

const makeQuestions = (pairs) => pairs.map(([m, n]) => ({ m, n, product: m * n, sum: m + n }))

export const POSITIVE_GUIDED_QUESTIONS = makeQuestions([
  [3, 5], [2, 4], [1, 7], [3, 4], [2, 6],
  [4, 5], [2, 7], [3, 6], [4, 7], [5, 6],
])

export const MIXED_GUIDED_QUESTIONS = makeQuestions([
  [-3, 5], [-2, 4], [-1, 6], [-4, 2], [-3, -2],
  [-5, 3], [-4, -1], [-6, 2], [-5, -2], [-6, -3],
])

export const GUIDED_QUESTION_COUNT = 10
const POSITIVE_CHOICES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
const MIXED_CHOICES = [-7, -6, -5, -4, -3, -2, -1, 1, 2, 3, 4, 5, 6, 7]
const mixedChoicesFor = (question) => {
  const distractors = MIXED_CHOICES.filter((number) => number !== question.m && number !== question.n)
  const start = Math.abs(question.product + question.sum) % distractors.length
  const rotated = [...distractors.slice(start), ...distractors.slice(0, start)]
  return [...new Set([question.m, question.n, ...rotated.slice(0, 8)])].sort((a, b) => a - b)
}
const readyAnswer = (answer) => answer.length === 2 && answer.filter(Number.isFinite).length === 2
const signed = (value) => value < 0 ? `− ${Math.abs(value)}` : `+ ${value}`
const polynomial = (question) => `x² ${signed(question.sum)}x ${signed(question.product)}`
const factor = (value) => `(x ${signed(value)})`

export const isGuidedCorrect = (answer, question) => readyAnswer(answer)
  && answer[0] * answer[1] === question.product
  && answer[0] + answer[1] === question.sum

export function GuidedPlayArea({ teams, teamNames, questions, index, answers, revealed, numberMode, onSelect, onReveal, onNext }) {
  const allReady = answers.every(readyAnswer)
  const winners = teams.map((_, teamIndex) => teamIndex)
    .filter((teamIndex) => isGuidedCorrect(answers[teamIndex], questions[teamIndex]))
    .map((teamIndex) => teamNames[teamIndex])

  return <>
    <section className="team-board-grid grid gap-3" aria-label="ขั้นตอนแยกตัวประกอบของทั้งสี่กลุ่ม">
      {teams.map((team, teamIndex) => <GuidedTeamCard
        key={team.name}
        team={{ ...team, name: teamNames[teamIndex] }}
        questionIndex={index}
        question={questions[teamIndex]}
        answer={answers[teamIndex]}
        choices={numberMode === 'mixed' ? mixedChoicesFor(questions[teamIndex]) : POSITIVE_CHOICES}
        revealed={revealed}
        onSelect={(slot, number) => onSelect(teamIndex, slot, number)}
      />)}
    </section>

    <div className="mt-3 flex items-center gap-3 rounded-2xl bg-white p-2 shadow-sm">
      <p className="hidden flex-1 pl-2 text-sm font-bold text-[#70776f] sm:block">{revealed ? (winners.length ? `${winners.join(', ')} ได้กลุ่มละ 1 คะแนน` : 'ข้อนี้ยังไม่มีกลุ่มตอบถูก') : `พร้อมแล้ว ${answers.filter(readyAnswer).length}/4 กลุ่ม`}</p>
      <button onClick={revealed ? onNext : onReveal} disabled={!revealed && !allReady} className={`flex min-h-14 flex-1 items-center justify-center gap-2 rounded-xl px-6 text-lg font-black sm:max-w-md ${revealed ? 'bg-[#174c63] text-white' : 'bg-[#69d0d8] text-[#123740]'} disabled:cursor-not-allowed disabled:opacity-35`}>
        {revealed ? <>ข้อต่อไป <ChevronRight/></> : <><Eye/> ครูตรวจพร้อมกัน</>}
      </button>
    </div>
  </>
}

function GuidedTeamCard({ team, questionIndex, question, answer, choices, revealed, onSelect }) {
  const [activeSlot, setActiveSlot] = useState(0)
  const ready = readyAnswer(answer)
  const [first, second] = answer
  const productOkay = ready && first * second === question.product
  const sumOkay = ready && first + second === question.sum
  const correct = productOkay && sumOkay

  let hint = 'เติมจำนวน 2 จำนวนในช่องสีขาว'
  if (revealed && correct) hint = 'ถูกต้อง! เลขคู่นี้พาไปสู่วงเล็บได้พอดี'
  else if (revealed && !productOkay) hint = `ตรวจผลคูณอีกครั้ง ต้องได้ ${question.product}`
  else if (revealed && !sumOkay) hint = `ผลคูณถูกแล้ว แต่ผลบวกต้องได้ ${question.sum}`
  else if (ready) hint = 'ระบบเชื่อมตัวเลขให้แล้ว พร้อมให้ครูตรวจ'

  const chooseNumber = (number) => {
    onSelect(activeSlot, number)
    setActiveSlot(activeSlot === 0 ? 1 : 0)
  }

  return <article className={`rounded-[22px] border-2 p-3 shadow-sm ${revealed && correct ? 'ring-4 ring-[#52b77d]/30' : ''}`} style={{ borderColor: team.color, backgroundColor: team.pale }}>
    <div className="mb-2 flex items-center gap-2">
      <span className="text-2xl">{team.animal}</span><h3 className="min-w-0 truncate text-lg font-black" style={{ color: team.color }}>{team.name}</h3>
      <div className="ml-1 flex min-w-0 flex-1 items-center justify-center gap-2 rounded-xl bg-white/80 px-3 py-1.5 shadow-sm"><span className="text-[10px] font-black text-[#63747a]">ข้อ {questionIndex + 1}/10</span><strong className="truncate text-xl font-black text-[#174c63]">{polynomial(question)}</strong></div>
      <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-black ${revealed ? (correct ? 'bg-[#17613e] text-white' : 'bg-[#b84f37] text-white') : ready ? 'bg-white text-[#3f5b4c]' : 'bg-black/5 text-[#6f766f]'}`}>{revealed ? (correct ? 'ถูก +1' : 'ตรวจอีกครั้ง') : ready ? 'พร้อม' : 'เติม 2 ช่อง'}</span>
    </div>

    <div className="guided-card-body grid gap-3">
      <div className="rounded-xl bg-white/75 p-3 shadow-inner">
        <div className="grid grid-cols-[58px_1fr] gap-x-2 gap-y-2 text-base font-bold">
          <span className="font-black text-[#58727b]">ขั้นที่ 1</span><span>{polynomial(question)} = (x + □)(x + □)</span>
          <span className="font-black text-[#58727b]">ขั้นที่ 2</span>
          <div>หาจำนวนเต็มสองจำนวนที่คูณกันได้ <strong className="text-xl text-[#174c63]">{question.product}</strong> และบวกกันได้ <strong className="text-xl text-[#174c63]">{question.sum}</strong></div>
          <span/>
          <div className="flex flex-wrap items-center gap-1">จำนวน 2 จำนวนนั้น คือ <AnswerSlot value={first} slot={0} activeSlot={activeSlot} setActiveSlot={setActiveSlot} color={team.color} disabled={revealed}/> กับ <AnswerSlot value={second} slot={1} activeSlot={activeSlot} setActiveSlot={setActiveSlot} color={team.color} disabled={revealed}/></div>
          <span/>
          <div className="rounded-lg bg-[#e9f7f8] px-3 py-2 font-black text-[#176579]">จะได้ {ready ? <><span className="linked-number">{first}</span> × <span className="linked-number">{second}</span> = {first * second} และ <span className="linked-number">{first}</span> + <span className="linked-number">{second}</span> = {first + second}</> : '□ × □ และ □ + □'}</div>
          <span className="font-black text-[#58727b]">ขั้นที่ 3</span>
          <div className="text-xl font-black" style={{ color: team.color }}>จะได้ {ready ? <>{polynomial(question)} = {factor(first)}{factor(second)}</> : <>{polynomial(question)} = (x □)(x □)</>}</div>
        </div>
        <p className={`mt-2 text-center text-sm font-black ${revealed && !correct ? 'text-[#a34435]' : 'text-[#52635a]'}`}>{hint}</p>
      </div>
      <div className="guided-number-panel self-start rounded-xl bg-white/45 p-2"><p className="mb-1.5 text-center text-sm font-black" style={{ color: team.color }}>เลือกตัวเลข</p><div className="guided-number-pad grid grid-cols-3 gap-1">{choices.map((number) => <button key={number} onClick={() => chooseNumber(number)} disabled={revealed} className={`team-number min-h-10 rounded-lg border-2 border-white bg-white/90 text-base font-black shadow-sm ${number < 0 ? 'text-[#b23f35]' : 'text-[#29362f]'}`}>{number}</button>)}</div></div>
    </div>
  </article>
}

function AnswerSlot({ value, slot, activeSlot, setActiveSlot, color, disabled }) {
  const active = slot === activeSlot && !disabled
  return <button type="button" onClick={() => setActiveSlot(slot)} disabled={disabled} className={`mx-1 inline-grid min-h-11 min-w-12 place-items-center rounded-xl border-2 bg-white px-2 text-xl font-black shadow-sm ${active ? 'ring-2 ring-offset-1' : ''}`} style={{ color, borderColor: active ? color : '#d5dfe2', '--tw-ring-color': color }}>{Number.isFinite(value) ? value : '□'}</button>
}
