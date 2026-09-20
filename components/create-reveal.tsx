"use client";

import { useState } from "react";
import Link from "next/link";
import { Baby, Check, Copy, PartyPopper, Share2, SlidersHorizontal } from "lucide-react";

type CreatedEvent = { code: string; title: string };
type OrganizerEvent = CreatedEvent & { status: "standby" | "voting" | "locked" | "countdown" | "revealed"; total: number };
export function CreateReveal({ organizerName, initialEvents }: { organizerName: string; initialEvents: OrganizerEvent[] }) {
  const [title, setTitle] = useState(""), [created, setCreated] = useState<CreatedEvent | null>(null);
  const [events, setEvents] = useState(initialEvents);
  const [busy, setBusy] = useState(false), [message, setMessage] = useState(""), [copied, setCopied] = useState("");
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setMessage("");
    const response = await fetch("/api/events", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title }) });
    const data = await response.json() as CreatedEvent & { error?: string }; setBusy(false);
    if (!response.ok) { setMessage(data.error || "Could not create your reveal."); return; }
    setCreated(data); setEvents((current) => [{ ...data, status: "standby", total: 0 }, ...current]);
  }
  async function copy(label: string, value: string) { await navigator.clipboard.writeText(value); setCopied(label); window.setTimeout(() => setCopied(""), 1600); }
  async function share(value: string, shareTitle: string) { if (navigator.share) await navigator.share({ title: shareTitle, text: "Join our gender reveal and make your prediction!", url: value }); else await copy("guest", value); }
  if (created) {
    const guestUrl = `${origin}/e/${created.code}`, controlUrl = `${guestUrl}/control`;
    return <main className="create-page"><div className="create-shell"><header className="create-header"><Link className="brand" href="/"><span className="brand-mark"><Baby size={20} /></span><span>The Big Little Reveal</span></Link></header><section className="created-panel"><div className="success-mark"><Check size={34} /></div><p className="eyebrow">Event {created.code}</p><h1>Your reveal is ready.</h1><p className="create-lead">Share the guest link. The controls remain private to your Google account.</p><div className="link-box"><div><span>Guest link</span><strong>{guestUrl}</strong></div><button aria-label="Copy guest link" onClick={() => void copy("guest", guestUrl)}><Copy size={19} /></button></div><div className="link-box private"><div><span>Organizer control link</span><strong>{controlUrl}</strong></div><button aria-label="Copy control link" onClick={() => void copy("control", controlUrl)}><Copy size={19} /></button></div><p className="copy-status" aria-live="polite">{copied ? `${copied === "guest" ? "Guest" : "Control"} link copied.` : `Owned by ${organizerName}`}</p><div className="created-actions"><Link className="primary-link" href={`/e/${created.code}/control`}>Open event controls</Link><button onClick={() => void share(guestUrl, created.title)}><Share2 size={17} /> Share guest link</button><button onClick={() => { setCreated(null); setTitle(""); }}>Back to my reveals</button></div></section></div></main>;
  }
  return <main className="create-page"><div className="create-shell"><header className="create-header"><Link className="brand" href="/"><span className="brand-mark"><Baby size={20} /></span><span>The Big Little Reveal</span></Link><span className="organizer-chip">{organizerName}</span></header><section className="create-stage"><div className="create-intro"><PartyPopper size={44} /><p className="eyebrow">One family. One unforgettable moment.</p><h1>Create your gender reveal.</h1><p>Invite your guests, collect their predictions, and launch the reveal together from every screen.</p></div><form className="create-form" onSubmit={submit}><p className="eyebrow">Create an event</p><h2>Let’s get you ready.</h2><label htmlFor="event-title">Event name</label><input id="event-title" className="name-field" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={80} placeholder="e.g. Mia & Carlo’s Reveal" required /><p className="form-hint">Only your signed-in Google account can access its controls.</p><button className="primary-action" disabled={busy}>{busy ? "Creating…" : "Create my reveal"}</button><p className="status-message" aria-live="polite">{message}</p></form></section>{events.length > 0 && <section className="my-reveals"><div className="section-heading"><div><p className="eyebrow">Organizer dashboard</p><h2>My reveals</h2></div><span>{events.length} {events.length === 1 ? "event" : "events"}</span></div><div className="event-list">{events.map((item) => <article className="event-row" key={item.code}><div><span className={`event-status ${item.status}`}>{item.status === "standby" ? "Not started" : item.status}</span><h3>{item.title}</h3><p>Event {item.code} · {item.total} {item.total === 1 ? "vote" : "votes"}</p></div><div className="event-row-actions"><button aria-label={`Share ${item.title}`} onClick={() => void share(`${origin}/e/${item.code}`, item.title)}><Share2 size={18} /></button><Link href={`/e/${item.code}/control`}><SlidersHorizontal size={18} /> Controls</Link></div></article>)}</div></section>}</div></main>;
}
