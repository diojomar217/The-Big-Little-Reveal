import { CreateReveal } from "@/components/create-reveal";
import { auth, signIn } from "@/auth";
import { Baby } from "lucide-react";
import Link from "next/link";
import { listOwnedEvents } from "@/lib/store";

export default async function Home({ searchParams }: { searchParams: Promise<{ returnTo?: string }> }) {
  const session = await auth();
  const requested = (await searchParams).returnTo, returnTo = requested?.startsWith("/e/") ? requested : "/";
  const googleReady = !!process.env.AUTH_GOOGLE_ID && !!process.env.AUTH_GOOGLE_SECRET;
  if (!session?.user?.email) return <main className="create-page"><div className="create-shell"><header className="create-header"><Link className="brand" href="/"><span className="brand-mark"><Baby size={20} /></span><span>The Big Little Reveal</span></Link></header><section className="signin-stage"><p className="eyebrow">Create and control your own event</p><h1>One reveal.<br />Everyone together.</h1><p>Sign in as the organizer. Guests can join and vote without an account.</p><form action={async () => { "use server"; await signIn("google", { redirectTo: returnTo }); }}><button className="google-action" disabled={!googleReady}><span>G</span> {googleReady ? "Continue with Google" : "Google setup required"}</button></form>{!googleReady && <p className="setup-note">Add the Google OAuth environment variables to enable organizer sign-in.</p>}</section></div></main>;
  const events = await listOwnedEvents(session.user.email);
  return <CreateReveal organizerName={session.user.name || session.user.email} initialEvents={events} />;
}
