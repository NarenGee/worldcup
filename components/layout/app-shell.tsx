import { FeatureAnnouncementDialog } from "@/components/announcements/feature-announcement-dialog";
import { createClient } from "@/lib/supabase/server";
import { MobileNav } from "./mobile-nav";
import { NavBar } from "./nav-bar";

export async function AppShell({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profile = null;
  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();
    profile = data;
  }

  return (
    <div className="relative min-h-screen">
      <NavBar profile={profile} signedIn={!!user} />
      <main className="mx-auto max-w-6xl px-4 py-6 pb-24 sm:px-6 sm:py-8 lg:border-x lg:border-border lg:pb-8">
        {children}
      </main>
      <MobileNav signedIn={!!user} />
      {user && profile && (
        <FeatureAnnouncementDialog
          userId={user.id}
          dismissedAnnouncements={profile.dismissed_announcements ?? []}
        />
      )}
    </div>
  );
}
