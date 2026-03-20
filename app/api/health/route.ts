import { NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function GET() {
  try {
    await pool.query("SELECT 1");
    return NextResponse.json({ ok: true, database: "connected" });
  } catch (e:any) {
    return NextResponse.json({ ok: false, database: "disconnected", error: e.message });
  }
}