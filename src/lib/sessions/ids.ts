/**
 * ID-hantering för sessionslagret.
 *
 * Molntabellen kräver UUID som primärnyckel. De flesta lokala sessioner har
 * redan ett crypto.randomUUID()-id, men några äldre moduler skapade id:n som
 * `${Date.now()}` eller `${iso}-${slump}`. Dessa mappas deterministiskt till
 * ett UUID så att samma lokala session alltid får samma molnrad – utan att
 * det lokala id:t någonsin skrivs om.
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

/** cyrb53 – snabb 53-bitars stränghash, deterministisk och synkron. */
function cyrb53(str: string, seed: number): number {
  let h1 = 0xdeadbeef ^ seed;
  let h2 = 0x41c6ce57 ^ seed;
  for (let i = 0; i < str.length; i += 1) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}

function hex(value: number, width: number) {
  return Math.floor(value).toString(16).padStart(width, "0").slice(-width);
}

/**
 * Deterministiskt UUID (v5-liknande format) ur en godtycklig sträng.
 * Används enbart för legacy-id:n som inte redan är UUID.
 */
export function deterministicUuid(input: string): string {
  const a = cyrb53(input, 0x1a2b3c);
  const b = cyrb53(input, 0x4d5e6f);
  const c = cyrb53(input, 0x778899);
  const digits = `${hex(a, 14)}${hex(b, 14)}${hex(c, 4)}`; // 32 hex-tecken
  const timeLow = digits.slice(0, 8);
  const timeMid = digits.slice(8, 12);
  const timeHi = `5${digits.slice(13, 16)}`; // versionsnibble 5
  const variantNibble = (8 + (parseInt(digits.slice(16, 17), 16) % 4)).toString(16);
  const clockSeq = `${variantNibble}${digits.slice(17, 20)}`;
  const node = digits.slice(20, 32);
  return `${timeLow}-${timeMid}-${timeHi}-${clockSeq}-${node}`;
}

/** Moln-id för en lokal session: samma UUID om det redan är ett, annars härlett. */
export function cloudIdFor(testId: string, legacyId: string): string {
  return isUuid(legacyId) ? legacyId.toLowerCase() : deterministicUuid(`${testId}:${legacyId}`);
}

/** Nytt id för sessioner som skapas i appen. */
export function newSessionId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return deterministicUuid(`${Date.now()}-${Math.random()}-${Math.random()}`);
}
