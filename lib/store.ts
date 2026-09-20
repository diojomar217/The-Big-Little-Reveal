import { randomBytes } from "node:crypto";
import { neon } from "@neondatabase/serverless";
import type { Gender, PublicState, RevealStyle, VoteChoice } from "@/lib/reveal-types";

type EventStatus = PublicState["status"];
type Vote = { choice: VoteChoice; name: string };
type EventRecord = { code: string; title: string; ownerEmail: string; status: EventStatus; gender: Gender | null; revealAt: string | null; revealStyle: RevealStyle; votes: Map<string, Vote> };
declare global { var revealEvents: Map<string, EventRecord> | undefined; }
const events = globalThis.revealEvents ?? new Map<string, EventRecord>();
globalThis.revealEvents = events;
let schemaPromise: Promise<void> | null = null;

function database() { return process.env.DATABASE_URL ? neon(process.env.DATABASE_URL) : null; }
function normalizeCode(code: string) { return code.trim().toUpperCase(); }
function makeCode() { const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; return Array.from(randomBytes(6), (byte) => alphabet[byte % alphabet.length]).join(""); }
async function ensureSchema() {
  const sql = database(); if (!sql) return;
  schemaPromise ??= (async () => {
    await sql`CREATE TABLE IF NOT EXISTS reveal_events (code TEXT PRIMARY KEY, title TEXT NOT NULL, owner_email TEXT, passcode_hash TEXT, status TEXT NOT NULL DEFAULT 'standby', gender TEXT, reveal_at TIMESTAMPTZ, reveal_style TEXT NOT NULL DEFAULT 'heartbeat', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`;
    await sql`ALTER TABLE reveal_events ADD COLUMN IF NOT EXISTS owner_email TEXT`;
    await sql`ALTER TABLE reveal_events ADD COLUMN IF NOT EXISTS reveal_style TEXT NOT NULL DEFAULT 'heartbeat'`;
    await sql`ALTER TABLE reveal_events ALTER COLUMN passcode_hash DROP NOT NULL`;
    await sql`CREATE TABLE IF NOT EXISTS event_votes (event_code TEXT NOT NULL REFERENCES reveal_events(code) ON DELETE CASCADE, voter_id TEXT NOT NULL, choice TEXT NOT NULL CHECK (choice IN ('girl', 'boy')), display_name TEXT NOT NULL DEFAULT '', updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), PRIMARY KEY (event_code, voter_id))`;
  })(); await schemaPromise;
}
function effectiveMemoryStatus(event: EventRecord) { if (event.status === "countdown" && event.revealAt && Date.now() >= Date.parse(event.revealAt)) event.status = "revealed"; return event.status; }
function memoryEvent(code: string) { return events.get(normalizeCode(code)); }

