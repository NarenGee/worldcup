import {
  POWER_UP_DESCRIPTIONS,
  POWER_UP_LABELS,
} from "@/lib/power-ups";

export const ANNOUNCEMENT_IDS = {
  qfPowerUps: "qf-power-ups-v1",
} as const;

export type AnnouncementId =
  (typeof ANNOUNCEMENT_IDS)[keyof typeof ANNOUNCEMENT_IDS];

export type AnnouncementFeature = {
  label: string;
  description: string;
};

export type AnnouncementConfig = {
  id: AnnouncementId;
  label: string;
  title: string;
  intro: string;
  features: AnnouncementFeature[];
  ctaHref: string;
  ctaLabel: string;
};

export const QF_POWER_UPS_ANNOUNCEMENT: AnnouncementConfig = {
  id: ANNOUNCEMENT_IDS.qfPowerUps,
  label: "New feature",
  title: "Quarter-final power-ups",
  intro:
    "Two new picks unlock for the quarter-finals on the Predict page. Sneak peek locks in when confirmed; double points can be changed until kickoff.",
  features: [
    {
      label: POWER_UP_LABELS.double_points,
      description: POWER_UP_DESCRIPTIONS.double_points,
    },
    {
      label: POWER_UP_LABELS.sneak_peek,
      description: POWER_UP_DESCRIPTIONS.sneak_peek,
    },
  ],
  ctaHref: "/predict",
  ctaLabel: "Go to Predict",
};

export const ACTIVE_ANNOUNCEMENTS: AnnouncementConfig[] = [
  QF_POWER_UPS_ANNOUNCEMENT,
];

export function hasDismissedAnnouncement(
  dismissedAnnouncements: string[] | null | undefined,
  announcementId: AnnouncementId
): boolean {
  return (dismissedAnnouncements ?? []).includes(announcementId);
}

export function getPendingAnnouncements(
  dismissedAnnouncements: string[] | null | undefined
): AnnouncementConfig[] {
  return ACTIVE_ANNOUNCEMENTS.filter(
    (announcement) =>
      !hasDismissedAnnouncement(dismissedAnnouncements, announcement.id)
  );
}
