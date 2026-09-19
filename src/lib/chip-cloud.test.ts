import {describe,it,expect} from 'vitest';
import {chipSession,mergeChipRounds,reconcileChipRounds,type ChipCloudPort} from './chip-cloud';
import {emptyCourse,type CourseRound} from './chip-course';
const round=(id:string,finishedAt=1):CourseRound=>({id,model:4,lie:'Fairway',startedAt:0,finishedAt,status:'full',holes:Array.from({length:6},()=>[2,2,2])});
describe('chip account persistence',()=>{
 it('never contributes a game estimate to official HCP; ids are per account and deterministic',()=>{
   expect(chipSession('a',round('r')).testHandicap).toBeNull();
   expect(chipSession('a',round('r')).testType).toBe('training');
   expect(chipSession('a',round('r')).id).toBe(chipSession('a',round('r')).id);
   expect(chipSession('a',round('r')).id).not.toBe(chipSession('b',round('r')).id);
 });
 it('merges both devices without duplicates and keeps active play',()=>{
   const local={...emptyCourse(),history:[round('local',3)],active:{id:'playing',model:4 as const,lie:'Fairway' as const,startedAt:4,phase:'play' as const,holes:[[]]}};
   const merged=mergeChipRounds(local,[round('remote',2),round('local',3)]);
   expect(merged.history.map(r=>r.id)).toEqual(['remote','local']);expect(merged.active).toEqual(local.active);
 });
 it('preserves and uploads a round completed during the fetch',async()=>{
   let local={...emptyCourse(),history:[round('old')]};
   const uploaded:string[]=[];
   const port:ChipCloudPort={currentUser:async()=>'a',readLocal:()=>local,writeLocal:(_,s)=>{local=s;},upload:async(_,r)=>{uploaded.push(...r.map(x=>x.id));},fetch:async()=>{local={...local,history:[...local.history,round('new',3)]};return [round('remote',2)];}};
   await reconcileChipRounds('a',port);
   expect(uploaded).toEqual(['old','new']);expect(local.history.map(r=>r.id)).toEqual(['old','remote','new']);
 });
 it('does not write another accounts results after an account switch',async()=>{
   let account='a';let writes=0;
   const port:ChipCloudPort={currentUser:async()=>account,readLocal:()=>emptyCourse(),writeLocal:()=>{writes++;},upload:async()=>{},fetch:async()=>{account='b';return [round('remote')];}};
   await expect(reconcileChipRounds('a',port)).rejects.toThrow('Kontot');expect(writes).toBe(0);
 });
 it('keeps local history on network failure',async()=>{
   const local={...emptyCourse(),history:[round('offline')]};let writes=0;
   const port:ChipCloudPort={currentUser:async()=>'a',readLocal:()=>local,writeLocal:()=>{writes++;},upload:async()=>{throw Error('offline');},fetch:async()=>[]};
   await expect(reconcileChipRounds('a',port)).rejects.toThrow('offline');expect(writes).toBe(0);expect(local.history).toHaveLength(1);
 });
});
