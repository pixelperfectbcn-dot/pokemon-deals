import { pool } from "./db";
import type { Deal } from "./types";
import { seedDeals } from "./seed";

export async function ensureSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS deals (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      source TEXT NOT NULL,
      product_type TEXT NOT NULL,
      set_name TEXT NOT NULL,
      price NUMERIC(10,2) NOT NULL,
      price_per_pack NUMERIC(10,2) NOT NULL,
      score INTEGER NOT NULL,
      seller TEXT NOT NULL,
      status TEXT NOT NULL,
      url TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

export async function getDealsFromDb(): Promise<Deal[]> {
  const result = await pool.query(`
    SELECT
      id,
      title,
      source,
      product_type AS "productType",
      set_name AS "setName",
      price::float AS price,
      price_per_pack::float AS "pricePerPack",
      score,
      seller,
      status,
      url,
      created_at AS "createdAt",
      updated_at AS "updatedAt"
    FROM deals
    ORDER BY score DESC, updated_at DESC;
  `);

  return result.rows as Deal[];
}

export async function replaceDealsWithSeed() {
  await ensureSchema();

  await pool.query("BEGIN");
  try {
    await pool.query("DELETE FROM deals");

    for (const deal of seedDeals) {
      await pool.query(
        `
        INSERT INTO deals
        (title, source, product_type, set_name, price, price_per_pack, score, seller, status, url)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
        `,
        [
          deal.title,
          deal.source,
          deal.productType,
          deal.setName,
          deal.price,
          deal.pricePerPack,
          deal.score,
          deal.seller,
          deal.status,
          deal.url
        ]
      );
    }

    await pool.query("COMMIT");
  } catch (error) {
    await pool.query("ROLLBACK");
    throw error;
  }
}

export async function seedIfEmpty() {
  await ensureSchema();

  const countResult = await pool.query("SELECT COUNT(*)::int AS count FROM deals");
  const count = countResult.rows[0]?.count ?? 0;

  if (count === 0) {
    await replaceDealsWithSeed();
  }
}
