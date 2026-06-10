"use client";

import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { resolveAvatarUrl } from "@/lib/avatars";
import { cn } from "@/lib/utils";

type PlayerAvatarProps = {
  displayName: string;
  avatarUrl?: string | null;
  className?: string;
  fallbackClassName?: string;
};

export function PlayerAvatar({
  displayName,
  avatarUrl,
  className,
  fallbackClassName,
}: PlayerAvatarProps) {
  const [open, setOpen] = useState(false);
  const src = resolveAvatarUrl(displayName, avatarUrl);

  if (!src) {
    return (
      <Avatar className={className}>
        <AvatarFallback className={fallbackClassName}>
          {displayName.slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        aria-label={`View ${displayName}'s photo`}
      >
        <Avatar
          className={cn(
            className,
            "cursor-pointer transition-opacity hover:opacity-80"
          )}
        >
          <AvatarImage src={src} />
          <AvatarFallback className={fallbackClassName}>
            {displayName.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="max-w-[min(90vw,28rem)] border-0 bg-transparent p-0 shadow-none ring-0"
          showCloseButton
        >
          <DialogTitle className="sr-only">{displayName}</DialogTitle>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={displayName}
            className="w-full rounded-xl border border-foreground/10"
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
