import { NextResponse } from "next/server";
import type { RefreshResponse } from "@/lib/types";
import { countDealsInDb, getDealsFromDb, getHistoryFromDb, syncDeals } from "@/lib/repository";
import { fetchDummyDeals } from "@/lib/source-dummy";
import { fetchAmazonOfficialStoreDeals } from "@/lib/source-amazon-store";
import { buildDealsEmailHtml, sendNotificationEmail } from "@/lib/email";

async function maybeSendNotification(input: {
  newDealsCount: number;
  changedDealsCount: number;
  sourceUsed: string;
}) {
  const to = process.env.NOTIFY_EMAIL_TO;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!to || !from) return;

  if (input.newDealsCount <= 0 && input.changedDealsCount <= 0) return;

  await sendNotificationEmail({
    to,
    from,
    subject: `Pokemon Deals Radar: ${input.newDealsCount} nuevos, ${input.changedDealsCount} cambios`,
    html: buildDealsEmailHtml({
      newDealsCount: input.newDealsCount,
      changedDealsCount: input.changedDealsCount,
      sourceUsed: input.sourceUsed,
      appUrl: process.env.APP_URL
    })
  });
}

function isAuthorized(request: Request) {
  const secret = process.env.REFRESH_SECRET;
  if (!secret) return true;
  const header = request.headers.get("x-refresh-secret");
  return header === secret;
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    let sourceUsed = "amazon-store";
    let freshDeals = await fetchAmazonOfficialStoreDeals();

    if (!freshDeals.length) {
      sourceUsed = "dummy";
      freshDeals = await fetchDummyDeals();
    }

    const stats = await syncDeals(freshDeals);
    const deals = await getDealsFromDb();
    const history = await getHistoryFromDb(10);

    await maybeSendNotification({
      newDealsCount: stats.newDealsCount,
      changedDealsCount: stats.changedDealsCount,
      sourceUsed
    });

    const response: RefreshResponse = {
      ok: true,
      message: `Refresh completado con ${sourceUsed}`,
      count: deals.length,
      historyCount: history.length,
      sourceUsed,
      newDealsCount: stats.newDealsCount,
      changedDealsCount: stats.changedDealsCount,
      triggeredAt: new Date().toISOString()
    };

    return NextResponse.json(response);
  } catch (error) {
    const existingCount = await countDealsInDb();

    if (existingCount > 0) {
      const deals = await getDealsFromDb();
      const history = await getHistoryFromDb(10);

      const response: RefreshResponse = {
        ok: true,
        message: error instanceof Error ? `Tienda oficial falló, se mantienen los últimos datos reales: ${error.message}` : "Tienda oficial falló, se mantienen los últimos datos reales",
        count: deals.length,
        historyCount: history.length,
        sourceUsed: "kept-existing",
        newDealsCount: 0,
        changedDealsCount: 0,
        triggeredAt: new Date().toISOString()
      };

      return NextResponse.json(response);
    }

    const fallbackDeals = await fetchDummyDeals();
    const stats = await syncDeals(fallbackDeals);
    const deals = await getDealsFromDb();
    const history = await getHistoryFromDb(10);

    const response: RefreshResponse = {
      ok: true,
      message: error instanceof Error ? `Tienda oficial falló, usado fallback dummy: ${error.message}` : "Tienda oficial falló, usado fallback dummy",
      count: deals.length,
      historyCount: history.length,
      sourceUsed: "dummy",
      newDealsCount: stats.newDealsCount,
      changedDealsCount: stats.changedDealsCount,
      triggeredAt: new Date().toISOString()
    };

    return NextResponse.json(response);
  }
}
