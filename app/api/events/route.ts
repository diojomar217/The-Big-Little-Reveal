import { createEvent } from "@/lib/store";
import { currentOrganizerEmail } from "@/lib/event-auth";

export async function POST(request: Request) {
  try {
    const email = await currentOrganizerEmail(); if (!email) return Response.json({ error: "Sign in with Google first." }, { status: 401 });
    const body = await request.json() as { title?: unknown };
    if (typeof body.title !== "string") return Response.json({ error: "Add an event name." }, { status: 400 });
    return Response.json(await createEvent(body.title, email), { status: 201 });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Could not create the event." }, { status: 400 }); }
}
