import { notFound } from "next/navigation";
import { RevealExperience } from "@/components/reveal-experience";
import { getPublicState } from "@/lib/store";

export default async function EventPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params, normalized = code.toUpperCase();
  const initialState = await getPublicState(normalized);
  if (!initialState) notFound();
  return <RevealExperience eventCode={normalized} initialState={initialState} />;
}
