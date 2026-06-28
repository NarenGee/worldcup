import { getMatchPredictionResults } from "@/lib/match-prediction-results";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ matchId: string }>;
};

export async function GET(_req: Request, context: RouteContext) {
  const { matchId } = await context.params;
  const id = Number(matchId);

  if (!Number.isInteger(id)) {
    return Response.json({ error: "Invalid match id" }, { status: 400 });
  }

  const supabase = createServiceClient();

  try {
    const result = await getMatchPredictionResults(supabase, id);
    if (!result) {
      return Response.json({ error: "Match not found" }, { status: 404 });
    }
    return Response.json(result);
  } catch (err) {
    return Response.json(
      {
        error:
          err instanceof Error ? err.message : "Failed to load match predictions",
      },
      { status: 500 }
    );
  }
}
