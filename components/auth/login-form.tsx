"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const redirect = searchParams.get("redirect") ?? "/profile";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const res = await fetch("/api/auth/sign-in", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, redirect }),
    });

    const json = await res.json().catch(() => ({}));
    setLoading(false);

    if (!res.ok) {
      toast.error(json.error ?? "Could not sign in");
      return;
    }

    toast.success("Signed in!");
    router.push(json.redirect ?? "/profile");
    router.refresh();
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4">
      <Card className="instrument-panel w-full max-w-md rounded-none shadow-none ring-0">
        <CardHeader className="border-b border-border text-center">
          <p className="instrument-label mb-2">Access Module</p>
          <CardTitle className="instrument-title text-xl">
            World Cup Instrument
          </CardTitle>
          <p className="instrument-meta mt-2">
            Enter your email to sign in
          </p>
        </CardHeader>
        <CardContent className="pt-6">
          {error === "deactivated" && (
            <p className="mb-4 border border-accent bg-accent/10 p-3 font-mono text-xs text-accent">
              Account deactivated · Contact an admin
            </p>
          )}
          {error === "auth" && (
            <p className="mb-4 border border-accent bg-accent/10 p-3 font-mono text-xs text-accent">
              Authentication failed · Please try again
            </p>
          )}
          {error === "not_invited" && (
            <p className="mb-4 border border-accent bg-accent/10 p-3 font-mono text-xs text-accent">
              This email isn&apos;t on the invite list · Contact Naren for access
            </p>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label className="instrument-label">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="rounded-none font-mono text-sm"
              />
            </div>
            <Button
              type="submit"
              className="w-full uppercase tracking-widest"
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign in"}
            </Button>
          </form>
          <p className="instrument-meta mt-6 text-center">
            <Link
              href="/"
              className="text-foreground underline-offset-4 hover:underline"
            >
              Back to leaderboard
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
