import { NextResponse } from "next/server";
import { ensureSchema, syncDeals } from "@/lib/repository";
import { seedDeals } from "@/lib/seed";

export async function POST() {
  try {
    await ensureSchema();
    const stats = await syncDeals(seedDeals);

    return NextResponse.json({
      ok: true,
      message: "Base de datos inicializada y seed cargada",
      count: seedDeals.length,
      ...stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: "Error inicializando la base de datos",
        error: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
