"use client";

import { useState } from "react";
import { toast } from "sonner";
import { PlayerAvatar } from "@/components/avatar/player-avatar";
import { createClient } from "@/lib/supabase/client";
import { getUniqueTeamsFromMatches, formatTeam } from "@/lib/teams";
import type { Match, Profile, TournamentResults } from "@/lib/supabase/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";

type AdminUser = Profile & { email: string };

type AdminPanelProps = {
  matches: Match[];
  users: AdminUser[];
  tournamentResults: TournamentResults;
};

const STAGES = ["group", "r16", "qf", "sf", "final"] as const;

export function AdminPanel({
  matches: initialMatches,
  users: initialUsers,
  tournamentResults: initialTournamentResults,
}: AdminPanelProps) {
  const [matches, setMatches] = useState(initialMatches);
  const [users, setUsers] = useState(initialUsers);
  const [tournamentResults, setTournamentResults] =
    useState(initialTournamentResults);
  const [syncing, setSyncing] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviting, setInviting] = useState(false);

  const [newMatch, setNewMatch] = useState({
    stage: "group" as Match["stage"],
    home_team: "",
    away_team: "",
    kickoff_at: "",
  });

  const supabase = createClient();
  const teams = getUniqueTeamsFromMatches(matches);

  async function syncResults() {
    setSyncing(true);
    const res = await fetch("/api/admin/sync-results", { method: "POST" });
    const json = await res.json();
    setSyncing(false);

    if (!res.ok) {
      toast.error(json.error ?? "Sync failed");
      return;
    }

    const scored =
      typeof json.predictionsScored === "number"
        ? ` · ${json.predictionsScored} predictions scored`
        : "";
    toast.success(
      `Synced ${json.upserted} of ${json.total} matches (${json.skipped} skipped)${scored}`
    );
    const { data } = await supabase
      .from("matches")
      .select("*")
      .order("kickoff_at");
    if (data) setMatches(data);
  }

  async function updateMatch(
    id: number,
    updates: {
      home_score?: number | null;
      away_score?: number | null;
      result_confirmed?: boolean;
    }
  ) {
    const { data, error } = await supabase
      .from("matches")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      toast.error(error.message);
      return;
    }

    setMatches((prev) => prev.map((m) => (m.id === id ? data : m)));

    const { error: scoreError } = await supabase.rpc("score_predictions");
    if (scoreError) {
      console.warn("score_predictions:", scoreError.message);
    }

    toast.success("Match updated");
  }

  async function addMatch() {
    if (!newMatch.home_team || !newMatch.away_team || !newMatch.kickoff_at) {
      toast.error("Fill in all match fields");
      return;
    }

    const { data, error } = await supabase
      .from("matches")
      .insert({
        stage: newMatch.stage,
        home_team: newMatch.home_team,
        away_team: newMatch.away_team,
        kickoff_at: new Date(newMatch.kickoff_at).toISOString(),
      })
      .select()
      .single();

    if (error) {
      toast.error(error.message);
      return;
    }

    setMatches((prev) => [...prev, data].sort(
      (a, b) => new Date(a.kickoff_at).getTime() - new Date(b.kickoff_at).getTime()
    ));
    setNewMatch({ stage: "group", home_team: "", away_team: "", kickoff_at: "" });
    toast.success("Match added");
  }

  async function saveTournamentResults() {
    const { data, error } = await supabase
      .from("tournament_results")
      .update({
        champion: tournamentResults.champion,
        top_scorer: tournamentResults.top_scorer,
        updated_at: new Date().toISOString(),
      })
      .eq("id", 1)
      .select()
      .single();

    if (error) {
      toast.error(error.message);
      return;
    }

    setTournamentResults(data);
    toast.success("Tournament results saved");
  }

  async function updateUser(
    id: string,
    updates: { is_admin?: boolean; is_active?: boolean }
  ) {
    const { error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", id);

    if (error) {
      toast.error(error.message);
      return;
    }

    setUsers((prev) =>
      prev.map((u) => (u.id === id ? { ...u, ...updates } : u))
    );
    toast.success("User updated");
  }

  async function inviteUser() {
    if (!inviteEmail || !inviteName) {
      toast.error("Email and display name required");
      return;
    }

    setInviting(true);
    const res = await fetch("/api/admin/invite-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: inviteEmail, display_name: inviteName }),
    });
    setInviting(false);

    const json = await res.json();
    if (!res.ok) {
      toast.error(json.error ?? "Invite failed");
      return;
    }

    toast.success(`Invite sent to ${inviteEmail}`);
    setInviteEmail("");
    setInviteName("");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Admin Panel</h1>
        <p className="text-sm text-muted-foreground">
          Manage matches, users, and tournament results
        </p>
      </div>

      <Tabs defaultValue="matches" className="gap-4">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="matches">Matches</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
        </TabsList>

        <TabsContent value="matches" className="space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              {matches.length} match{matches.length === 1 ? "" : "es"} loaded
            </p>
            <Button onClick={syncResults} disabled={syncing} className="sm:w-auto">
              {syncing ? "Syncing..." : "Sync from API"}
            </Button>
          </div>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="order-2 space-y-3 lg:order-1">
              <h2 className="text-sm font-medium">All matches</h2>
              {matches.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-sm text-muted-foreground">
                    No matches yet. Sync from the API or add one manually.
                  </CardContent>
                </Card>
              ) : (
                matches.map((match) => (
                  <Card key={match.id}>
                    <CardContent className="space-y-3 py-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="space-y-1">
                          <p className="text-sm font-medium">
                            {formatTeam(match.home_team)} vs{" "}
                            {formatTeam(match.away_team)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(match.kickoff_at), "d MMM yyyy HH:mm")}{" "}
                            · {match.stage}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Label htmlFor={`confirmed-${match.id}`} className="text-xs">
                            Confirmed
                          </Label>
                          <Switch
                            id={`confirmed-${match.id}`}
                            checked={match.result_confirmed}
                            onCheckedChange={(v) =>
                              updateMatch(match.id, { result_confirmed: v })
                            }
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label htmlFor={`home-${match.id}`} className="text-xs">
                            Home score
                          </Label>
                          <Input
                            id={`home-${match.id}`}
                            type="number"
                            min={0}
                            max={20}
                            placeholder="0"
                            value={match.home_score ?? ""}
                            onChange={(e) =>
                              updateMatch(match.id, {
                                home_score: e.target.value
                                  ? Number(e.target.value)
                                  : null,
                              })
                            }
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor={`away-${match.id}`} className="text-xs">
                            Away score
                          </Label>
                          <Input
                            id={`away-${match.id}`}
                            type="number"
                            min={0}
                            max={20}
                            placeholder="0"
                            value={match.away_score ?? ""}
                            onChange={(e) =>
                              updateMatch(match.id, {
                                away_score: e.target.value
                                  ? Number(e.target.value)
                                  : null,
                              })
                            }
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>

            <div className="order-1 space-y-4 lg:order-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Tournament Results</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="champion">Champion</Label>
                    <Select
                      value={tournamentResults.champion ?? ""}
                      onValueChange={(v) =>
                        setTournamentResults({ ...tournamentResults, champion: v })
                      }
                    >
                      <SelectTrigger id="champion">
                        <SelectValue placeholder="Select champion" />
                      </SelectTrigger>
                      <SelectContent>
                        {teams.map((team) => (
                          <SelectItem key={team} value={team}>
                            {formatTeam(team)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="top-scorer">Top scorer</Label>
                    <Input
                      id="top-scorer"
                      value={tournamentResults.top_scorer ?? ""}
                      onChange={(e) =>
                        setTournamentResults({
                          ...tournamentResults,
                          top_scorer: e.target.value,
                        })
                      }
                      placeholder="Player name"
                    />
                  </div>
                  <Button onClick={saveTournamentResults} className="w-full">
                    Save results
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Add Match</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="match-stage">Stage</Label>
                    <Select
                      value={newMatch.stage}
                      onValueChange={(v) =>
                        setNewMatch({ ...newMatch, stage: v as Match["stage"] })
                      }
                    >
                      <SelectTrigger id="match-stage">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STAGES.map((s) => (
                          <SelectItem key={s} value={s}>
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="home-team">Home team</Label>
                    <Input
                      id="home-team"
                      placeholder="Home team"
                      value={newMatch.home_team}
                      onChange={(e) =>
                        setNewMatch({ ...newMatch, home_team: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="away-team">Away team</Label>
                    <Input
                      id="away-team"
                      placeholder="Away team"
                      value={newMatch.away_team}
                      onChange={(e) =>
                        setNewMatch({ ...newMatch, away_team: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="kickoff-at">Kickoff</Label>
                    <Input
                      id="kickoff-at"
                      type="datetime-local"
                      value={newMatch.kickoff_at}
                      onChange={(e) =>
                        setNewMatch({ ...newMatch, kickoff_at: e.target.value })
                      }
                    />
                  </div>
                  <Button onClick={addMatch} className="w-full">
                    Add match
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          <Card className="max-w-md">
            <CardHeader>
              <CardTitle className="text-lg">Invite User</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="invite-email">Email</Label>
                <Input
                  id="invite-email"
                  type="email"
                  placeholder="Email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invite-name">Display name</Label>
                <Input
                  id="invite-name"
                  placeholder="Display name"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                />
              </div>
              <Button onClick={inviteUser} disabled={inviting} className="w-full">
                {inviting ? "Sending..." : "Send invite"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">All users</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead>Admin</TableHead>
                      <TableHead>Active</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <PlayerAvatar
                              displayName={user.display_name}
                              avatarUrl={user.avatar_url}
                              className="h-8 w-8"
                              fallbackClassName="text-xs"
                            />
                            <span className="text-sm">{user.display_name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{user.email}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {format(new Date(user.created_at), "d MMM yyyy")}
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={user.is_admin}
                            onCheckedChange={(v) =>
                              updateUser(user.id, { is_admin: v })
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={user.is_active}
                            onCheckedChange={(v) =>
                              updateUser(user.id, { is_active: v })
                            }
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
