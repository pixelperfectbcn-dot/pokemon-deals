import { NextResponse } from "next/server";
import type { DealsResponse } from "@/lib/types";
import { getDealsFromDb, seedIfEmpty } from "@/lib/repository";

export async function GET() {
  try {
    await seedIfEmpty();
    const deals = await getDealsFromDb();

    const response: DealsResponse = {
      ok: true,
      count: deals.length,
      updatedAt: new Date().toISOString(),
      deals
    };

    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        count: 0,
        updatedAt: new Date().toISOString(),
        deals: [],
        error: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
