export type StatementRow = { date: string; description: string; source: string; candidate: boolean; confirmed: boolean };

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

function validDate(year: number, month: number, day: number) {
  const value = new Date(Date.UTC(year, month - 1, day));
  return value.getUTCFullYear() === year && value.getUTCMonth() === month - 1 && value.getUTCDate() === day
    ? `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}` : null;
}

/** Extract dated lines for review. A POS label is a clue, never proof of an Irish purchase. */
export function extractStatementRows(text: string, source: string, fallbackYear: number): StatementRow[] {
  const rows: StatementRow[] = [];
  for (const line of text.split(/\r?\n/)) {
    const iso = line.match(/^\s*(\d{4})-(\d{2})-(\d{2})\b/);
    const numeric = line.match(/^\s*(\d{1,2})[/.\-](\d{1,2})(?:[/.\-](\d{4}|\d{2}))?\b/);
    const named = line.match(/^\s*(\d{1,2})\s*[- ]?\s*(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)(?:\s*[- ]?\s*(\d{4}|\d{2})\b(?![.\d]))?/i);
    const match = iso ?? numeric ?? named;
    if (!match) continue;
    const yearText = iso ? iso[1] : match[3];
    const year = yearText ? (yearText.length === 2 ? 2000 + Number(yearText) : Number(yearText)) : fallbackYear;
    const month = iso ? Number(iso[2]) : numeric ? Number(numeric[2]) : MONTHS.indexOf(named![2].slice(0, 3).toLowerCase()) + 1;
    const day = iso ? Number(iso[3]) : Number(match[1]);
    const date = validDate(year, month, day);
    const description = line.slice(match[0].length).trim();
    if (!date || !description) continue;
    const excluded = /\b(online|e-?commerce|atm|cash withdrawal|direct debit|standing order|transfer|refund|reversal|balance)\b/i.test(description);
    const candidate = !excluded && /\b(pos|point[ -]of[ -]sale|contactless|visa debit|debit card|card purchase|card payment)\b/i.test(description);
    rows.push({ date, description, source, candidate, confirmed: false });
  }
  return rows;
}

export function monthlyPosCounts(rows: StatementRow[], start: string) {
  const [year, month] = start.split("-").map(Number);
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) return [];
  return Array.from({ length: 3 }, (_, offset) => {
    const date = new Date(Date.UTC(year, month - 1 + offset, 1));
    const key = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
    return { month: key, count: rows.filter((row) => row.confirmed && row.date.startsWith(`${key}-`)).length };
  });
}
