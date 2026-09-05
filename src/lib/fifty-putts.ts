import { LEGACY_KEYS } from "@/lib/sessions/keys";
import { newSessionId } from "@/lib/sessions/ids";
import { recordSessionSaved } from "@/lib/sessions/sync";
export const FIFTY_PUTT_DISTANCES = [1, 2, 3, 4, 5] as const;
export const FIFTY_PUTT_ROUNDS = 5;
export const FIFTY_PUTT_TOTAL = FIFTY_PUTT_DISTANCES.length * FIFTY_PUTT_ROUNDS;
export const FIFTY_PUTT_PAR_BY_DISTANCE: Record<number, number> = {
  1: 6,
  2: 7,
  3: 8,
  4: 8,
  5: 9,
};
export const FIFTY_PUTT_PAR = 38;

export type FiftyPuttEntry = { round:number; distance:number; strokes:number };
export type FiftyPuttSession = { id:string; createdAt:string; total:number; versusPar:number; byDistance:Array<{distance:number;strokes:number;par:number;versusPar:number}>; entries:FiftyPuttEntry[] };
const STORAGE_KEY = LEGACY_KEYS.fiftyPutt;
export function emptyFiftyPuttEntries():FiftyPuttEntry[]{return Array.from({length:FIFTY_PUTT_ROUNDS},(_,roundIndex)=>FIFTY_PUTT_DISTANCES.map(distance=>({round:roundIndex+1,distance,strokes:1}))).flat()}
export function calculateFiftyPuttSession(entries:FiftyPuttEntry[],createdAt=new Date().toISOString()):FiftyPuttSession{const total=entries.reduce((sum,e)=>sum+e.strokes,0);const byDistance=FIFTY_PUTT_DISTANCES.map(distance=>{const strokes=entries.filter(e=>e.distance===distance).reduce((sum,e)=>sum+e.strokes,0);const par=FIFTY_PUTT_PAR_BY_DISTANCE[distance];return{distance,strokes,par,versusPar:strokes-par}});return{id:newSessionId(),createdAt,total,versusPar:total-FIFTY_PUTT_PAR,byDistance,entries}}
export function loadFiftyPuttSessions():FiftyPuttSession[]{if(typeof window==="undefined")return[];try{const raw=window.localStorage.getItem(STORAGE_KEY);if(!raw)return[];const parsed=JSON.parse(raw) as FiftyPuttSession[];return Array.isArray(parsed)?parsed:[]}catch{return[]}}
export function saveFiftyPuttSession(entries:FiftyPuttEntry[]):FiftyPuttSession{const session=calculateFiftyPuttSession(entries);if(typeof window!=="undefined"){const sessions=loadFiftyPuttSessions();window.localStorage.setItem(STORAGE_KEY,JSON.stringify([...sessions,session]));recordSessionSaved("fifty-putt",session)}return session}
export function bestFiftyPuttScore(sessions:FiftyPuttSession[]){if(!sessions.length)return null;return Math.min(...sessions.map(s=>s.total))}
