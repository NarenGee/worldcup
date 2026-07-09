"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  getPendingAnnouncements,
  hasDismissedAnnouncement,
  type AnnouncementConfig,
} from "@/lib/announcements";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type FeatureAnnouncementDialogProps = {
  userId: string;
  dismissedAnnouncements: string[];
};

export function FeatureAnnouncementDialog({
  userId,
  dismissedAnnouncements: initialDismissedAnnouncements,
}: FeatureAnnouncementDialogProps) {
  const [dismissedAnnouncements, setDismissedAnnouncements] = useState(
    initialDismissedAnnouncements
  );
  const [announcement, setAnnouncement] = useState<AnnouncementConfig | null>(
    null
  );
  const [open, setOpen] = useState(false);
  const [dismissing, setDismissing] = useState(false);

  useEffect(() => {
    const pending = getPendingAnnouncements(dismissedAnnouncements);
    const nextAnnouncement = pending[0] ?? null;
    setAnnouncement(nextAnnouncement);
    setOpen(nextAnnouncement !== null);
  }, [dismissedAnnouncements]);

  async function dismissAnnouncement() {
    if (!announcement || dismissing) return;

    if (hasDismissedAnnouncement(dismissedAnnouncements, announcement.id)) {
      setOpen(false);
      return;
    }

    const nextDismissed = [...dismissedAnnouncements, announcement.id];
    setDismissedAnnouncements(nextDismissed);
    setOpen(false);
    setDismissing(true);

    const supabase = createClient();
    const { error } = await supabase
      .from("profiles")
      .update({ dismissed_announcements: nextDismissed })
      .eq("id", userId);

    setDismissing(false);

    if (error) {
      setDismissedAnnouncements(dismissedAnnouncements);
      setOpen(true);
      toast.error("Could not save announcement dismissal");
    }
  }

  if (!announcement) return null;

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          void dismissAnnouncement();
          return;
        }
        setOpen(nextOpen);
      }}
    >
      <DialogContent className="instrument-panel max-w-md rounded-none sm:max-w-md">
        <DialogHeader className="gap-3 border-b border-border pb-4">
          <p className="instrument-label">{announcement.label}</p>
          <DialogTitle className="instrument-heading text-left text-base">
            {announcement.title}
          </DialogTitle>
          <DialogDescription className="instrument-meta text-left normal-case tracking-normal">
            {announcement.intro}
          </DialogDescription>
        </DialogHeader>

        <ul className="space-y-3">
          {announcement.features.map((feature) => (
            <li
              key={feature.label}
              className="border border-border bg-secondary/20 px-3 py-2.5"
            >
              <p className="instrument-heading text-sm">{feature.label}</p>
              <p className="instrument-meta mt-1 normal-case tracking-normal">
                {feature.description}
              </p>
            </li>
          ))}
        </ul>

        <DialogFooter className="border-t border-border bg-transparent p-0 pt-4 sm:justify-between">
          <Button
            type="button"
            variant="outline"
            className="rounded-none uppercase tracking-widest"
            onClick={() => void dismissAnnouncement()}
            disabled={dismissing}
          >
            Got it
          </Button>
          <Link
            href={announcement.ctaHref}
            className={cn(
              buttonVariants(),
              "rounded-none uppercase tracking-widest"
            )}
            onClick={() => void dismissAnnouncement()}
          >
            {announcement.ctaLabel}
          </Link>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
