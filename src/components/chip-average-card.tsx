import { chipAverage } from '@/lib/chip-competition';
import type { CourseRound } from '@/lib/chip-course';
export function ChipAverageCard({history}:{history:CourseRound[]}) {
  const avg=chipAverage(history);
  return <div className="my-4 rounded-2xl border border-blue-100 bg-blue-50 p-4">
    <div className="flex items-center justify-between"><div><p className="text-sm font-bold text-blue-900">Ditt rundsnitt</p><p className="mt-1 text-xs text-slate-500">{avg.count<5?`${avg.count} av 5 hela rundor`:'Senaste 5 hela rundorna'}</p></div><p className="text-2xl font-black text-blue-700">{avg.count?avg.points.toFixed(1).replace('.',','):'–'} <span className="text-sm">poäng</span></p></div>
    {avg.count<5&&<><div className="mt-3 flex gap-1.5" aria-label={`${avg.count} av 5 rundor`}>
      {[0,1,2,3,4].map(i=><span key={i} className={`h-2 flex-1 rounded-full ${i<avg.count?'bg-blue-600':'bg-blue-100'}`}/>)}</div><p className="mt-2 text-xs text-blue-800">{5-avg.count} {avg.count===4?'runda':'rundor'} kvar till ett etablerat snitt.</p></>}
  </div>;
}
