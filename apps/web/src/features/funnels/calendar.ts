import type { FunnelFields } from "./model.js";

/** Preview calendar event only. Never imports an attendee or claims registration. */
export function calendarTimes(fields: FunnelFields, now = Date.now()) {
  const start = Date.parse(fields.eventStartsAt);
  if (
    !Number.isFinite(start) ||
    start <= now ||
    !Number.isInteger(fields.eventDurationMinutes) ||
    fields.eventDurationMinutes < 15 ||
    fields.eventDurationMinutes > 240
  )
    return null;
  const end = start + fields.eventDurationMinutes * 60000;
  const compact = (value: number) =>
    new Date(value)
      .toISOString()
      .replace(/[-:]/gu, "")
      .replace(/\.\d{3}/u, "");
  return { start: compact(start), end: compact(end) };
}
const escapeIcs = (value: string) =>
  value
    .replace(/\\/gu, "\\\\")
    .replace(/[\r\n]+/gu, "\\n")
    .replace(/;/gu, "\\;")
    .replace(/,/gu, "\\,");
/** RFC 5545 folding at 73 UTF-8 bytes, preserving multibyte characters. */
function fold(line: string) {
  let result = "",
    current = "";
  for (const char of line) {
    if (new TextEncoder().encode(current + char).length > 73) {
      result += current + "\r\n ";
      current = char;
    } else current += char;
  }
  return result + current;
}
export function previewCalendar(
  fields: FunnelFields,
  now = Date.now(),
  confirmed = false,
): string | null {
  const times = calendarTimes(fields, now);
  if (!times) return null;
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:-//AutomatedLO//${confirmed ? "Registered Webinar" : "Funnel Preview"}//EN`,
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${confirmed ? "webinar" : "preview"}-${times.start}@automatedlo.invalid`,
    `DTSTAMP:${times.start}`,
    `DTSTART:${times.start}`,
    `DTEND:${times.end}`,
    `SUMMARY:${escapeIcs(`${confirmed ? "" : "[PREVIEW] "}${fields.offerTitle}`)}`,
    `DESCRIPTION:${escapeIcs(confirmed ? "Your webinar registration was received. Use the joining link at the scheduled time." : "Preview event only. This does not register you for a webinar.")}`,
    `LOCATION:${escapeIcs(fields.webinarUrl || "Online")}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.map(fold).join("\r\n") + "\r\n";
}
export function googleCalendarLink(fields: FunnelFields, now = Date.now(), confirmed = false) {
  const times = calendarTimes(fields, now);
  if (!times) return null;
  const query = new URLSearchParams({
    action: "TEMPLATE",
    text: `${confirmed ? "" : "[PREVIEW] "}${fields.offerTitle}`,
    dates: `${times.start}/${times.end}`,
    details: confirmed
      ? "Your webinar registration was received. Use the joining link at the scheduled time."
      : "Preview event only. This does not register you for a webinar.",
    location: fields.webinarUrl || "Online",
    ctz: fields.eventTimeZone,
  });
  return `https://calendar.google.com/calendar/render?${query}`;
}
export function eventLabel(fields: FunnelFields) {
  if (!fields.eventStartsAt) return "Date to be announced";
  return (
    new Intl.DateTimeFormat("en-US", {
      dateStyle: "long",
      timeStyle: "short",
      timeZone: fields.eventTimeZone,
    }).format(new Date(fields.eventStartsAt)) + ` (${fields.eventTimeZone.replaceAll("_", " ")})`
  );
}
