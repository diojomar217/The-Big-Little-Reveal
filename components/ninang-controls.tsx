"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Circle, FlaskConical, Lock, Mail, MonitorPlay, Play, Radio, RotateCcw, Share2, ShieldCheck, Sparkles, Unlock, Volume2, Wifi, WifiOff, X } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import type { Gender, PublicState, RevealStyle } from "@/lib/reveal-types";

type AdminState = PublicState & { gender: Gender | null; storage: "database" | "preview-memory" };

export function NinangControls({ eventCode }: { eventCode: string }) {
  const [message, setMessage] = useState("");
  const [state, setState] = useState<AdminState | null>(null), [busy, setBusy] = useState(false);
  const [online, setOnline] = useState(true), [guestUrl, setGuestUrl] = useState("");
  const [rehearsal, setRehearsal] = useState<number | null>(null);
  const [revealArmed, setRevealArmed] = useState(false);

  async function load() {
    try {
      const response = await fetch(`/api/events/${eventCode}/admin/settings`, { cache: "no-store" });
      if (response.ok) { setState(await response.json() as AdminState); setOnline(true); }
    } catch { setOnline(false); }
  }
  useEffect(() => {
    setGuestUrl(`${window.location.origin}/e/${eventCode}`);
    const updateOnline = () => setOnline(navigator.onLine);
    window.addEventListener("online", updateOnline); window.addEventListener("offline", updateOnline);
    void load();
    return () => { window.removeEventListener("online", updateOnline); window.removeEventListener("offline", updateOnline); };
  }, []);
  useEffect(() => { const timer = window.setInterval(load, 2000); return () => window.clearInterval(timer); }, []);
  useEffect(() => {
    if (rehearsal === null || rehearsal === 0) return;
    const timer = window.setTimeout(() => setRehearsal(rehearsal - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [rehearsal]);
  useEffect(() => { if (!revealArmed) return; const timer = window.setTimeout(() => setRevealArmed(false), 6000); return () => window.clearTimeout(timer); }, [revealArmed]);
  useEffect(() => {
    document.body.style.overflow = rehearsal === null ? "" : "hidden";
    return () => { document.body.style.overflow = ""; };
  }, [rehearsal]);

  async function chooseGender(gender: Gender) {
    setBusy(true); const response = await fetch(`/api/events/${eventCode}/admin/settings`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ gender }) });
    const data = await response.json() as AdminState & { error?: string }; setBusy(false);
    if (!response.ok) { setMessage(data.error || "Could not save."); return; }
    setState(data); setMessage("Saved privately. Guests still cannot see it.");
  }
  async function chooseRevealStyle(revealStyle: RevealStyle) {
    setBusy(true); const response = await fetch(`/api/events/${eventCode}/admin/settings`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ revealStyle }) });
    const data = await response.json() as AdminState & { error?: string }; setBusy(false);
    if (!response.ok) { setMessage(data.error || "Could not save the reveal style."); return; }
    setState(data); setMessage("Reveal style saved.");
  }
  async function advanceVoting() {
    if (!state) return; setBusy(true);
    const nextStatus = state.status === "standby" ? "voting" : state.status === "voting" ? "locked" : "voting";
    const response = await fetch(`/api/events/${eventCode}/admin/voting`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: nextStatus }) });
    const data = await response.json() as AdminState & { error?: string }; setBusy(false);
    if (!response.ok) { setMessage(data.error || "Could not update voting."); return; }
    setState(data); setMessage(nextStatus === "voting" ? "Voting is live on every guest screen." : "Voting is closed. Get ready for the reveal.");
  }
  async function reveal() {
    if (!revealArmed) { setRevealArmed(true); setMessage("Ready? Press the reveal button again within 6 seconds."); return; }
    setRevealArmed(false);
    setBusy(true); const response = await fetch(`/api/events/${eventCode}/admin/reveal`, { method: "POST" }); const data = await response.json() as AdminState & { error?: string }; setBusy(false);
    if (!response.ok) { setMessage(data.error || "Could not start the reveal."); return; }
    setState(data); setMessage("Countdown and suspense sequence started on every screen!");
  }
  async function replay() {
    setBusy(true); const response = await fetch(`/api/events/${eventCode}/admin/replay`, { method: "POST" }); const data = await response.json() as AdminState & { error?: string }; setBusy(false);
    if (!response.ok) { setMessage(data.error || "Could not replay the reveal."); return; }
    setState(data); setMessage("The reveal is replaying on every screen.");
  }
  function testSound() {
    const context = new AudioContext();
    [0, .24, .48].forEach((delay, index) => {
      const oscillator = context.createOscillator(), gain = context.createGain(), start = context.currentTime + delay;
      oscillator.frequency.value = 420 + index * 150; gain.gain.setValueAtTime(.11, start); gain.gain.exponentialRampToValueAtTime(.001, start + .18);
      oscillator.connect(gain); gain.connect(context.destination); oscillator.start(start); oscillator.stop(start + .18);
    });
    window.setTimeout(() => void context.close(), 1200);
    setMessage("Sound check played on this device.");
  }
  async function shareGuestLink() { if (navigator.share) await navigator.share({ title: state?.title || "Gender reveal", text: "Join us and make your prediction!", url: guestUrl }); else { await navigator.clipboard.writeText(guestUrl); setMessage("Guest link copied."); } }
  const finished = state?.status === "revealed";
  const started = state?.status === "countdown" || finished;
  const rehearsalHeadline = state?.gender === "girl" ? "It’s a Girl!" : state?.gender === "boy" ? "It’s a Boy!" : "It’s Twins!";

  return <main className="admin-page"><div className="admin-shell">
    <header className="admin-header"><Link className="brand" href={`/e/${eventCode}`}><ArrowLeft size={18} /> Back to event</Link><span className="eyebrow">Event {eventCode}</span></header>
    <>
      <section className="admin-panel"><div className="control-status"><span className={online ? "status-ok" : "status-bad"}>{online ? <Wifi size={17} /> : <WifiOff size={17} />} {online ? "Connected" : "Offline"}</span><span>{state?.storage === "database" ? "Votes are safely stored" : "Local preview data"}</span></div><div className="console-heading"><div><p className="eyebrow">Reveal control room · {eventCode}</p><h1>{state?.title || "Your reveal"}</h1></div><span className={`live-state ${state?.status || "standby"}`}>{finished ? "Revealed" : state?.status === "countdown" ? "Live sequence" : state?.status === "standby" ? "Lobby open" : state?.status === "voting" ? "Voting live" : "Voting closed"}</span></div><div className="console-callout"><ShieldCheck size={28} /><div><strong>{finished ? "The secret is out!" : state?.status === "countdown" ? "Countdown in progress" : state?.status === "standby" ? "Guests are joining" : state?.status === "voting" ? "Collecting predictions" : "Ready for the reveal"}</strong><span>The selected result remains private until the synchronized reveal finishes.</span></div></div>
        <label>Choose the reveal</label><div className="admin-options">{(["girl", "boy", "twins"] as Gender[]).map((gender) => <button key={gender} className="admin-choice" data-active={state?.gender === gender} onClick={() => void chooseGender(gender)} disabled={busy || started}><span>{gender === "girl" ? "Girl" : gender === "boy" ? "Boy" : "Twins"}</span><small>{state?.gender === gender ? "Selected privately" : "Choose result"}</small></button>)}</div>
        <label>Reveal style</label><div className="reveal-style-options">{(["classic", "heartbeat", "confetti"] as RevealStyle[]).map((style) => <button key={style} className="style-choice" data-active={state?.revealStyle === style} onClick={() => void chooseRevealStyle(style)} disabled={busy || started}><strong>{style === "classic" ? "Classic countdown" : style === "heartbeat" ? "Heartbeat" : "Confetti cannon"}</strong><span>{style === "classic" ? "Clean and timeless" : style === "heartbeat" ? "Maximum suspense" : "Bright and playful"}</span></button>)}</div>
        <div className="event-flow" aria-label="Event progress"><span data-active={state?.status === "standby"}>1. Guests join</span><span data-active={state?.status === "voting"}>2. Vote</span><span data-active={state?.status === "locked"}>3. Reveal</span></div>
        <button className="poll-action" onClick={() => void advanceVoting()} disabled={busy || started}>{state?.status === "standby" ? <Play size={20} /> : state?.status === "locked" ? <Unlock size={20} /> : <Lock size={20} />}{state?.status === "standby" ? "Start voting" : state?.status === "locked" ? "Reopen voting" : "Close voting"}</button>
        <div className="control-actions secondary-controls"><button className="control-button" onClick={() => setRehearsal(11)} disabled={!state?.gender || started}><FlaskConical size={19} /> Rehearse privately</button><button className="control-button" onClick={testSound}><Volume2 size={19} /> Test sound</button><button className="control-button" onClick={() => window.open(`/e/${eventCode}/live`, "_blank")}><MonitorPlay size={19} /> Open live display</button>{finished && <button className="control-button replay-action" onClick={() => void replay()} disabled={busy}><RotateCcw size={19} /> Replay reveal</button>}</div>
        <div className="readiness"><p className="eyebrow">Reveal readiness</p><span data-ready={!!state?.gender}>{state?.gender ? <CheckCircle2 size={18} /> : <Circle size={18} />} Result selected</span><span data-ready={state?.status === "locked"}>{state?.status === "locked" ? <CheckCircle2 size={18} /> : <Circle size={18} />} Voting closed</span><span data-ready={online}>{online ? <CheckCircle2 size={18} /> : <Circle size={18} />} Internet connected</span></div>
        <p className="status-message" aria-live="polite">{message}</p><button className={`danger-action ${revealArmed ? "armed" : ""}`} disabled={busy || !state?.gender || state?.status !== "locked" || started || !online} onClick={() => void reveal()}><Radio size={20} className="inline" /> {finished ? "Reveal is live" : state?.status === "countdown" ? "Reveal sequence started" : revealArmed ? "Confirm: reveal now" : "Arm reveal sequence"}</button><p className="vote-total">Current turnout: {state?.total ?? 0} votes</p>
      </section>
      <section className="share-panel"><div><p className="eyebrow">Guest check-in</p><h2>Scan to vote</h2><p>Place this screen near the entrance or include the link in your invitation.</p><code>{guestUrl}</code><button className="share-guest" onClick={() => void shareGuestLink()}><Share2 size={17} /> Share guest link</button></div>{guestUrl && <div className="qr-frame"><QRCodeSVG value={guestUrl} size={150} bgColor="#ffffff" fgColor="#252525" level="M" /></div>}</section>
    </>
  </div>
  {rehearsal !== null && <div className={`rehearsal-overlay ${state?.revealStyle || "heartbeat"} ${rehearsal === 0 ? state?.gender : rehearsal <= 1 ? "rehearsal-flash" : rehearsal <= 4 ? "rehearsal-suspense" : rehearsal > 9 ? "rehearsal-ready" : ""}`}><button aria-label="Close rehearsal" onClick={() => setRehearsal(null)}><X /></button>{rehearsal > 9 ? <><p>Bring everyone close</p><h2>Are you ready?</h2><span>Private rehearsal</span></> : rehearsal > 4 ? <><p>Private rehearsal</p><strong key={rehearsal}>{rehearsal - 4}</strong><span>No guests can see this</span></> : rehearsal > 1 ? <><Mail className="rehearsal-envelope" aria-hidden="true" /><p>{rehearsal > 2 ? "Hold your breath…" : "Here it comes!"}</p><span>No guests can see this</span></> : rehearsal === 1 ? <Sparkles size={72} /> : <><p>{state?.title}</p><h2>{rehearsalHeadline}</h2><span>Looks good? Close this preview when ready.</span></>}</div>}
  {!started && state && <div className="mobile-admin-action"><span>{state.status === "standby" ? "Guests are waiting" : state.status === "voting" ? `${state.total} votes received` : "Ready for the reveal"}</span><button className={state.status === "locked" ? "reveal" : ""} disabled={busy || (state.status === "locked" && (!state.gender || !online))} onClick={() => void (state.status === "locked" ? reveal() : advanceVoting())}>{state.status === "standby" ? <><Play size={18} /> Start voting</> : state.status === "voting" ? <><Lock size={18} /> Close voting</> : <><Radio size={18} /> {revealArmed ? "Confirm reveal" : "Arm reveal"}</>}</button></div>}
  </main>;
}
