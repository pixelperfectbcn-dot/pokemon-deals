export function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function stripHtml(value: string) {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

export function parsePriceFromText(value: string) {
  const compact = value.replace(/\./g, "").replace(/,/g, ".");
  const match =
    compact.match(/(\d+(?:\.\d{1,2})?)\s*€/i) ||
    compact.match(/€\s*(\d+(?:\.\d{1,2})?)/i);
  return match ? Number(match[1]) : undefined;
}
