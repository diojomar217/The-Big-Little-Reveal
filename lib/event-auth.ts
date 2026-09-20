import { auth } from "@/auth";
import { eventOwnedBy } from "@/lib/store";

export async function currentOrganizerEmail() { return (await auth())?.user?.email?.trim().toLowerCase() ?? null; }
export async function canManageEvent(code: string) { const email = await currentOrganizerEmail(); return !!email && eventOwnedBy(code, email); }
