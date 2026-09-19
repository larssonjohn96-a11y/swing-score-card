import {describe,it,expect} from 'vitest';
import {chipAverage,chipRecordGoal} from './chip-competition';
import type {CourseRound,CourseSession} from './chip-course';
const round=(points:number,at=1):CourseRound=>({id:`r${at}`,model:4,lie:'Fairway',startedAt:0,finishedAt:at,status:'full',holes:Array.from({length:6},()=>[points,points,points] as any)});
const active=(holes:number[][],phase:CourseSession['phase']='play'):CourseSession=>({id:'active',model:4,lie:'Fairway',startedAt:0,holes:holes as any,phase});
describe('chip competition',()=>{
 it('uses latest five complete current rounds, not personal best',()=>{
  const history=[round(4,1),...Array.from({length:5},(_,i)=>round(2,i+2)),{...round(4,10),status:'front' as const},{...round(4,11),model:3 as const}];
  expect(chipAverage(history)).toEqual({count:5,points:36,stars:2});
 });
 it('requires exceeding rather than tying hole PB',()=>{
  expect(chipRecordGoal(active([[2,2]]),[round(2)])).toContain('Inom 1 m');
 });
 it('does not demand unlikely or impossible hole outcomes',()=>{
  expect(chipRecordGoal(active([[0,0]]),[round(3)])).toBeNull();
  expect(chipRecordGoal(active([[]]),[])).toBeNull();
 });
 it('offers a five point next-hole target and prioritizes round PB',()=>{
  expect(chipRecordGoal(active([[2,2,2],[2,2,2],[2,2,2],[2,2,2],[3,3,2]],'result'),[round(2)])).toBe('5 poäng på nästa hål slår ditt rundrekord!');
 });
 it('does not offer a nonexistent seventh hole',()=>{
  expect(chipRecordGoal(active(Array.from({length:6},()=>[2,2,2]),'result'),[round(2)])).toBeNull();
 });
});

import {chipResultContext,chipStandingChange,chipAverageGoal} from './chip-competition';
describe('rolling averages and replay goals',()=>{
 it('compares against the prior average, then drops the oldest of five',()=>{
  const previous=[round(1,1),round(2,2),round(2,3),round(2,4),round(2,5)];
  const current=round(3,6);const r=chipResultContext(current,[...previous,current]);
  expect(r.before.points).toBe(32.4);expect(r.after.points).toBe(39.6);expect(r.beatAverage).toBe(true);expect(r.after.count).toBe(5);
 });
 it('only calls an actual shortfall of at most three points a near miss',()=>{
   const previous=round(2,1);
   const near:CourseRound={...round(2,2),holes:[[1,1,1],...round(2,2).holes.slice(1)]};
   expect(chipResultContext(near,[previous,near]).message).toContain('Bara 3,0');
   const far:CourseRound={...near,holes:[[0,1,1],...near.holes.slice(1)]};
   expect(chipResultContext(far,[previous,far]).message).not.toContain('Bara');
   expect(chipResultContext(round(2,2),[previous]).message).not.toContain('Bara');
 });
 it('does not celebrate a first, partial, or legacy round as beating average',()=>{
   expect(chipResultContext(round(3,2),[]).beatAverage).toBe(false);
   expect(chipResultContext({...round(3,2),status:'front',holes:[[3,3,3],[3,3,3],[3,3,3]]},[round(2)]).beatAverage).toBe(false);
   expect(chipResultContext({...round(3,2),model:3},[round(2)]).beatAverage).toBe(false);
 });
 it('does not request an impossible score above 72',()=>{
   expect(chipResultContext(round(4,2),[round(4,1)]).target).toBe(72);
   expect(chipResultContext(round(4,2),[round(4,1)]).message).toContain('matcha');
 });
 it('handles ties without claiming a friend was passed',()=>{
   const before={count:5,points:30,stars:2},after={...before,points:32};
   const friends=[{name:'Emma',points:31,count:5},{name:'Axel',points:32,count:5}];
   expect(chipStandingChange(before,after,friends)).toEqual({before:3,after:1,passed:['Emma']});
 });
 it('uses the average as a reachable goal when a PB is too distant',()=>{
   expect(chipAverageGoal(active([[2,2,2],[2,2,2],[2,2,2]],'halfway'),[round(2)])).toBe('19 poäng till slår ditt snitt.');
 });
});
