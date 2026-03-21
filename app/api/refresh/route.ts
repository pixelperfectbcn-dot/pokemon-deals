import { NextResponse } from "next/server";
import type { RefreshResponse } from "@/lib/types";
import { syncDeals, getDealsFromDb, getHistoryFromDb } from "@/lib/repository";
import { fetchDummyDeals } from "@/lib/source-dummy";
import { fetchAmazonOfficialStoreDeals } from "@/lib/source-amazon-store";

export async function POST() {
  try {
    let sourceUsed = "amazon-store";
    let freshDeals = await fetchAmazonOfficialStoreDeals();

    if (!freshDeals.length) {
      sourceUsed = "dummy";
      freshDeals = await fetchDummyDeals();
    }

    await syncDeals(freshDeals);

    const deals = await getDealsFromDb();
    const history = await getHistoryFromDb(10);

    const response: RefreshResponse = {
      ok: true,
      message: `Refresh completado con ${sourceUsed}`,
      count: deals.length,
      historyCount: history.length,
      sourceUsed,
      triggeredAt: new Date().toISOString()
    };

    return NextResponse.json(response);
  } catch (error) {
    const fallbackDeals = await fetchDummyDeals();
    await syncDeals(fallbackDeals);

    const deals = await getDealsFromDb();
    const history = await getHistoryFromDb(10);

    const response: RefreshResponse = {
      ok: true,
      message: error instanceof Error ? `Tienda oficial falló, usado fallback dummy: ${error.message}` : "Tienda oficial falló, usado fallback dummy",
      count: deals.length,
      historyCount: history.length,
      sourceUsed: "dummy",
      triggeredAt: new Date().toISOString()
    };

    return NextResponse.json(response);
  }
}