export async function createEvent(title: string, ownerEmail: string) {
  const cleanTitle = title.trim().slice(0, 80); if (cleanTitle.length < 2) throw new Error("Add a name for your reveal.");
  const owner = ownerEmail.trim().toLowerCase(); if (!owner) throw new Error("Sign in to create an event.");
  const sql = database();
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = makeCode();
    if (!sql) { if (events.has(code)) continue; events.set(code, { code, title: cleanTitle, ownerEmail: owner, status: "standby", gender: null, revealAt: null, revealStyle: "heartbeat", votes: new Map() }); return { code, title: cleanTitle }; }
    await ensureSchema(); const rows = await sql`INSERT INTO reveal_events (code, title, owner_email) VALUES (${code}, ${cleanTitle}, ${owner}) ON CONFLICT DO NOTHING RETURNING code`;
    if (rows.length) return { code, title: cleanTitle };
  }
  throw new Error("Could not create a unique event code. Please try again.");
}
export async function eventOwnedBy(code: string, email: string) {
  const owner = email.trim().toLowerCase(), sql = database();
  if (!sql) return memoryEvent(code)?.ownerEmail === owner;
  await ensureSchema(); const rows = await sql`SELECT 1 FROM reveal_events WHERE code = ${normalizeCode(code)} AND owner_email = ${owner}`;
  return rows.length > 0;
}
export async function listOwnedEvents(email: string) {
  const owner = email.trim().toLowerCase(), sql = database();
  if (!sql) return Array.from(events.values()).filter((event) => event.ownerEmail === owner).map((event) => ({ code: event.code, title: event.title, status: effectiveMemoryStatus(event), total: event.votes.size }));
  await ensureSchema();
  const rows = await sql`SELECT e.code, e.title, e.status, COUNT(v.voter_id)::int AS total FROM reveal_events e LEFT JOIN event_votes v ON v.event_code = e.code WHERE e.owner_email = ${owner} GROUP BY e.code, e.title, e.status, e.created_at ORDER BY e.created_at DESC`;
  return rows.map((row) => ({ code: String(row.code), title: String(row.title), status: row.status as EventStatus, total: Number(row.total) }));
}
export async function getPublicState(code: string, voterId?: string): Promise<PublicState | null> {
  const normalized = normalizeCode(code), sql = database();
  if (!sql) {
    const event = memoryEvent(normalized); if (!event) return null;
    const status = effectiveMemoryStatus(event); let girl = 0, boy = 0;
    for (const vote of event.votes.values()) { if (vote.choice === "girl") girl++; else boy++; }
    return { title: event.title, status, gender: status === "revealed" ? event.gender : null, revealAt: event.revealAt, revealStyle: event.revealStyle || "heartbeat", votes: { girl, boy }, total: girl + boy, yourVote: voterId ? event.votes.get(voterId)?.choice ?? null : null };
  }
  await ensureSchema(); await sql`UPDATE reveal_events SET status = 'revealed', updated_at = NOW() WHERE code = ${normalized} AND status = 'countdown' AND reveal_at <= NOW()`;
  const eventRows = await sql`SELECT title, status, gender, reveal_at, reveal_style FROM reveal_events WHERE code = ${normalized}`; if (!eventRows.length) return null;
  const countRows = await sql`SELECT choice, COUNT(*)::int AS count FROM event_votes WHERE event_code = ${normalized} GROUP BY choice`;
  const voteRows = voterId ? await sql`SELECT choice FROM event_votes WHERE event_code = ${normalized} AND voter_id = ${voterId}` : [];
  const votes = { girl: 0, boy: 0 }; for (const row of countRows) votes[row.choice as VoteChoice] = Number(row.count);
  const event = eventRows[0], status = event.status as EventStatus;
  return { title: String(event.title), status, gender: status === "revealed" ? event.gender as Gender : null, revealAt: event.reveal_at ? new Date(event.reveal_at as string).toISOString() : null, revealStyle: event.reveal_style as RevealStyle, votes, total: votes.girl + votes.boy, yourVote: (voteRows[0]?.choice as VoteChoice | undefined) ?? null };
}
export async function castVote(code: string, voterId: string, choice: VoteChoice, name: string) {
  const normalized = normalizeCode(code), sql = database();
  if (!sql) { const event = memoryEvent(normalized); if (!event) throw new Error("Event not found."); if (effectiveMemoryStatus(event) !== "voting") throw new Error("Voting is closed."); event.votes.set(voterId, { choice, name }); return getPublicState(normalized, voterId); }
  await ensureSchema(); const rows = await sql`SELECT status FROM reveal_events WHERE code = ${normalized}`; if (rows[0]?.status !== "voting") throw new Error("Voting is closed.");
  await sql`INSERT INTO event_votes (event_code, voter_id, choice, display_name) VALUES (${normalized}, ${voterId}, ${choice}, ${name}) ON CONFLICT (event_code, voter_id) DO UPDATE SET choice = EXCLUDED.choice, display_name = EXCLUDED.display_name, updated_at = NOW()`;
  return getPublicState(normalized, voterId);
}
export async function getAdminState(code: string) {
  const state = await getPublicState(code); if (!state) return null; const sql = database();
  if (!sql) return { ...state, gender: memoryEvent(code)?.gender ?? null, storage: "preview-memory" as const };
  const rows = await sql`SELECT gender FROM reveal_events WHERE code = ${normalizeCode(code)}`;
  return { ...state, gender: (rows[0]?.gender as Gender | null) ?? null, storage: "database" as const };
}
export async function setGender(code: string, gender: Gender) {
  const normalized = normalizeCode(code), sql = database();
  if (!sql) { const event = memoryEvent(normalized); if (!event) throw new Error("Event not found."); if (["countdown", "revealed"].includes(effectiveMemoryStatus(event))) throw new Error("The reveal has already started."); event.gender = gender; return getAdminState(normalized); }
  await ensureSchema(); await sql`UPDATE reveal_events SET gender = ${gender}, updated_at = NOW() WHERE code = ${normalized} AND status IN ('standby', 'voting', 'locked')`; return getAdminState(normalized);
}
export async function setRevealStyle(code: string, revealStyle: RevealStyle) {
  const normalized = normalizeCode(code), sql = database();
  if (!sql) { const event = memoryEvent(normalized); if (!event) throw new Error("Event not found."); if (["countdown", "revealed"].includes(effectiveMemoryStatus(event))) throw new Error("The reveal has already started."); event.revealStyle = revealStyle; return getAdminState(normalized); }
  await ensureSchema(); await sql`UPDATE reveal_events SET reveal_style = ${revealStyle}, updated_at = NOW() WHERE code = ${normalized} AND status IN ('standby', 'voting', 'locked')`; return getAdminState(normalized);
}
export async function setVotingStatus(code: string, nextStatus: "standby" | "voting" | "locked") {
  const normalized = normalizeCode(code), sql = database();
  if (!sql) { const event = memoryEvent(normalized); if (!event) throw new Error("Event not found."); if (["countdown", "revealed"].includes(effectiveMemoryStatus(event))) throw new Error("The reveal has already started."); event.status = nextStatus; return getAdminState(normalized); }
  await ensureSchema(); const rows = await sql`UPDATE reveal_events SET status = ${nextStatus}, updated_at = NOW() WHERE code = ${normalized} AND status IN ('standby', 'voting', 'locked') RETURNING code`;
  if (!rows.length) throw new Error("The reveal has already started."); return getAdminState(normalized);
}
export async function startReveal(code: string) {
  const normalized = normalizeCode(code), revealAt = new Date(Date.now() + 11000).toISOString(), sql = database();
  if (!sql) { const event = memoryEvent(normalized); if (!event) throw new Error("Event not found."); if (!event.gender || event.status !== "locked") throw new Error("Choose the reveal and close voting first."); event.status = "countdown"; event.revealAt = revealAt; return getAdminState(normalized); }
  await ensureSchema(); const rows = await sql`UPDATE reveal_events SET status = 'countdown', reveal_at = ${revealAt}, updated_at = NOW() WHERE code = ${normalized} AND gender IS NOT NULL AND status = 'locked' RETURNING gender`;
  if (!rows.length) throw new Error("Choose the reveal and close voting first."); return getAdminState(normalized);
}
export async function replayReveal(code: string) {
  const normalized = normalizeCode(code), revealAt = new Date(Date.now() + 11000).toISOString(), sql = database();
  if (!sql) { const event = memoryEvent(normalized); if (!event || event.status !== "revealed" || !event.gender) throw new Error("The reveal is not ready to replay."); event.status = "countdown"; event.revealAt = revealAt; return getAdminState(normalized); }
  await ensureSchema(); const rows = await sql`UPDATE reveal_events SET status = 'countdown', reveal_at = ${revealAt}, updated_at = NOW() WHERE code = ${normalized} AND gender IS NOT NULL AND status = 'revealed' RETURNING gender`;
  if (!rows.length) throw new Error("The reveal is not ready to replay."); return getAdminState(normalized);
}
