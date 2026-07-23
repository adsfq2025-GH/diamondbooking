import { fromZonedTime, toZonedTime } from "date-fns-tz";

function normalizeTimeString(time: string) {
  return time.length === 5 ? `${time}:00` : time;
}

export function localDateToUtcMidnight(date: string, timezone: string) {
  return fromZonedTime(`${date}T00:00:00`, timezone);
}

export function localDateTimeToUtc(date: string, time: string, timezone: string) {
  return fromZonedTime(`${date}T${normalizeTimeString(time)}`, timezone);
}

export function localDateDayOfWeek(date: string, timezone: string) {
  const middayUtc = fromZonedTime(`${date}T12:00:00`, timezone);
  return toZonedTime(middayUtc, timezone).getDay();
}

export function localDateStringInTimeZone(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = parts.find((part) => part.type === "year")?.value ?? "1970";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";
  return `${year}-${month}-${day}`;
}
