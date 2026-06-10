"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, Target, Calendar, User, LogIn } from "lucide-react";
import { cn } from "@/lib/utils";

const baseLinks = [
  { href: "/", label: "Board", icon: LayoutGrid },
  { href: "/predict", label: "Predict", icon: Target },
  { href: "/matches", label: "Matches", icon: Calendar },
];

type MobileNavProps = {
  signedIn: boolean;
};

export function MobileNav({ signedIn }: MobileNavProps) {
  const pathname = usePathname();

  const links = [
    ...baseLinks,
    signedIn
      ? { href: "/profile", label: "Profile", icon: User }
      : { href: "/login", label: "Sign in", icon: LogIn },
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-card/95 backdrop-blur-sm lg:hidden">
      <div className="mx-auto flex max-w-lg items-stretch justify-around">
        {links.map((link) => {
          const Icon = link.icon;
          const isSignIn = !signedIn && link.href === "/login";
          const active =
            pathname === link.href ||
            (isSignIn && pathname.startsWith("/login"));

          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "relative flex flex-1 flex-col items-center gap-0.5 px-2 py-2.5 transition-colors",
                isSignIn && !active && "text-primary-foreground",
                isSignIn && !active && "mx-1 my-1 rounded-sm bg-primary",
                active && !isSignIn && "text-primary",
                !active && !isSignIn && "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon
                className={cn(
                  "size-5",
                  active && !isSignIn && "text-primary",
                  isSignIn && !active && "text-primary-foreground"
                )}
                strokeWidth={active || isSignIn ? 2.5 : 2}
              />
              <span className="font-mono text-[9px] uppercase tracking-wider">
                {link.label}
              </span>
              {active && (
                <span className="absolute bottom-0 left-1/2 h-0.5 w-8 -translate-x-1/2 bg-accent" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
