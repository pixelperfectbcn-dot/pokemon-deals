import { chromium } from "playwright";
import type { Deal } from "./types";
import { normalizeText, parsePriceFromText, stripHtml } from "./text";

type ParsedItem = {
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
  let score = 72;
  if (pricePerPack <= 3.7) score += 25;
  else if (pricePerPack <= 4.5) score += 18;
  else if (pricePerPack <= 5.5) score += 10;
  return Math.min(99, score + 6);
}

function absoluteUrl(url: string, baseUrl: string) {
  if (url.startsWith("http")) return url;
  if (url.startsWith("/")) return `${baseUrl}${url}`;
  return `${baseUrl}/${url}`;
}

function cleanText(value: string | null | undefined) {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function unescapeJsonText(value: string) {
  return value
    .replace(/\\"/g, '"')
    .replace(/\\u0026/g, "&")
    .replace(/\\u003d/g, "=")
    .replace(/\\u002F/g, "/")
    .replace(/\\\\/g, "\\");
}

function parseAmountFromBlock(block: string): number | undefined {
  const offscreen = block.match(/<span class="a-offscreen">([^<]+)<\/span>/i);
  if (offscreen) return parsePriceFromText(offscreen[1]);

  const amount = block.match(/"amount"\s*:\s*(\d+(?:\.\d+)?)/i);
  if (amount) return Number(amount[1]);

  const displayString = block.match(/"displayString"\s*:\s*"([^"]+)"/i);
  if (displayString) return parsePriceFromText(displayString[1]);

  return undefined;
}

function parseItemsFromHtml(html: string, baseUrl: string): ParsedItem[] {
  const items: ParsedItem[] = [];
  const seen = new Set<string>();

  const asinRegex = /data-asin="([A-Z0-9]{10})"|"data-asin"\s*:\s*"([A-Z0-9]{10})"|\/dp\/([A-Z0-9]{10})/g;
  const asinMatches = [...html.matchAll(asinRegex)];

  for (const raw of asinMatches) {
    const asin = raw[1] || raw[2] || raw[3];
    if (!asin || seen.has(asin)) continue;

    const index = raw.index ?? 0;
    const block = html.slice(Math.max(0, index - 5000), Math.min(html.length, index + 20000));

    const titleMatch =
      block.match(/<h2[^>]*>[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>[\s\S]*?<\/h2>/i) ||
      block.match(/aria-label="([^"]+)"/i) ||
      block.match(/"title"\s*:\s*"([^"]+)"/i);

    const hrefMatch =
      block.match(new RegExp(`href="([^"]*\\/dp\\/${asin}[^"]*)"`, "i")) ||
      block.match(new RegExp(`"(\\/[^"]*\\/dp\\/${asin}[^"]*)"`, "i"));

    const title = titleMatch ? cleanText(stripHtml(unescapeJsonText(titleMatch[1]))) : "";
    const price = parseAmountFromBlock(block);
    const url = hrefMatch ? absoluteUrl(unescapeJsonText(hrefMatch[1]), baseUrl) : absoluteUrl(`/dp/${asin}`, baseUrl);

    if (!title || typeof price !== "number" || price <= 0) continue;

    items.push({ asin, title, url, price });
    seen.add(asin);
  }

  return items;
}

async function autoScroll(page: any) {
  await page.evaluate(async () => {
    await new Promise<void>((resolve) => {
      let steps = 0;
      const timer = setInterval(() => {
        window.scrollBy(0, window.innerHeight);
        steps += 1;
        if (steps >= 8) {
          clearInterval(timer);
          resolve();
        }
      }, 500);
    });
  });
}

async function collectHtmlWithPlaywright(storeUrl: string): Promise<string[]> {
  const browser = await chromium.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-blink-features=AutomationControlled"
    ]
  });

  try {
    const context = await browser.newContext({
      locale: "es-ES",
      viewport: { width: 1440, height: 2200 },
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
    });

    const page = await context.newPage();

    await page.route("**/*", async (route) => {
      const type = route.request().resourceType();
      if (["image", "font", "media"].includes(type)) {
        await route.abort();
        return;
      }
      await route.continue();
    });

    await page.goto(storeUrl, { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.waitForTimeout(6000);
    await autoScroll(page);
    await page.waitForTimeout(4000);

    const title = await page.title();
    if (normalizeText(title).includes("captcha")) {
      throw new Error("Amazon mostró captcha en Playwright");
    }

    const htmls: string[] = [];
    const mainHtml = await page.content();
    htmls.push(mainHtml);

    for (const frame of page.frames()) {
      try {
        const content = await frame.content();
        if (content && content.length > 1000) htmls.push(content);
      } catch {}
    }

    console.log("PLAYWRIGHT HTML COUNT:", htmls.length);
    console.log("PLAYWRIGHT HTML LENGTHS:", htmls.map((v) => v.length).join(","));

    return htmls;
  } finally {
    await browser.close();
  }
}

export async function fetchAmazonOfficialStoreDeals(): Promise<Omit<Deal, "id" | "createdAt" | "updatedAt">[]> {
  const enabled = (process.env.AMAZON_STORE_ENABLED ?? "true").toLowerCase() !== "false";
  if (!enabled) return [];

  const storeUrl = process.env.AMAZON_STORE_URL;
  const baseUrl = process.env.AMAZON_BASE_URL ?? "https://www.amazon.es";
  const limit = Number(process.env.AMAZON_STORE_RESULT_LIMIT ?? "24");
  const requirePokemon = (process.env.AMAZON_REQUIRE_POKEMON ?? "false").toLowerCase() !== "false";
  const allowedTypes = (process.env.AMAZON_ALLOWED_PRODUCT_TYPES ?? "ETB,Booster Box,Booster Bundle,Booster Pack,Other")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);

  if (!storeUrl) {
    throw new Error("AMAZON_STORE_URL no está configurada");
  }

  const htmls = await collectHtmlWithPlaywright(storeUrl);

  const merged = new Map<string, ParsedItem>();
  for (const html of htmls) {
    const parsed = parseItemsFromHtml(html, baseUrl);
    for (const item of parsed) {
      if (!merged.has(item.asin)) merged.set(item.asin, item);
    }
  }

  const rawItems = [...merged.values()];
  console.log("PLAYWRIGHT PARSED ITEMS:", rawItems.length);
  console.log("PLAYWRIGHT PARSED SAMPLE:", JSON.stringify(rawItems.slice(0, 5)));

  const filtered = rawItems
    .filter((item) => typeof item.price === "number" && item.price > 0)
    .filter((item) => {
      const normalized = normalizeText(item.title);
      if (!requirePokemon) return true;
      return (
        normalized.includes("pokemon") ||
        normalized.includes("pokémon") ||
        normalized.includes("jcc pokemon") ||
        normalized.includes("pokemon tcg")
      );
    })
    .filter((item) => {
      const productType = classifyProduct(item.title);
      return allowedTypes.includes(productType);
    })
    .slice(0, limit);

  if (!filtered.length) {
    throw new Error("Playwright no encontró productos válidos con precio en la tienda oficial");
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
      status: "Detectado con Playwright",
      url: item.url
    };
  });
}
