import { NextResponse } from "next/server";
import { getDeals } from "@/lib/deals";
import type { DealsResponse } from "@/lib/types";

export async function GET() {
  const deals = getDeals();

  const response: DealsResponse = {
    ok: true,
    count: deals.length,
    updatedAt: new Date().toISOString(),
    deals
  };

  return NextResponse.json(response);
}
