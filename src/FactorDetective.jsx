import { ChevronRight, Eye, Search } from 'lucide-react'

export const FACTOR_QUESTIONS = [
  { m: 1, n: 5 },
  { m: 2, n: 3 },
  { m: -1, n: -4 },
  { m: 2, n: -3 },
  { m: -2, n: 5 },
  { m: -3, n: -5 },
  { m: 4, n: -1 },
  { m: 3, n: -6 },
  { m: -4, n: 6 },
  { m: -2, n: -7 },
].map((question) => ({
  ...question,
  product: question.m * question.n,
  sum: question.m + question.n,
}))

const FACTOR_CHOICES = [-7, -6, -5, -4, -3, -2, -1, 1, 2, 3, 4, 5, 6, 7]

const signedTerm = (value) => value < 0 ? `− ${Math.abs(value)}` : `+ ${value}`

const polynomial = ({ sum, product }) => {
  const middle = sum === 0 ? '' : ` ${signedTerm(sum)}x`
  const last = product === 0 ? '' : ` ${signedTerm(product)}`
  return `x²${middle}${last}`
}

const binomial = (value) => `(x ${signedTerm(value)})`

export function FactorPlayArea({ teams, teamNames, question, index, answers, revealed, onSelect, onReveal, onNext }) {
  const allReady = answers.every((answer) => answer.length === 2)
  const winners = teams
    .map((_, teamIndex) => teamIndex)
    .filter((teamIndex) => isFactorCorrect(answers[teamIndex], question))
    .map((teamIndex) => teamNames[teamIndex])

  return <>
    <section className="factor-banner flex min-h-[116px] items-center justify-between gap-4 rounded-[24px] bg-[#30265f] px-5 py-4 text-white shadow-lg">
      <div className="shrink-0">
        <p className="text-xs font-bold text-[#d6cff8]">ข้อ {index + 1}/10</p>
        <h2 className="mt-1 flex items-center gap-2 text-lg font-black"><Search size={20}/> ตามหาคู่ตัวประกอบ</h2>
        <p className="mt-1 text-xs font-bold text-[#c9c0ef]">เติมให้ผลคูณและผลบวกตรงกับโจทย์</p>
      </div>
      <div className="flex flex-1 items-center justify-center">
        <div className="rounded-2xl bg-white px-8 py-3 text-center text-[#30265f] shadow-inner">
          <p className="text-xs font-black uppercase tracking-wider text-[#8276b4]">แยกตัวประกอบ</p>
          <strong className="text-3xl font-black sm:text-4xl">{polynomial(question)}</strong>
        </div>
      </div>
      <div className={`hidden min-w-36 rounded-xl px-4 py-2 text-center sm:block ${revealed ? 'pop bg-[#ffd86a] text-[#39270a]' : 'bg-white/10 text-[#d6cff8]'}`}>
        <p className="text-[10px] font-black uppercase">{revealed ? 'เฉลย' : 'รอทั้ง 4 กลุ่ม'}</p>
        <strong className="text-base">{revealed ? `${binomial(question.m)}${binomial(question.n)}` : '🔎 ? × ?'}</strong>
      </div>
    </section>

    <section className="team-board-grid mt-3 grid gap-3" aria-label="กระดานแยกตัวประกอบของทั้งสี่กลุ่ม">
      {teams.map((team, teamIndex) => <FactorTeamCard
        key={team.name}
        team={{ ...team, name: teamNames[teamIndex] }}
        question={question}
        answer={answers[teamIndex]}
        revealed={revealed}
        onSelect={(number) => onSelect(teamIndex, number)}
      />)}
    </section>

    <div className="mt-3 flex items-center gap-3 rounded-2xl bg-white p-2 shadow-sm">
      <p className="hidden flex-1 pl-2 text-sm font-bold text-[#70776f] sm:block">
        {revealed
          ? (winners.length ? `${winners.join(', ')} ได้กลุ่มละ 1 คะแนน` : 'ข้อนี้ยังไม่มีกลุ่มตอบถูก ลองดูคำใบ้ก่อนเริ่มข้อถัดไป')
          : `พร้อมแล้ว ${answers.filter((answer) => answer.length === 2).length}/4 กลุ่ม`}
      </p>
      <button onClick={revealed ? onNext : onReveal} disabled={!revealed && !allReady} className={`flex min-h-14 flex-1 items-center justify-center gap-2 rounded-xl px-6 text-lg font-black sm:max-w-md ${revealed ? 'bg-[#30265f] text-white' : 'bg-[#ffd05a] text-[#352111]'} disabled:cursor-not-allowed disabled:opacity-35`}>
        {revealed ? <>ข้อต่อไป <ChevronRight/></> : <><Eye/> ครูตรวจพร้อมกัน</>}
      </button>
    </div>
  </>
}

