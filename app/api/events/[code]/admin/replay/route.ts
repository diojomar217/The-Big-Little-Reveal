import { canManageEvent } from "@/lib/event-auth";
import { replayReveal } from "@/lib/store";
export async function POST(_: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params; if (!(await canManageEvent(code))) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try { return Response.json(await replayReveal(code)); } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Could not replay the reveal." }, { status: 409 }); }
}
