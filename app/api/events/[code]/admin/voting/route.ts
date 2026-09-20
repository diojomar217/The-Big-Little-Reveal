import { canManageEvent } from "@/lib/event-auth";
import { setVotingStatus } from "@/lib/store";
export async function POST(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params; if (!(await canManageEvent(code))) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json() as { status?: unknown }; if (!body.status || !["standby", "voting", "locked"].includes(String(body.status))) return Response.json({ error: "Invalid voting status." }, { status: 400 });
  try { return Response.json(await setVotingStatus(code, body.status as "standby" | "voting" | "locked")); } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Could not update voting." }, { status: 409 }); }
}
