import { NextResponse } from "next/server";
import { ensureSchema, replaceDealsWithSeed, getDealsFromDb } from "@/lib/repository";

export async function POST() {
  try {
    await ensureSchema();
    await replaceDealsWithSeed();
    const deals = await getDealsFromDb();

    return NextResponse.json({
      ok: true,
      message: "Base de datos inicializada y seed cargada",
      count: deals.length,
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
