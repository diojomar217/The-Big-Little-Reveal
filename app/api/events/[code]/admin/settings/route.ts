import { canManageEvent } from "@/lib/event-auth";
import { getAdminState, setGender, setRevealStyle } from "@/lib/store";
export async function GET(_: Request, { params }: { params: Promise<{ code: string }> }) { const { code } = await params; if (!(await canManageEvent(code))) return Response.json({ error: "Unauthorized" }, { status: 401 }); const state = await getAdminState(code); return state ? Response.json(state, { headers: { "Cache-Control": "no-store" } }) : Response.json({ error: "Event not found." }, { status: 404 }); }
export async function POST(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params; if (!(await canManageEvent(code))) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { gender, revealStyle } = await request.json() as { gender?: unknown; revealStyle?: unknown };
  try {
    if (typeof gender === "string" && ["girl", "boy", "twins"].includes(gender)) return Response.json(await setGender(code, gender as "girl" | "boy" | "twins"));
    if (typeof revealStyle === "string" && ["classic", "heartbeat", "confetti"].includes(revealStyle)) return Response.json(await setRevealStyle(code, revealStyle as "classic" | "heartbeat" | "confetti"));
    return Response.json({ error: "Choose a valid setting." }, { status: 400 });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Could not save." }, { status: 409 }); }
}
