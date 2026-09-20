import { canManageEvent } from "@/lib/event-auth";
import { getAdminState, setGender } from "@/lib/store";
export async function GET(_: Request, { params }: { params: Promise<{ code: string }> }) { const { code } = await params; if (!(await canManageEvent(code))) return Response.json({ error: "Unauthorized" }, { status: 401 }); const state = await getAdminState(code); return state ? Response.json(state, { headers: { "Cache-Control": "no-store" } }) : Response.json({ error: "Event not found." }, { status: 404 }); }
export async function POST(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params; if (!(await canManageEvent(code))) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { gender } = await request.json() as { gender?: unknown }; if (typeof gender !== "string" || !["girl", "boy", "twins"].includes(gender)) return Response.json({ error: "Choose a valid reveal." }, { status: 400 });
  try { return Response.json(await setGender(code, gender as "girl" | "boy" | "twins")); } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Could not save." }, { status: 409 }); }
}
