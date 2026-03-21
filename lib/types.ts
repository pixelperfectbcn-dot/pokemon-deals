export type Deal = { id: number; title: string; source: string; productType: string; setName: string; price: number; pricePerPack: number; score: number; seller: string; status: string; url: string; createdAt?: string; updatedAt?: string; };
export type PriceHistoryItem = { id: number; dealId: number; title: string; price: number; pricePerPack: number; observedAt: string; };
export type RedditPost = { id: string; title: string; subreddit: string; permalink: string; url: string; author: string; createdUtc: number; score: number; numComments: number; price?: number; };
export type DealsResponse = { ok: boolean; count: number; updatedAt: string; deals: Deal[]; };
export type HistoryResponse = { ok: boolean; count: number; items: PriceHistoryItem[]; };
export type RefreshResponse = { ok: boolean; message: string; count: number; historyCount: number; sourceUsed: string; triggeredAt: string; };
export type RedditCategoriesResponse = { ok: boolean; defaultCategory: string; categories: Record<string, string[]>; };
export type RedditPostsResponse = { ok: boolean; category: string; subreddits: string[]; count: number; items: RedditPost[]; };
