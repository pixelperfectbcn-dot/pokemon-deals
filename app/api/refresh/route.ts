import { NextResponse } from "next/server";
import { syncDeals, getDealsFromDb, getHistoryFromDb } from "@/lib/repository";
import { fetchDummyDeals } from "@/lib/source-dummy";

export async function POST() {
  try {
    const freshDeals = await fetchDummyDeals();
    await syncDeals(freshDeals);

    const deals = await getDealsFromDb();
    const history = await getHistoryFromDb(10);

    return NextResponse.json({
      ok: true,
      message: "Fuente actualizada y snapshots guardados en price_history",
      count: deals.length,
      historyCount: history.length,
      triggeredAt: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: "Error refrescando deals",
        error: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
