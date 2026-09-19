import { holePoints, roundStars, type CourseRound, type CourseSession } from './chip-course';

export function chipAverage(history: CourseRound[]) {
  const rounds = history.filter(r => r.model === 4 && r.status === 'full' && r.holes.length === 6 && r.holes.every(h => h.length === 3))
    .sort((a,b) => b.finishedAt-a.finishedAt).slice(0,5);
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
