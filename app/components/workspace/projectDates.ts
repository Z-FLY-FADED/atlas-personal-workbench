function validDateParts(year: number, month: number, day: number) {
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day;
}

function isoDate(year: number, month: number, day: number) {
  if (!validDateParts(year, month, day)) return "";
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function projectDueDateInputValue(value?: string, referenceDate = new Date()) {
  const text = String(value || "").trim();
  if (!text || text === "待安排") return "";

  const isoMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) return isoDate(Number(isoMatch[1]), Number(isoMatch[2]), Number(isoMatch[3]));

  const slashMatch = text.match(/^(\d{4})[/.](\d{1,2})[/.](\d{1,2})$/);
  if (slashMatch) return isoDate(Number(slashMatch[1]), Number(slashMatch[2]), Number(slashMatch[3]));

  const chineseMatch = text.match(/^(?:(\d{2,4})\s*年)?\s*(\d{1,2})\s*月(?:\s*(\d{1,2})\s*日?)?$/);
  if (!chineseMatch) return "";

  const rawYear = chineseMatch[1] ? Number(chineseMatch[1]) : referenceDate.getFullYear();
  const year = rawYear < 100 ? 2000 + rawYear : rawYear;
  const month = Number(chineseMatch[2]);
  const day = chineseMatch[3]
    ? Number(chineseMatch[3])
    : new Date(Date.UTC(year, month, 0)).getUTCDate();
  return isoDate(year, month, day);
}

export function formatProjectDueDate(value?: string) {
  const text = String(value || "").trim();
  const isoMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!isoMatch || !validDateParts(Number(isoMatch[1]), Number(isoMatch[2]), Number(isoMatch[3]))) {
    return text || "待安排";
  }
  return `${Number(isoMatch[1])}年${Number(isoMatch[2])}月${Number(isoMatch[3])}日`;
}
