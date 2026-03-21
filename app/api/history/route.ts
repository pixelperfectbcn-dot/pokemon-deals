import { NextResponse } from 'next/server';
import type { HistoryResponse } from '@/lib/types';
import { getHistoryFromDb, seedIfEmpty } from '@/lib/repository';
export async function GET() { try { await seedIfEmpty(); const items = await getHistoryFromDb(50); const response: HistoryResponse = { ok:true, count:items.length, items }; return NextResponse.json(response); } catch (error) { return NextResponse.json({ ok:false, count:0, items:[], error:error instanceof Error ? error.message : 'Unknown error' }, { status:500 }); } }
