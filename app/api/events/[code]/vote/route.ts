import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { castVote } from "@/lib/store";
export async function POST(request: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await params, body = await request.json() as { choice?: unknown; name?: unknown };
    if (body.choice !== "girl" && body.choice !== "boy") return Response.json({ error: "Choose a team first." }, { status: 400 });
    const name = typeof body.name === "string" ? body.name.trim().slice(0, 40) : "", jar = await cookies();
    const cookieName = `reveal_voter_${code.toLowerCase()}`, voterId = jar.get(cookieName)?.value || randomUUID();
    const state = await castVote(code, voterId, body.choice, name);
    jar.set(cookieName, voterId, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 60 * 60 * 24 * 90, path: `/e/${code}` });
    return Response.json(state);
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Your vote could not be saved." }, { status: 409 }); }
}
