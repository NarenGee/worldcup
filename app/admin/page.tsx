import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { AdminPanel } from "@/components/admin/admin-panel";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?redirect=/admin");

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) redirect("/");

  const [{ data: matches }, { data: profiles }, { data: tournamentResults }] =
    await Promise.all([
      supabase.from("matches").select("*").order("kickoff_at"),
      supabase.from("profiles").select("*").order("created_at"),
      supabase.from("tournament_results").select("*").eq("id", 1).single(),
    ]);

  const serviceClient = createServiceClient();
  const { data: authUsers } = await serviceClient.auth.admin.listUsers();

  const emailMap = new Map(
    authUsers?.users.map((u) => [u.id, u.email ?? ""]) ?? []
  );

  const users = (profiles ?? []).map((p) => ({
    ...p,
    email: emailMap.get(p.id) ?? "",
  }));

  return (
    <AppShell>
      <AdminPanel
        matches={matches ?? []}
        users={users}
        tournamentResults={
          tournamentResults ?? {
            id: 1,
            champion: null,
            top_scorer: null,
            updated_at: new Date().toISOString(),
          }
        }
      />
    </AppShell>
  );
}
