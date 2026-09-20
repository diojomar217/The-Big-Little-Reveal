"use client";

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import Link from "next/link";
import { Baby, Check, LockKeyhole, Mail, Sparkles, Users } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import type { PublicState, VoteChoice } from "@/lib/reveal-types";

const emptyState: PublicState = { title: "The Big Little Reveal", status: "standby", gender: null, revealAt: null, votes: { girl: 0, boy: 0 }, total: 0 };
declare global { interface Document { modelContext?: { registerTool: (tool: unknown, options?: { signal?: AbortSignal }) => void | Promise<void> } } }

export function RevealExperience({ eventCode, initialState = emptyState, projectorMode = false, initialJoinUrl = "" }: { eventCode: string; initialState?: PublicState; projectorMode?: boolean; initialJoinUrl?: string }) {
  const [state, setState] = useState<PublicState>(initialState);
  const [choice, setChoice] = useState<VoteChoice | null>(null);
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [projector, setProjector] = useState(projectorMode);
  const [joinUrl, setJoinUrl] = useState(initialJoinUrl);
  const [now, setNow] = useState(Date.now());

  const loadState = useCallback(async () => {
    try {
      const response = await fetch(`/api/events/${eventCode}/state`, { cache: "no-store" });
      if (!response.ok) return;
      const next = await response.json() as PublicState;
      setState(next);
      if (next.yourVote) setChoice(next.yourVote);
    } catch {
      // Keep the last known event state during a brief connection interruption.
    }
  }, [eventCode]);

  const submitVote = useCallback(async (voteChoice?: VoteChoice, voteName?: string) => {
    const selected = voteChoice ?? choice;
    if (!selected) { setMessage("Pick your team first."); return null; }
    setBusy(true);
    const response = await fetch(`/api/events/${eventCode}/vote`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ choice: selected, name: voteName ?? name }) });
    const data = await response.json() as PublicState & { error?: string }; setBusy(false);
    if (!response.ok) { setMessage(data.error || "Your vote could not be saved."); throw new Error(data.error); }
    setChoice(selected); setState(data); setMessage("Your prediction is in!");
    return { saved: true, choice: selected, totalVotes: data.total };
  }, [choice, eventCode, name]);

  useEffect(() => { setProjector(projectorMode || new URLSearchParams(window.location.search).get("display") === "projector"); setJoinUrl(`${window.location.origin}/e/${eventCode}`); }, [eventCode, projectorMode]);
  useEffect(() => { void loadState(); const timer = window.setInterval(loadState, state.status === "countdown" ? 400 : 1000); return () => window.clearInterval(timer); }, [loadState, state.status]);
  useEffect(() => { if (state.status !== "countdown") return; const timer = window.setInterval(() => setNow(Date.now()), 100); return () => window.clearInterval(timer); }, [state.status]);
  useEffect(() => {
    const context = document.modelContext;
    if (!context?.registerTool || state.status !== "voting") return;
    const lifecycle = new AbortController();
    Promise.resolve(context.registerTool({
      name: "cast_gender_reveal_vote", title: "Cast reveal prediction", description: "Cast or update this guest's prediction before voting closes.",
      inputSchema: { type: "object", properties: { choice: { type: "string", enum: ["girl", "boy"] }, name: { type: "string", maxLength: 40 } }, required: ["choice"], additionalProperties: false },
      annotations: { readOnlyHint: false, untrustedContentHint: false }, execute: (input: { choice: VoteChoice; name?: string }) => submitVote(input.choice, input.name || ""),
    }, { signal: lifecycle.signal })).catch(() => undefined);
    return () => lifecycle.abort();
  }, [state.status, submitVote]);

  const girlPercent = state.total ? Math.round((state.votes.girl / state.total) * 100) : 50;
  const remainingMs = state.revealAt ? Math.max(0, Date.parse(state.revealAt) - now) : 9000;
  const countdown = Math.max(1, Math.ceil((remainingMs - 4000) / 1000));
  const confetti = useMemo(() => Array.from({ length: 48 }, (_, index) => ({ x: `${(index * 37) % 100}%`, color: ["#ffd65a", "#fff", "#ed604c", "#2c91c5", "#252525"][index % 5], duration: `${3.2 + (index % 7) * .3}s`, delay: `${-(index % 12) * .32}s`, rotation: `${(index * 29) % 180}deg` })), []);

  if (state.status === "countdown" && remainingMs > 4000) return <main className="countdown-screen"><p>Gather close</p><strong key={countdown}>{countdown}</strong><span>The big little moment is here</span></main>;
  if (state.status === "countdown") return <main className="suspense-screen"><div className="suspense-ring ring-one" /><div className="suspense-ring ring-two" /><Mail className="suspense-envelope" aria-hidden="true" /><p>{remainingMs > 1800 ? "Hold your breath…" : "Here it comes!"}</p><span>One tiny secret is about to open</span></main>;
  if (state.status === "revealed" && state.gender) {
    const headline = state.gender === "girl" ? "It’s a Girl!" : state.gender === "boy" ? "It’s a Boy!" : "It’s Twins!";
    return <main className={`reveal-screen ${state.gender}`}>{confetti.map((piece, index) => <i key={index} className="confetti" style={{ "--x": piece.x, "--c": piece.color, "--d": piece.duration, "--delay": piece.delay, "--r": piece.rotation } as CSSProperties} />)}<div className="reveal-copy"><Sparkles size={46} aria-hidden="true" /><p>The secret is out</p><h2>{headline}</h2><p>Our hearts just got a little fuller.</p></div></main>;
  }

  if (projector && state.status === "standby") return <main className="projector-page"><div className="projector-content projector-lobby"><div><p className="eyebrow">The Big Little Reveal</p><h1>{state.title}</h1><h2>Scan to join</h2><p>Open the camera on your phone and scan the code.</p><code>{joinUrl}</code><div className="projector-status"><span className="pulse-dot" /> Waiting for voting to start</div></div>{joinUrl && <div className="projector-qr"><QRCodeSVG value={joinUrl} size={260} bgColor="#ffffff" fgColor="#252525" level="M" /></div>}</div></main>;
  if (projector) return <main className="projector-page"><div className="projector-content"><p className="eyebrow">Live crowd prediction</p><h1>What do you think?</h1><div className="projector-score"><span>Team Girl <b>{girlPercent}%</b></span><span>Team Boy <b>{100 - girlPercent}%</b></span></div><div className="meter projector-meter"><span className="meter-girl" style={{ width: `${girlPercent}%` }} /><span className="meter-boy" style={{ width: `${100 - girlPercent}%` }} /></div><p>{state.total} predictions</p><div className="projector-status"><span className="pulse-dot" /> {state.status === "locked" ? "Voting is closed. Get ready." : "Voting is live"}</div></div></main>;

  if (state.status === "standby") return <main className="party-page"><div className="site-shell"><header className="site-header"><Link className="brand" href="/"><span className="brand-mark"><Baby size={20} /></span><span>The Big Little Reveal</span></Link><span className="event-code">{eventCode}</span></header><section className="lobby-stage"><div className="lobby-icon"><Users size={42} /></div><p className="eyebrow">You’re in · The celebration starts here</p><h1 className="lobby-title">{state.title}</h1><h2>Voting starts soon.</h2><p>Keep this page open. The prediction will appear here when the organizer starts the poll.</p><div className="lobby-status"><span className="pulse-dot" /> Waiting for the host</div></section></div></main>;

  const locked = state.status === "locked";
  return <main className="party-page"><div className="site-shell">
    <header className="site-header"><Link className="brand" href="/"><span className="brand-mark"><Baby size={20} /></span><span>The Big Little Reveal</span></Link><span className="event-code">{eventCode}</span></header>
    <section className="main-stage"><div className="intro"><p className="eyebrow">One tiny secret. Two big teams.</p><h1>{state.title}</h1><p className="event-kicker">The Big Little Reveal</p><p className="intro-copy">The moment is almost here. Make your prediction, cheer for your team, and keep this page open when the reveal begins.</p></div>
      <section className="vote-panel" aria-labelledby="vote-heading"><p className="eyebrow">{locked ? "Predictions are in" : "Make your prediction"}</p><h2 id="vote-heading">{locked ? "Voting is now closed." : "Which team are you on?"}</h2><p className="sub">{locked ? "Stay right here. The countdown will begin shortly." : "You can change your answer right up until voting closes."}</p>
        {!locked && <><div className="team-grid"><button className="team-button girl" data-selected={choice === "girl"} onClick={() => setChoice("girl")} aria-pressed={choice === "girl"}><Sparkles size={27} /><strong>Team Girl</strong></button><button className="team-button boy" data-selected={choice === "boy"} onClick={() => setChoice("boy")} aria-pressed={choice === "boy"}><Sparkles size={27} /><strong>Team Boy</strong></button></div><label className="sr-only" htmlFor="guest-name">Your first name, optional</label><input id="guest-name" className="name-field" value={name} onChange={(event) => setName(event.target.value)} maxLength={40} placeholder="Your first name (optional)" /><button className="primary-action" disabled={busy || !choice} onClick={() => void submitVote()}>{busy ? "Saving…" : state.yourVote ? "Update my prediction" : "Lock in my prediction"}</button><p className="status-message" aria-live="polite">{message && <><Check size={17} className="inline" /> {message}</>}</p></>}
        {locked && <div className="locked-badge"><LockKeyhole size={30} /><strong>Predictions locked</strong></div>}
        <div className="meter-wrap" aria-label={`${girlPercent}% Team Girl and ${100 - girlPercent}% Team Boy`}><div className="meter-labels"><span>Girl {girlPercent}%</span><span>Boy {100 - girlPercent}%</span></div><div className="meter"><span className="meter-girl" style={{ width: `${girlPercent}%` }} /><span className="meter-boy" style={{ width: `${100 - girlPercent}%` }} /></div><p className="vote-total">{state.total} {state.total === 1 ? "prediction" : "predictions"} and counting</p></div><p className="waiting-note"><span className="pulse-dot" /> Waiting for the organizer’s cue</p>
      </section>
    </section>
  </div></main>;
}
