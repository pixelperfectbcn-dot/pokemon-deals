console.log("AMAZON PARSER V2 LOADED");
import type { Deal } from "./types";
import { normalizeText, parsePriceFromText, stripHtml } from "./text";

type ParsedStoreItem = {
  asin: string;
  title: string;
  url: string;
  price?: number;
};

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
    "Twilight Masquerade",
    "Journey Together",
    "Evoluciones Prismáticas"
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

function unescapeJsonText(value: string) {
  return value
    .replace(/\\\"/g, '"')
    .replace(/\\u0026/g, "&")
    .replace(/\\u003d/g, "=")
    .replace(/\\u002F/g, "/")
    .replace(/\\\\/g, "\\");
}

function parseAmountFromMoneyJson(block: string): number | undefined {
  const amountMatch = block.match(/\"amount\"\s*:\s*(\d+(?:\.\d+)?)/);
  if (amountMatch) return Number(amountMatch[1]);

  const displayStringMatch = block.match(/\"displayString\"\s*:\s*\"([^\"]+)\"/);
  if (displayStringMatch) return parsePriceFromText(displayStringMatch[1]);

  return undefined;
}

function parseStoreItems(html: string, baseUrl: string): ParsedStoreItem[] {
  const items: ParsedStoreItem[] = [];
  const seenAsins = new Set<string>();

  const cardRegex = /<div[^>]+data-asin="([A-Z0-9]{10})"[\s\S]*?(?=<div[^>]+data-asin=|$)/gi;

  let match: RegExpExecArray | null = null;
  while ((match = cardRegex.exec(html)) !== null) {
    const asin = match[1];
    const block = match[0];
    if (seenAsins.has(asin)) continue;

    const titleMatch =
      block.match(/<h2[^>]*>[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>[\s\S]*?<\/h2>/i) ||
      block.match(/aria-label="([^"]+)"/i) ||
      block.match(/\"title\"\s*:\s*\"([^\"]+)\"/i);

    const hrefMatch =
      block.match(new RegExp(`<a[^>]+href="([^"]*\\/dp\\/${asin}[^"]*)"`, "i")) ||
      block.match(/<a[^>]+class="[^"]*(?:a-link-normal|s-no-outline)[^"]*"[^>]+href="([^"]+)"/i);

    const priceOffscreenMatch = block.match(/<span class="a-offscreen">([^<]+)<\/span>/i);
    const price = priceOffscreenMatch
      ? parsePriceFromText(priceOffscreenMatch[1])
      : parseAmountFromMoneyJson(block);

    const title = titleMatch ? stripHtml(unescapeJsonText(titleMatch[1])) : "";
    const href = hrefMatch ? unescapeJsonText(hrefMatch[1]) : `/dp/${asin}`;

    if (!title) continue;

    items.push({
      asin,
      title,
      url: absoluteUrl(href, baseUrl),
      price
    });
    seenAsins.add(asin);
  }

  if (items.length === 0) {
    const asinMatches = [...html.matchAll(/\"data-asin\"\s*:\s*\"([A-Z0-9]{10})\"|data-asin="([A-Z0-9]{10})"/g)];
    for (const raw of asinMatches) {
      const asin = raw[1] || raw[2];
      if (!asin || seenAsins.has(asin)) continue;

      const index = raw.index ?? 0;
      const context = html.slice(Math.max(0, index - 5000), Math.min(html.length, index + 15000));

      const titleMatch =
        context.match(/\"title\"\s*:\s*\"([^\"]+)\"/i) ||
        context.match(/aria-label="([^"]+)"/i);

      const displayPriceMatch = context.match(/\"displayString\"\s*:\s*\"([^\"]+)\"/i);
      const amountMatch = context.match(/\"amount\"\s*:\s*(\d+(?:\.\d+)?)/i);
      const hrefMatch =
        context.match(new RegExp(`\"(\\/[^\"]*\\/dp\\/${asin}[^\"]*)\"`, "i")) ||
        context.match(new RegExp(`<a[^>]+href="([^"]*\\/dp\\/${asin}[^"]*)"`, "i"));

      const title = titleMatch ? stripHtml(unescapeJsonText(titleMatch[1])) : "";
      const price = amountMatch
        ? Number(amountMatch[1])
        : displayPriceMatch
          ? parsePriceFromText(displayPriceMatch[1])
          : undefined;

      if (!title) continue;

      items.push({
        asin,
        title,
        url: absoluteUrl(hrefMatch ? unescapeJsonText(hrefMatch[1]) : `/dp/${asin}`, baseUrl),
        price
      });
      seenAsins.add(asin);
    }
  }

  return items;
}

function filterStoreItems(items: ParsedStoreItem[]) {
  const requirePokemon = (process.env.AMAZON_REQUIRE_POKEMON ?? "true").toLowerCase() !== "false";
  const allowedTypes = (process.env.AMAZON_ALLOWED_PRODUCT_TYPES ?? "ETB,Booster Box,Booster Bundle,Booster Pack,Other")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);

  const filtered = items.filter((item) => {
    const title = normalizeText(item.title);
    const isPokemon =
      !requirePokemon ||
      title.includes("pokemon") ||
      title.includes("pokémon") ||
      title.includes("jcc pokemon") ||
      title.includes("pokemon tcg");
    const hasPrice = typeof item.price === "number" && item.price > 0;
    const productType = classifyProduct(item.title);
    return isPokemon && hasPrice && allowedTypes.includes(productType);
  });

  const deduped = new Map<string, ParsedStoreItem>();
  for (const item of filtered) {
    const key = [
      item.asin || "",
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
  console.log("HTML LENGTH:", html.length);
  console.log("HTML PREVIEW:", html.slice(0, 1000));

  if (normalizeText(html).includes("captcha") || normalizeText(html).includes("introduce los caracteres")) {
    throw new Error("Amazon store devolvió captcha");
  }

  const parsed = parseStoreItems(html, baseUrl);
  const filtered = filterStoreItems(parsed).slice(0, limit);

  if (!filtered.length) {
    throw new Error("Amazon store no devolvió productos parseables con precio");
  }

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
