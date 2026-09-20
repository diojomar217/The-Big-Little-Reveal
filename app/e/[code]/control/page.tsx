import { notFound, redirect } from "next/navigation";
import { NinangControls } from "@/components/ninang-controls";
import { auth } from "@/auth";
import { eventOwnedBy, getPublicState } from "@/lib/store";

export const metadata = { title: "Event Controls | The Big Little Reveal" };
export default async function EventControlPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params, normalized = code.toUpperCase();
  if (!(await getPublicState(normalized))) notFound();
  const email = (await auth())?.user?.email;
  if (!email) redirect(`/?returnTo=/e/${normalized}/control`);
  if (!(await eventOwnedBy(normalized, email))) notFound();
  return <NinangControls eventCode={normalized} />;
}
