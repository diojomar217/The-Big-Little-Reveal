import { cookies } from "next/headers";
import { getPublicState } from "@/lib/store";
export const dynamic = "force-dynamic";
export async function GET(_: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params, jar = await cookies();
  const state = await getPublicState(code, jar.get(`reveal_voter_${code.toLowerCase()}`)?.value);
  return state ? Response.json(state, { headers: { "Cache-Control": "no-store" } }) : Response.json({ error: "Event not found." }, { status: 404 });
}
