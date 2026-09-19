import { useEffect, useState } from 'react';
import { TrendingUp } from 'lucide-react';
import { chipResultContext, chipStandingChange } from '@/lib/chip-competition';
import { fetchFriendSnapshot, listFriendships } from '@/lib/friends-cloud';
import type { CourseRound } from '@/lib/chip-course';
export function ChipRoundImpact({round,history,userId,fresh,personalBest}:{round:CourseRound;history:CourseRound[];userId:string|null;fresh:boolean;personalBest:boolean}) {
  const result=chipResultContext(round,history);
  const [standing,setStanding]=useState<ReturnType<typeof chipStandingChange>|null>(null);
  useEffect(()=>{
    let live=true;
    setStanding(null);
    if(!userId || !fresh || !result.eligible)return;
    void (async()=>{
      const {accepted}=await listFriendships(true);
      const friends=await Promise.all(accepted.map(async f=>{
        const snapshot=await fetchFriendSnapshot(f.other.id,true);
        const metrics=snapshot?.comparisonProfile.training??[];
        return {name:f.other.displayName,points:metrics.find(m=>m.key==='chip-round-points')?.value??0,count:metrics.find(m=>m.key==='chip-round-count')?.value??0};
      }));
      if(live && friends.some(f=>f.count))setStanding(chipStandingChange(result.before,result.after,friends));
    })().catch(()=>{});
    return ()=>{live=false;};
  },[userId,round.id,fresh,result.eligible,result.before.points,result.before.count,result.after.points,result.after.count]);
  if(!result.eligible)return null;
  const fmt=(n:number)=>n.toFixed(1).replace('.',',');
  return <div className={`relative mt-3 overflow-hidden rounded-2xl bg-blue-50 px-3 py-2 text-blue-900 ${fresh&&result.beatAverage&&!personalBest?'chip-average-celebrate':''}`}>
    <style>{`@keyframes chipAverageShine{0%{transform:translateX(-150%) skewX(-20deg)}100%{transform:translateX(300%) skewX(-20deg)}}@keyframes chipAverageLift{0%,100%{transform:scale(1)}45%{transform:scale(1.025)}}.chip-average-celebrate{animation:chipAverageLift 900ms ease-out}.chip-average-celebrate:after{content:'';position:absolute;inset:0;width:40%;background:linear-gradient(90deg,transparent,#fff9,transparent);animation:chipAverageShine 1.4s ease-out;pointer-events:none}@media(prefers-reduced-motion:reduce){.chip-average-celebrate{animation:none}.chip-average-celebrate:after{display:none}}`}</style>
    {result.beatAverage&&<p className="flex items-center justify-center gap-1 text-sm font-black"><TrendingUp className="h-4 w-4"/>Du slog ditt snitt!</p>}
    <p className="text-sm font-bold">{result.before.count?`Rundsnitt ${fmt(result.before.points)} → ${fmt(result.after.points)} p`:`Ditt första rundsnitt: ${fmt(result.after.points)} p`}</p>
    {result.beatAverage&&result.after.points<result.before.points&&<p className="mt-1 text-xs">En äldre, högre runda lämnar snittet.</p>}
    {result.after.count<5&&<p className="mt-1 text-xs">{result.after.count} av 5 rundor till ett etablerat snitt</p>}
    {result.before.count===4&&result.after.count===5&&<p className="mt-1 text-xs font-bold">Fem rundor! Ditt snitt är etablerat.</p>}
    {standing?.before!==null && standing?.before!==undefined && standing.after!==standing.before&&<p className="mt-1 text-xs">Med vännernas aktuella snitt: plats {standing.before} → {standing.after}</p>}
    {!!standing?.passed.length&&<p className="mt-1 text-xs font-bold">Du passerar {standing.passed.slice(0,2).join(' och ')}{standing.passed.length>2?` och ${standing.passed.length-2} till`:''}.</p>}
  </div>;
}
