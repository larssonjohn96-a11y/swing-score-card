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
