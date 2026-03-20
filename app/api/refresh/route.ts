import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({
    ok: true,
    message: "Refresh endpoint preparado. En la siguiente fase lo conectaremos al scraper/worker.",
    triggeredAt: new Date().toISOString()
  });
}
