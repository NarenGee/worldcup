"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { resolveAvatarUrl } from "@/lib/avatars";
import { cn } from "@/lib/utils";
import type { Profile } from "@/lib/supabase/types";

const links = [
  { href: "/", label: "Leaderboard" },
  { href: "/predict", label: "Predict" },
  { href: "/matches", label: "Matches" },
  { href: "/profile", label: "Profile" },
];

type NavBarProps = {
  profile: Profile | null;
};

function sessionDate() {
  const now = new Date();
  return `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, "0")}.${String(now.getDate()).padStart(2, "0")}`;
}

export function NavBar({ profile }: NavBarProps) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-card/90 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:grid lg:grid-cols-[1fr_auto_1fr] lg:gap-2">
        <div className="hidden min-w-0 lg:block">
          <p className="instrument-meta">
            Session <span className="text-wc-blue">{sessionDate()}</span>
          </p>
          <p className="instrument-meta mt-0.5">
            <span className="inline-block size-1.5 rounded-full bg-primary" />{" "}
            Live
          </p>
        </div>

        <Link href="/" className="min-w-0 lg:text-center">
          <span className="block font-display text-sm font-black uppercase tracking-[0.1em] text-foreground sm:text-base lg:tracking-[0.14em]">
            <span className="text-primary sm:hidden">WC</span>
            <span className="text-primary hidden sm:inline">World Cup</span>{" "}
            <span>Predictions</span>
          </span>
        </Link>

        <div className="flex shrink-0 items-center justify-end gap-2">
          <nav className="hidden items-center gap-0 lg:flex">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "instrument-meta border border-transparent px-2.5 py-1.5 transition-colors",
                  pathname === link.href
                    ? "border-primary bg-primary text-primary-foreground"
                    : "hover:border-border hover:bg-secondary/60 hover:text-secondary-foreground"
                )}
              >
                {link.label}
              </Link>
            ))}
            {profile?.is_admin && (
              <Link
                href="/admin"
                className={cn(
                  "instrument-meta border border-transparent px-2.5 py-1.5 transition-colors",
                  pathname.startsWith("/admin")
                    ? "border-accent bg-accent text-accent-foreground"
                    : "hover:border-border hover:bg-secondary/60"
                )}
              >
                Admin
              </Link>
            )}
          </nav>

          {profile ? (
            <Link href="/profile" className="hidden shrink-0 lg:block">
              <Avatar className="size-8 border-2 border-primary">
                <AvatarImage
                  src={resolveAvatarUrl(
                    profile.display_name,
                    profile.avatar_url
                  )}
                />
                <AvatarFallback className="bg-secondary font-mono text-[10px] text-secondary-foreground">
                  {profile.display_name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </Link>
          ) : (
            <Link
              href="/login"
              className="instrument-meta hidden border border-primary bg-primary px-2.5 py-1.5 text-primary-foreground lg:inline-block"
            >
              Login
            </Link>
          )}

          <Dialog>
            <DialogTrigger
              render={
                <Button
                  variant="outline"
                  size="icon"
                  className="size-9 border-primary text-primary lg:hidden"
                  aria-label="Open menu"
                />
              }
            >
              <Menu className="size-4" />
            </DialogTrigger>
            <DialogContent className="instrument-panel rounded-none sm:max-w-xs">
              <DialogHeader>
                <DialogTitle className="instrument-heading text-sm">
                  Navigation
                </DialogTitle>
              </DialogHeader>
              <nav className="flex flex-col gap-0">
                {links.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      "instrument-divider instrument-meta py-3 transition-colors",
                      pathname === link.href
                        ? "text-primary"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {link.label}
                  </Link>
                ))}
                {profile?.is_admin && (
                  <Link
                    href="/admin"
                    className={cn(
                      "instrument-divider instrument-meta py-3 transition-colors",
                      pathname.startsWith("/admin")
                        ? "text-accent"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Admin
                  </Link>
                )}
                {!profile && (
                  <Link
                    href="/login"
                    className="instrument-divider instrument-meta py-3 text-primary"
                  >
                    Login
                  </Link>
                )}
              </nav>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </header>
  );
}
