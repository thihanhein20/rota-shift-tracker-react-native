// src/utils/time.ts

/** Convert "9:00 AM" → "09:00:00" for Date parsing */
export function to24Hour(time: string): string {
  const [t, period] = time.split(" ");
  let [h, m] = t.split(":").map(Number);
  if (period === "PM" && h !== 12) h += 12;
  if (period === "AM" && h === 12) h = 0;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`;
}

/** Calculate decimal hours between two time strings */
export function calculateHours(startTime: string, endTime: string): number {
  const parse = (t: string) => {
    const [time, period] = t.split(" ");
    let [h, m] = time.split(":").map(Number);
    if (period === "PM" && h !== 12) h += 12;
    if (period === "AM" && h === 12) h = 0;
    return h * 60 + m;
  };
  const diff = parse(endTime) - parse(startTime);
  return Math.round((diff / 60) * 10) / 10;
}

export function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day); // local time, no UTC shift
}

/** Format "2026-04-20" → "Sunday, Apr 20" */
export function formatDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-AU", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

/** Today's date as YYYY-MM-DD */
export function todayString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseTimeToMinutes(time: string): number {
  const [rawTime, period] = time.split(" ");
  let [hours, minutes] = rawTime.split(":").map(Number);
  if (period === "PM" && hours !== 12) hours += 12;
  if (period === "AM" && hours === 12) hours = 0;
  return hours * 60 + minutes;
}

export function minutesToY(
  minutes: number,
  startHour: number,
  pxPerHour: number,
): number {
  return ((minutes - startHour * 60) / 60) * pxPerHour;
}

export function doTimesOverlap(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string,
): boolean {
  const aS = parseTimeToMinutes(aStart);
  const aE = parseTimeToMinutes(aEnd);
  const bS = parseTimeToMinutes(bStart);
  const bE = parseTimeToMinutes(bEnd);
  return aS < bE && bS < aE;
}

export function formatDisplayTime(time: string): string {
  return time;
}
