import { NextResponse } from 'next/server';
import type { RedditPostsResponse } from '@/lib/types';
import { fetchRedditPostsByCategory } from '@/lib/source-reddit';
export async function GET(request: Request) { try { const url = new URL(request.url); const category = url.searchParams.get('category') ?? undefined; const result = await fetchRedditPostsByCategory(category); const response: RedditPostsResponse = { ok:true, category:result.category, subreddits:result.subreddits, count:result.items.length, items:result.items }; return NextResponse.json(response); } catch (error) { return NextResponse.json({ ok:false, category:'', subreddits:[], count:0, items:[], error:error instanceof Error ? error.message : 'Unknown error' }, { status:500 }); } }
