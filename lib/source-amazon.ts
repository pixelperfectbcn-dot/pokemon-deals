import type { AmazonScrapeItem, Deal } from "./types";
import { normalizeText, parsePriceFromText, stripHtml } from "./text";

function classifyProduct(title: string) {
  const t = normalizeText(title);
  if (t.includes("elite trainer box") || t.includes(" etb")) return "ETB";
  if (t.includes("booster box") || t.includes("display")) return "Booster Box";
  if (t.includes("booster bundle")) return "Booster Bundle";
  return "Booster Pack";
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
  let score = 68;
  if (pricePerPack <= 3.7) score += 25;
  else if (pricePerPack <= 4.5) score += 18;
  else if (pricePerPack <= 5.5) score += 10;
  return Math.min(99, score + 5);
}

function extractAsinUrl(url: string, baseUrl: string) {
  if (url.startsWith("http")) return url;
  if (url.startsWith("/")) return `${baseUrl}${url}`;
  return `${baseUrl}/${url}`;
}

function parseAmazonBlocks(html: string, baseUrl: string): AmazonScrapeItem[] {
  const blocks = html.match(/<div[^>]+data-component-type="s-search-result"[\s\S]*?<\/div>\s*<\/div>/g) ?? [];
  const items: AmazonScrapeItem[] = [];

  for (const block of blocks) {
    const titleMatch =
      block.match(/<h2[^>]*>[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>[\s\S]*?<\/h2>/i) ||
      block.match(/aria-label="([^"]+)"/i);

    const hrefMatch = block.match(/<a[^>]+class="[^"]*a-link-normal[^"]*"[^>]+href="([^"]+)"/i);
    const priceMatch =
      block.match(/<span class="a-price-whole">([^<]+)<\/span>[\s\S]*?<span class="a-price-fraction">([^<]+)<\/span>/i) ||
      block.match(/<span[^>]*class="[^"]*a-offscreen[^"]*"[^>]*>([^<]+)<\/span>/i);

    const title = titleMatch ? stripHtml(titleMatch[1]) : "";
    const href = hrefMatch ? hrefMatch[1] : "";
    let price: number | undefined;

    if (priceMatch) {
      if (priceMatch.length >= 3 && priceMatch[2]) {
        price = Number(`${priceMatch[1].replace(/\./g, "").trim()}.${priceMatch[2].trim()}`);
      } else {
        price = parsePriceFromText(priceMatch[1]);
      }
    }

    if (!title || !href) continue;
    if (!normalizeText(title).includes("pokemon")) continue;

    items.push({
      title,
      url: extractAsinUrl(href, baseUrl),
      price
    });
  }

  const deduped = new Map<string, AmazonScrapeItem>();
  for (const item of items) {
    if (!deduped.has(item.title)) deduped.set(item.title, item);
  }

  return [...deduped.values()];
}

async function fetchSearchResults(term: string, baseUrl: string): Promise<AmazonScrapeItem[]> {
  const url = `${baseUrl}/s?k=${encodeURIComponent(term)}`;

  const response = await fetch(url, {
    headers: {
      "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      "accept-language": "es-ES,es;q=0.9,en;q=0.8"
    },
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`Amazon respondió con status ${response.status}`);
  }

  const html = await response.text();

  if (normalizeText(html).includes("captcha") || normalizeText(html).includes("introduce los caracteres")) {
    throw new Error("Amazon devolvió captcha");
  }

  return parseAmazonBlocks(html, baseUrl);
}

export async function fetchAmazonDeals(): Promise<Omit<Deal, "id" | "createdAt" | "updatedAt">[]> {
  const enabled = (process.env.AMAZON_SCRAPE_ENABLED ?? "true").toLowerCase() !== "false";
  if (!enabled) return [];

  const baseUrl = process.env.AMAZON_BASE_URL ?? "https://www.amazon.es";
  const terms = (process.env.AMAZON_SEARCH_TERMS ??
    "pokemon booster bundle,pokemon elite trainer box,pokemon booster box,pokemon 151,pokemon tcg sobres")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);

  const limit = Number(process.env.AMAZON_RESULT_LIMIT ?? "10");
  const collected: AmazonScrapeItem[] = [];

  for (const term of terms) {
    const items = await fetchSearchResults(term, baseUrl);
    collected.push(...items);
  }

  const deduped = new Map<string, AmazonScrapeItem>();
  for (const item of collected) {
    if (item.price && item.price > 0 && !deduped.has(item.title)) {
      deduped.set(item.title, item);
    }
  }

  return [...deduped.values()].slice(0, limit).map((item) => {
    const productType = classifyProduct(item.title);
    const setName = inferSetName(item.title);
    const price = item.price as number;
    const pricePerPack = inferPricePerPack(item.title, price, productType);

    return {
      title: item.title,
      source: "Amazon",
      productType,
      setName,
      price,
      pricePerPack,
      score: inferScore(pricePerPack),
      seller: "Amazon",
      status: "Detectado en Amazon",
      url: item.url
    };
  });
}
