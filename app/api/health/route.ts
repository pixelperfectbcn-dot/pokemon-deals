import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function GET() {
  try {
    const dbResult = await pool.query("SELECT NOW() AS now");

    return NextResponse.json({
      ok: true,
      service: "pokemon-deals-api",
      status: "healthy",
      database: "connected",
      timestamp: new Date().toISOString(),
      dbTime: dbResult.rows[0]?.now ?? null
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        service: "pokemon-deals-api",
        status: "degraded",
        database: "disconnected",
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
