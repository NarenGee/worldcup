import { getPlayerPointsBreakdown } from "@/lib/player-breakdown";
import { createServiceClient } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{ userId: string }>;
};

export async function GET(_req: Request, context: RouteContext) {
  const { userId } = await context.params;
  const supabase = createServiceClient();

  try {
    const breakdown = await getPlayerPointsBreakdown(supabase, userId);
    if (!breakdown) {
      return Response.json({ error: "Player not found" }, { status: 404 });
    }
    return Response.json(breakdown);
  } catch (err) {
    return Response.json(
      {
        error:
          err instanceof Error ? err.message : "Failed to load points breakdown",
      },
      { status: 500 }
    );
  }
}
