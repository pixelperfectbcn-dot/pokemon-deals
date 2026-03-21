import { NextResponse } from 'next/server';
import type { RedditCategoriesResponse } from '@/lib/types';
import { getConfiguredRedditCategories } from '@/lib/source-reddit';
export async function GET() { const { categories, defaultCategory } = getConfiguredRedditCategories(); const response: RedditCategoriesResponse = { ok:true, defaultCategory, categories }; return NextResponse.json(response); }
