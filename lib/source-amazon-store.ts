import type { AmazonScrapeItem, Deal } from "./types";
import { normalizeText, parsePriceFromText, stripHtml } from "./text";

function classifyProduct(title: string) {
  const t = normalizeText(title);
  if (t.includes("elite trainer box") || t.includes(" etb")) return "ETB";
  if (t.includes("booster box") || t.includes("display")) return "Booster Box";
  if (t.includes("booster bundle")) return "Booster Bundle";
  if (t.includes("booster") || t.includes("sobre") || t.includes("pack")) return "Booster Pack";
  return "Other";
}

function inferSetName(title: string) {
  const knownSets = [
    "151",
    "Temporal Forces",
    "Surging Sparks",
    "Paldea Evolved",
    "Paradox Rift",
    "Twilight Masquerade"
  ];

  const normalized = normalizeText(title);
  const match = knownSets.find((setName) => normalized.includes(normalizeText(setName)));
  return match ?? "Mixed";
}

function inferPricePerPack(title: string, price: number, productType: string) {
  const normalized = normalizeText(title);
  const packMatch = normalized.match(/(\d+)\s*(sobres|boosters|packs)/);
  if (packMatch) {
    const units = Number(packMatch[1]);
    if (units > 0) return Number((price / units).toFixed(2));
  }

  if (productType === "ETB") return Number((price / 9).toFixed(2));
  if (productType === "Booster Bundle") return Number((price / 6).toFixed(2));
  if (productType === "Booster Box") return Number((price / 36).toFixed(2));
  return price;
}

function inferScore(pricePerPack: number) {
  let score = 70;
  if (pricePerPack <= 3.7) score += 25;
  else if (pricePerPack <= 4.5) score += 18;
  else if (pricePerPack <= 5.5) score += 10;
  return Math.min(99, score + 7);
}

function absoluteUrl(url: string, baseUrl: string) {
  if (url.startsWith("http")) return url;
  if (url.startsWith("/")) return `${baseUrl}${url}`;
  return `${baseUrl}/${url}`;
}

function parseStoreLinks(html: string, baseUrl: string): AmazonScrapeItem[] {
  const items: AmazonScrapeItem[] = [];
  const anchorRegex = /<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  let match: RegExpExecArray | null = null;

  while ((match = anchorRegex.exec(html)) !== null) {
    const href = match[1] || "";
    const inner = match[2] || "";
    const text = stripHtml(inner);

    if (!href || !text) continue;
    if (!normalizeText(text).includes("pokemon")) continue;

    const contextStart = Math.max(0, match.index - 1200);
    const contextEnd = Math.min(html.length, match.index + 2500);
    const context = html.slice(contextStart, contextEnd);

    const price =
      parsePriceFromText(context) ??
      parsePriceFromText(text);

    items.push({
      title: text,
      url: absoluteUrl(href, baseUrl),
      price
    });
  }

  return items;
}

function filterStoreItems(items: AmazonScrapeItem[]) {
  const requirePokemon = (process.env.AMAZON_REQUIRE_POKEMON ?? "true").toLowerCase() !== "false";
  const allowedTypes = (process.env.AMAZON_ALLOWED_PRODUCT_TYPES ?? "ETB,Booster Box,Booster Bundle,Booster Pack")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);

  const filtered = items.filter((item) => {
    const title = normalizeText(item.title);
    const isPokemon = !requirePokemon || title.includes("pokemon") || title.includes("jcc pokemon") || title.includes("pokemon tcg");
    const hasPrice = typeof item.price === "number" && item.price > 0;
    const productType = classifyProduct(item.title);
    const allowedType = allowedTypes.includes(productType);
    return isPokemon && hasPrice && allowedType;
  });

  const deduped = new Map<string, AmazonScrapeItem>();
  for (const item of filtered) {
    const key = [
      normalizeText(item.title),
      classifyProduct(item.title),
      inferSetName(item.title)
    ].join("|");

    if (!deduped.has(key)) {
      deduped.set(key, item);
    }
  }

  return [...deduped.values()];
}

export async function fetchAmazonOfficialStoreDeals(): Promise<Omit<Deal, "id" | "createdAt" | "updatedAt">[]> {
  const enabled = (process.env.AMAZON_STORE_ENABLED ?? "true").toLowerCase() !== "false";
  if (!enabled) return [];

  const storeUrl = process.env.AMAZON_STORE_URL;
  const baseUrl = process.env.AMAZON_BASE_URL ?? "https://www.amazon.es";
  const limit = Number(process.env.AMAZON_STORE_RESULT_LIMIT ?? "24");

  if (!storeUrl) {
    throw new Error("AMAZON_STORE_URL no está configurada");
  }

  const response = await fetch(storeUrl, {
    headers: {
      "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      "accept-language": "es-ES,es;q=0.9,en;q=0.8"
    },
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`Amazon store respondió con status ${response.status}`);
  }

  const html = await response.text();

  if (normalizeText(html).includes("captcha") || normalizeText(html).includes("introduce los caracteres")) {
    throw new Error("Amazon store devolvió captcha");
  }

  const parsed = parseStoreLinks(html, baseUrl);
  const filtered = filterStoreItems(parsed).slice(0, limit);

  return filtered.map((item) => {
    const productType = classifyProduct(item.title);
    const setName = inferSetName(item.title);
    const price = item.price as number;
    const pricePerPack = inferPricePerPack(item.title, price, productType);

    return {
      title: item.title,
      source: "Amazon Oficial",
      productType,
      setName,
      price,
      pricePerPack,
      score: inferScore(pricePerPack),
      seller: "JCC Pokémon Amazon Store ES",
      status: "Detectado en tienda oficial",
      url: item.url
    };
  });
}
