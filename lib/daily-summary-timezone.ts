const DEFAULT_TIMEZONE = "America/New_York";

export function getDailySummaryTimezone(): string {
  return process.env.DAILY_SUMMARY_TIMEZONE?.trim() || DEFAULT_TIMEZONE;
}

export function formatDateInTimezone(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function isTimestampOnDate(
  isoTimestamp: string,
  dateStr: string,
  timeZone: string
): boolean {
  return formatDateInTimezone(new Date(isoTimestamp), timeZone) === dateStr;
}

export function isOnOrBeforeDate(
  isoTimestamp: string,
  dateStr: string,
  timeZone: string
): boolean {
  return formatDateInTimezone(new Date(isoTimestamp), timeZone) <= dateStr;
}

export function formatDisplayDate(dateStr: string, timeZone: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const utcDate = new Date(Date.UTC(year, month - 1, day, 12));
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(utcDate);
}