function FactorTeamCard({ team, question, answer, revealed, onSelect }) {
  const first = answer[0]
  const second = answer[1]
  const ready = answer.length === 2
  const productOkay = ready && first * second === question.product
  const sumOkay = ready && first + second === question.sum
  const correct = productOkay && sumOkay

  let hint = 'แตะเลือกจำนวน 2 จำนวน'
  if (revealed && correct) hint = 'เยี่ยมมาก แยกตัวประกอบถูกต้อง!'
  else if (revealed && !productOkay) hint = `ผลคูณยังไม่เท่ากับ ${question.product} ลองเปลี่ยนคู่จำนวน`
  else if (revealed && !sumOkay) hint = `ผลคูณถูกแล้ว แต่ผลบวกยังไม่เท่ากับ ${question.sum}`
  else if (ready) hint = 'พร้อมให้ครูตรวจ'

  return <article className={`relative overflow-hidden rounded-[22px] border-2 p-3 shadow-sm ${revealed ? (correct ? 'ring-4 ring-[#52b77d]/30' : 'opacity-90') : ''}`} style={{ borderColor: team.color, backgroundColor: team.pale }}>
    <div className="mb-2 flex items-center justify-between gap-2">
      <div className="flex min-w-0 items-center gap-2"><span className="text-2xl">{team.animal}</span><h3 className="truncate text-lg font-black" style={{ color: team.color }}>{team.name}</h3></div>
      <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-black ${revealed ? (correct ? 'bg-[#17613e] text-white' : 'bg-[#b84f37] text-white') : ready ? 'bg-white text-[#3f5b4c]' : 'bg-black/5 text-[#6f766f]'}`}>{revealed ? (correct ? 'ถูก +1' : 'ลองใหม่ข้อหน้า') : ready ? 'พร้อม' : 'กำลังเติม'}</span>
    </div>

    <div className="factor-work grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 rounded-xl bg-white/70 px-3 py-2 text-sm font-bold">
      <span className="text-[#756d88]">หน้า</span><span>1 = 1 × 1</span>
      <span className="text-[#756d88]">หลัง</span><span>{question.product} = <AnswerBox value={first} color={team.color}/> × <AnswerBox value={second} color={team.color}/></span>
      <span className="text-[#756d88]">กลาง</span><span>{question.sum} = <AnswerBox value={first} color={team.color}/> + <AnswerBox value={second} color={team.color}/></span>
      <span className="text-[#756d88]">ตอบ</span><strong className="text-base" style={{ color: team.color }}>{ready ? `${binomial(first)}${binomial(second)}` : '(x □)(x □)'}</strong>
    </div>

    <p className={`mt-2 min-h-5 text-center text-xs font-black ${revealed && !correct ? 'text-[#a34435]' : 'text-[#52635a]'}`}>{hint}</p>
    <div className="mt-2 grid grid-cols-7 gap-1.5">
      {FACTOR_CHOICES.map((number) => {
        const selected = answer.includes(number)
        return <button key={number} onClick={() => onSelect(number)} disabled={revealed} aria-pressed={selected} className={`team-number min-h-9 rounded-lg border-2 text-base font-black transition active:translate-y-0.5 ${selected ? 'text-white shadow-sm' : `border-white bg-white/85 ${number < 0 ? 'text-[#b23f35]' : 'text-[#29362f]'} hover:bg-white`} disabled:cursor-default`} style={selected ? { backgroundColor: team.color, borderColor: team.color } : undefined}>{number}</button>
      })}
    </div>
  </article>
}

function AnswerBox({ value, color }) {
  return <span className="mx-0.5 inline-grid min-w-8 place-items-center rounded-md bg-white px-1 py-0.5 text-base font-black shadow-sm" style={{ color }}>{value ?? '□'}</span>
}

export function isFactorCorrect(answer, question) {
  return answer.length === 2 && answer[0] * answer[1] === question.product && answer[0] + answer[1] === question.sum
}
