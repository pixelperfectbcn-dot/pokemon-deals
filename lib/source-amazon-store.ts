import { chromium } from "playwright";
import type { Deal } from "./types";
import { normalizeText, parsePriceFromText } from "./text";

type DomItem = {
  asin: string;
  title: string;
  url: string;
  priceText?: string;
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

async function autoScroll(page: any) {
  await page.evaluate(async () => {
    await new Promise<void>((resolve) => {
      let totalHeight = 0;
      const distance = 1000;
      const timer = setInterval(() => {
        const scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;

        if (totalHeight >= scrollHeight * 2) {
          clearInterval(timer);
          resolve();
        }
      }, 400);
    });
  });
}

async function scrapeWithPlaywright(storeUrl: string, baseUrl: string): Promise<DomItem[]> {
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

    // La clave: .a-offscreen suele estar oculto y nunca estará "visible".
    // Esperamos a que existan productos y luego hacemos scroll para cargar más bloques.
    await page.waitForSelector("[data-asin]", { timeout: 30000, state: "attached" });
    await page.waitForTimeout(4000);
    await autoScroll(page);
    await page.waitForTimeout(4000);

    const title = await page.title();
    if (normalizeText(title).includes("captcha")) {
      throw new Error("Amazon mostró captcha en Playwright");
    }

    const rawItems = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll("[data-asin]"));
      return cards.map((card) => {
        const asin = card.getAttribute("data-asin") || "";
        const title =
          (card.querySelector("h2 span")?.textContent ||
            card.querySelector('[aria-label]')?.getAttribute("aria-label") ||
            "") as string;

        const link =
          (card.querySelector('a[href*="/dp/"]')?.getAttribute("href") ||
            card.querySelector("a")?.getAttribute("href") ||
            "") as string;

        const priceText =
          (card.querySelector(".a-offscreen")?.textContent ||
            card.querySelector('[class*="price"] .a-offscreen')?.textContent ||
            "") as string;

        return {
          asin,
          title,
          url: link,
          priceText
        };
      });
    });

    console.log("PLAYWRIGHT RAW ITEMS:", rawItems.length);
    console.log("PLAYWRIGHT RAW SAMPLE:", JSON.stringify(rawItems.slice(0, 5)));

    const filtered = rawItems
      .map((item) => ({
        asin: cleanText(item.asin),
        title: cleanText(item.title),
        url: cleanText(item.url),
        priceText: cleanText(item.priceText)
      }))
      .filter((item) => item.asin && item.title && item.url);

    const deduped = new Map<string, DomItem>();
    for (const item of filtered) {
      if (!deduped.has(item.asin)) {
        deduped.set(item.asin, {
          asin: item.asin,
          title: item.title,
          url: absoluteUrl(item.url, baseUrl),
          priceText: item.priceText
        });
      }
    }

    return [...deduped.values()];
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

  const rawItems = await scrapeWithPlaywright(storeUrl, baseUrl);

  const filtered = rawItems
    .map((item) => {
      const price = item.priceText ? parsePriceFromText(item.priceText) : undefined;
      return { ...item, price };
    })
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
