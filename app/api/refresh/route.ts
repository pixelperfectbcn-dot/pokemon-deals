import { NextResponse } from "next/server";
import { replaceDealsWithSeed, getDealsFromDb } from "@/lib/repository";

export async function POST() {
  try {
    await replaceDealsWithSeed();
    const deals = await getDealsFromDb();

    return NextResponse.json({
      ok: true,
      message: "Deals refrescados en PostgreSQL",
      count: deals.length,
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
