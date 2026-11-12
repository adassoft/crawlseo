export function cnDelta(value: number, invert = false): string {
  const good = invert ? value < 0 : value > 0;
  const bad = invert ? value > 0 : value < 0;
  if (good) return "text-signal";
  if (bad) return "text-danger";
  return "text-muted-foreground";
}

export function formatDeltaPercent(value: number): string {
  if (!Number.isFinite(value) || value === 0) return "0%";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(value % 1 === 0 ? 0 : 1)}%`;
}

export function formatDeltaPosition(value: number): string {
  // value is previous - current; positive means improved (moved up)
  if (!Number.isFinite(value) || Math.abs(value) < 0.05) return "0.0";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}`;
}

const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

export const DEFAULT_TIMEZONE =
  process.env.NEXT_PUBLIC_TIMEZONE ||
  process.env.APP_TIMEZONE ||
  process.env.TZ ||
  "America/Sao_Paulo";

function getZonedParts(date: Date, timeZone: string) {
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      hour12: false,
    });
    const parts = formatter.formatToParts(date);
    const map: Record<string, number> = {};
    for (const p of parts) {
      if (p.type !== "literal") {
        map[p.type] = parseInt(p.value, 10);
      }
    }
    return {
      year: map.year,
      month: map.month,
      day: map.day,
      hour: map.hour === 24 ? 0 : map.hour,
      minute: map.minute,
    };
  } catch {
    return {
      year: date.getUTCFullYear(),
      month: date.getUTCMonth() + 1,
      day: date.getUTCDate(),
      hour: date.getUTCHours(),
      minute: date.getUTCMinutes(),
    };
  }
}

/**
 * The date format of the app: "3 Out", "3 Out 2026" with the year,
 * "3 Out 14:02" with the time. Formatted in the target timezone (default: America/Sao_Paulo).
 * A plain "YYYY-MM-DD" string is taken as that calendar day (no timezone shift).
 */
export function formatDay(
  value: Date | string,
  { year = false, time = false, timeZone = DEFAULT_TIMEZONE }: { year?: boolean; time?: boolean; timeZone?: string } = {}
): string {
  // If it's a plain YYYY-MM-DD string (e.g. from GSC), treat as literal calendar day without timezone shift
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [yStr, mStr, dStr] = value.split("-");
    const y = parseInt(yStr, 10);
    const m = parseInt(mStr, 10);
    const d = parseInt(dStr, 10);
    let out = `${d} ${MONTHS[m - 1]}`;
    if (year) out += ` ${y}`;
    return out;
  }

  const d = new Date(value);
  const zoned = getZonedParts(d, timeZone);
  let out = `${zoned.day} ${MONTHS[zoned.month - 1]}`;
  if (year) out += ` ${zoned.year}`;
  if (time) {
    const hh = String(zoned.hour).padStart(2, "0");
    const mm = String(zoned.minute).padStart(2, "0");
    out += ` ${hh}:${mm}`;
  }
  return out;
}

/** A signed delta with a real minus sign: "+8.3", "−3.5". */
export function signed(value: number, digits = 1): string {
  const abs = Math.abs(value).toFixed(digits);
  if (Number(abs) === 0) return abs;
  return value > 0 ? `+${abs}` : `−${abs}`;
}
