"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AvatarUpload } from "@/components/profile/avatar-upload";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/supabase/types";

type ProfileFormProps = {
  profile: Profile;
};

export function ProfileForm({ profile: initialProfile }: ProfileFormProps) {
  const [profile, setProfile] = useState(initialProfile);
  const [displayName, setDisplayName] = useState(initialProfile.display_name);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const supabase = createClient();
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: displayName.trim() })
      .eq("id", profile.id);

    setSaving(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    setProfile({ ...profile, display_name: displayName.trim() });
    toast.success("Profile updated!");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-md space-y-6">
      <header className="border-b border-border pb-6">
        <p className="instrument-label mb-2">User Module</p>
        <h1 className="instrument-title text-xl">Your Profile</h1>
      </header>

      <Card className="instrument-panel rounded-none shadow-none ring-0">
        <CardHeader className="border-b border-border">
          <CardTitle className="instrument-heading text-sm">Avatar</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center">
          <AvatarUpload
            userId={profile.id}
            displayName={profile.display_name}
            avatarUrl={profile.avatar_url}
            onUploaded={(url) => setProfile({ ...profile, avatar_url: url })}
          />
        </CardContent>
      </Card>

      <Card className="instrument-panel rounded-none shadow-none ring-0">
        <CardHeader className="border-b border-border">
          <CardTitle className="instrument-heading text-sm">Display Name</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="displayName" className="instrument-label">
                Name
              </Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
                minLength={2}
                maxLength={30}
                className="rounded-none font-mono text-sm"
              />
            </div>
            <Button type="submit" className="w-full uppercase tracking-widest" disabled={saving}>
              {saving ? "Saving..." : "Save changes"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
