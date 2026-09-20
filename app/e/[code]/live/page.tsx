import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { RevealExperience } from "@/components/reveal-experience";
import { getPublicState } from "@/lib/store";

export const metadata = { title: "Live Display | The Big Little Reveal" };
export default async function LiveDisplayPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params, normalized = code.toUpperCase();
  const initialState = await getPublicState(normalized);
  if (!initialState) notFound();
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") || requestHeaders.get("host") || "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") || (host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https");
  return <RevealExperience eventCode={normalized} initialState={initialState} projectorMode initialJoinUrl={`${protocol}://${host}/e/${normalized}`} />;
}
