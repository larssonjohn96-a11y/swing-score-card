import { holePoints, roundStars, type CourseRound, type CourseSession } from './chip-course';

export function chipAverage(history: CourseRound[]) {
  const rounds = history.filter(r => r.model === 4 && r.status === 'full' && r.holes.length === 6 && r.holes.every(h => h.length === 3))
    .sort((a,b) => b.finishedAt-a.finishedAt || b.id.localeCompare(a.id)).slice(0,5);
  return { count: rounds.length, points: rounds.length ? rounds.reduce((s,r)=>s+r.holes.reduce((n,h)=>n+holePoints(h),0),0)/rounds.length : 0,
    stars: rounds.length ? rounds.reduce((s,r)=>s+roundStars(r)/6,0)/rounds.length : 0 };
}

export function chipRecordGoal(active: CourseSession, history: CourseRound[]): string | null {
  if (active.model !== 4 || active.phase === 'halfway' || active.phase === 'bonus') return null;
  const comparable = history.filter(r=>r.model===4 && r.id!==active.id);
  const shots = active.holes.at(-1) ?? [];
  const left = 3-shots.length;
  const total = active.holes.reduce((s,h)=>s+holePoints(h),0);
  const full = comparable.filter(r=>r.status==='full' && r.holes.length===6 && r.holes.every(h=>h.length===3));
  const phrase = (need:number) => need === 4 ? 'Sänk nästa boll' : need === 3 ? 'Inom 1 m på nästa boll' : need === 2 ? 'Inom 2 m på nästa boll' : 'Inom 3 m på nästa boll';
  if(full.length) {
    const need = Math.max(...full.map(r=>r.holes.reduce((s,h)=>s+holePoints(h),0)))+1-total;
    if(need>0 && left>0 && need<=3) return `${phrase(need)} slår ditt rundrekord!`;
    if(need>0 && left>0 && need<=Math.min(8,left*3)) return `${need} poäng till på hålet slår ditt rundrekord!`;
    if(need>0 && left===0 && active.holes.length<6 && need<=8) return `${need} poäng på nästa hål slår ditt rundrekord!`;
  }
  const completed = comparable.flatMap(r=>r.holes.filter(h=>h.length===3));
  if(!completed.length || left===0) return null;
  const need=Math.max(...completed.map(holePoints))+1-holePoints(shots);
  if(need<=0) return null;
  if(need<=3) return `${phrase(need)} slår ditt hålrekord!`;
  if(need<=Math.min(8,left*3)) return `${need} poäng till för ditt bästa hål!`;
  return null;
}

export const chipPoints = (round: CourseRound) => round.holes.reduce((sum,h)=>sum+holePoints(h),0);
export const eligibleChipRound = (r: CourseRound) => r.model===4 && r.status==='full' && r.holes.length===6 && r.holes.every(h=>h.length===3);
export function chipResultContext(round: CourseRound, history: CourseRound[]) {
  const eligible=eligibleChipRound(round);
  const prior=history.filter(r=>r.id!==round.id && (r.finishedAt<round.finishedAt || (r.finishedAt===round.finishedAt && r.id.localeCompare(round.id)<0)));
  const before=chipAverage(prior);
  const after=chipAverage([...prior,round]);
  const points=chipPoints(round);
  const beatAverage=eligible && before.count>0 && points>before.points;
  const deficit=before.count ? before.points-points : null;
  const target=after.count?Math.min(72,Math.floor(after.points)+1):null;
  const fmt=(n:number)=>n.toFixed(1).replace('.',',');
  const message=!eligible ? 'Spela sex hål för att bygga ditt snitt.'
    : !before.count ? `${points} poäng – ditt första resultat att slå.`
    : deficit!==null && deficit>0 && deficit<=3 ? `Bara ${fmt(deficit)} poäng från ditt snitt. Försök igen!`
    : after.points>=72 ? "Perfekt snitt! Kan du matcha 72 poäng igen?"
    : beatAverage ? `Sikta på ${target} poäng och slå ditt nya snitt.`
    : `Nästa mål: ${target} poäng – över ditt snitt.`;
  return {before,after,beatAverage,eligible,message,target};
}
export function chipAverageGoal(active: CourseSession, history: CourseRound[]) {
  if(active.model!==4)return null;
  const average=chipAverage(history);
  if(!average.count)return null;
  const total=active.holes.reduce((s,h)=>s+holePoints(h),0);
  const remaining=6-active.holes.filter(h=>h.length===3).length;
  const need=Math.floor(average.points)+1-total;
  if(need<=0)return 'Över ditt snitt! Fortsätt så.';
  if(remaining && need<=remaining*8)return `${need} poäng till slår ditt snitt.`;
  return null;
}
export function chipStandingChange(before: ReturnType<typeof chipAverage>, after: ReturnType<typeof chipAverage>, friends: {name:string;points:number;count:number}[]) {
  const ranked=friends.filter(f=>f.count>0);
  const rank=(points:number)=>1+ranked.filter(f=>f.points>points).length;
  return { before:before.count?rank(before.points):null, after:after.count?rank(after.points):null,
    passed:before.count && after.points>before.points ? ranked.filter(f=>f.points>=before.points && f.points<after.points).map(f=>f.name) : [] };
}

/** Late-round pressure only: at most eight points per hole and three per remaining ball. */
export function chipPressureGoal(active: CourseSession, history: CourseRound[]): string | null {
  if(active.model!==4 || (active.phase!=='play' && active.phase!=='result'))return null;
  const completed=active.holes.filter(h=>h.length===3).length;
  const ballsLeft=18-active.holes.reduce((sum,h)=>sum+h.length,0);
  if(completed<4 || ballsLeft<=0)return null;
  const average=chipAverage(history);
  if(!average.count)return null;
  const need=Math.floor(average.points)+1-active.holes.reduce((sum,h)=>sum+holePoints(h),0);
  if(need<=0 || need>Math.min((6-completed)*8,ballsLeft*3))return null;
  return `${need} poäng till slår ditt snitt.`;
}
export function chipEncouragement(points: number, shotIndex: number): string {
  const comments=[
    ['Nästa sitter!', 'Nytt slag, ny chans!', 'Fortsätt kämpa!'],
    ['Bra kämpat!', 'Du är på gång!', 'Fortsätt så!'],
    ['Bra närspel!', 'Fint slag!', 'Snyggt jobbat!'],
    ['Riktigt bra!', 'Vilken chipp!', 'Suveränt!'],
    ['Fullträff!', 'Den satt!', 'Vilket slag!'],
  ];
  return comments[points]?.[shotIndex%3] ?? 'Bra jobbat!';
}
