import type { Deal, RedditPost } from './types';
import { normalizeText, parsePriceFromText } from './text';

type RedditListingChild = { data: { id: string; title: string; subreddit: string; permalink: string; url: string; author: string; created_utc: number; score: number; num_comments: number; }; };

function getRedditCategories() {
  const categories: Record<string, string[]> = {
    deals: (process.env.REDDIT_CATEGORY_DEALS ?? 'PokemonTCGDeals,GameSale,buildapcsales').split(',').map(v => v.trim()).filter(Boolean),
    pokemon: (process.env.REDDIT_CATEGORY_POKEMON ?? 'PokemonTCG,pokemoncards,PokemonTCGDeals').split(',').map(v => v.trim()).filter(Boolean),
    invest: (process.env.REDDIT_CATEGORY_INVEST ?? 'PKMNTCGDeals,pokeinvesting,PokemonTCG').split(',').map(v => v.trim()).filter(Boolean)
  };
  const defaultCategory = process.env.REDDIT_DEFAULT_CATEGORY ?? 'deals';
  return { categories, defaultCategory };
}
export function getConfiguredRedditCategories() { return getRedditCategories(); }

async function getAccessToken() {
  const clientId = process.env.REDDIT_CLIENT_ID;
  const clientSecret = process.env.REDDIT_CLIENT_SECRET;
  const userAgent = process.env.REDDIT_USER_AGENT;
  if (!clientId || !clientSecret || !userAgent) throw new Error('Faltan variables REDDIT_CLIENT_ID, REDDIT_CLIENT_SECRET o REDDIT_USER_AGENT');
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const response = await fetch('https://www.reddit.com/api/v1/access_token', { method:'POST', headers:{ authorization:`Basic ${basic}`, 'content-type':'application/x-www-form-urlencoded', 'user-agent':userAgent }, body:'grant_type=client_credentials', cache:'no-store' });
  if (!response.ok) throw new Error(`Reddit token error: ${response.status}`);
  const data = await response.json();
  if (!data.access_token) throw new Error('Reddit no devolvió access_token');
  return data.access_token as string;
}
function classifyProduct(title: string) { const t = normalizeText(title); if (t.includes('elite trainer box') || t.includes(' etb')) return 'ETB'; if (t.includes('booster box') || t.includes('display')) return 'Booster Box'; if (t.includes('booster bundle')) return 'Booster Bundle'; return 'Booster Pack'; }
function inferSetName(title: string) { const knownSets = ['151','Temporal Forces','Surging Sparks','Paldea Evolved','Paradox Rift','Twilight Masquerade']; const normalized = normalizeText(title); const match = knownSets.find(setName => normalized.includes(normalizeText(setName))); return match ?? 'Mixed'; }
function inferPricePerPack(title: string, price: number, productType: string) { const normalized = normalizeText(title); const packMatch = normalized.match(/(\d+)\s*(sobres|boosters|packs)/); if (packMatch) { const units = Number(packMatch[1]); if (units > 0) return Number((price / units).toFixed(2)); } if (productType === 'ETB') return Number((price / 9).toFixed(2)); if (productType === 'Booster Bundle') return Number((price / 6).toFixed(2)); if (productType === 'Booster Box') return Number((price / 36).toFixed(2)); return price; }
function inferScore(postScore: number, pricePerPack: number) { let score = 65; if (pricePerPack <= 3.7) score += 25; else if (pricePerPack <= 4.5) score += 18; else if (pricePerPack <= 5.5) score += 10; if (postScore >= 100) score += 8; else if (postScore >= 25) score += 4; return Math.min(99, score); }

export async function fetchRedditPostsByCategory(categoryInput?: string): Promise<{ category: string; subreddits: string[]; items: RedditPost[] }> {
  const { categories, defaultCategory } = getRedditCategories();
  const category = categoryInput && categories[categoryInput] ? categoryInput : defaultCategory;
  const subreddits = categories[category] ?? [];
  if (!subreddits.length) return { category, subreddits: [], items: [] };
  const token = await getAccessToken();
  const userAgent = process.env.REDDIT_USER_AGENT as string;
  const multi = subreddits.join('+');
  const response = await fetch(`https://oauth.reddit.com/r/${multi}/new?limit=50`, { headers:{ authorization:`Bearer ${token}`, 'user-agent':userAgent }, cache:'no-store' });
  if (!response.ok) throw new Error(`Reddit listing error: ${response.status}`);
  const data = await response.json();
  const children = (data?.data?.children ?? []) as RedditListingChild[];
  const items: RedditPost[] = children.map((child) => ({ id: child.data.id, title: child.data.title, subreddit: child.data.subreddit, permalink:`https://reddit.com${child.data.permalink}`, url: child.data.url, author: child.data.author, createdUtc: child.data.created_utc, score: child.data.score, numComments: child.data.num_comments, price: parsePriceFromText(child.data.title) })).filter((post) => normalizeText(post.title).includes('pokemon'));
  return { category, subreddits, items };
}

export async function fetchDealsFromRedditCategory(categoryInput?: string): Promise<{ category: string; subreddits: string[]; deals: Omit<Deal, 'id'|'createdAt'|'updatedAt'>[] }> {
  const { category, subreddits, items } = await fetchRedditPostsByCategory(categoryInput);
  const deals = items.filter((post) => typeof post.price === 'number' && post.price > 0).map((post) => {
    const productType = classifyProduct(post.title);
    const setName = inferSetName(post.title);
    const price = post.price as number;
    const pricePerPack = inferPricePerPack(post.title, price, productType);
    return { title: post.title, source: 'Reddit', productType, setName, price, pricePerPack, score: inferScore(post.score, pricePerPack), seller: `r/${post.subreddit}`, status: 'Detectado en Reddit', url: post.url.startsWith('http') ? post.url : post.permalink };
  }).slice(0,10);
  return { category, subreddits, deals };
}
