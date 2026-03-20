import { pool } from "./db";
import type { Deal, PriceHistoryItem } from "./types";
import { seedDeals } from "./seed";

type InputDeal = Omit<Deal, "id" | "createdAt" | "updatedAt">;

export async function ensureSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS deals (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL UNIQUE,
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

  await pool.query(`
    CREATE TABLE IF NOT EXISTS price_history (
      id SERIAL PRIMARY KEY,
      deal_id INTEGER NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
      price NUMERIC(10,2) NOT NULL,
      price_per_pack NUMERIC(10,2) NOT NULL,
      observed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
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

export async function getHistoryFromDb(limit = 50): Promise<PriceHistoryItem[]> {
  const result = await pool.query(
    `
    SELECT
      ph.id,
      ph.deal_id AS "dealId",
      d.title,
      ph.price::float AS price,
      ph.price_per_pack::float AS "pricePerPack",
      ph.observed_at AS "observedAt"
    FROM price_history ph
    INNER JOIN deals d ON d.id = ph.deal_id
    ORDER BY ph.observed_at DESC, ph.id DESC
    LIMIT $1
    `,
    [limit]
  );

  return result.rows as PriceHistoryItem[];
}

async function insertHistoryRow(dealId: number, price: number, pricePerPack: number) {
  await pool.query(
    `
    INSERT INTO price_history (deal_id, price, price_per_pack)
    VALUES ($1, $2, $3)
    `,
    [dealId, price, pricePerPack]
  );
}

async function upsertDeal(input: InputDeal) {
  const existing = await pool.query(
    `SELECT id, price::float AS price, price_per_pack::float AS "pricePerPack" FROM deals WHERE title = $1`,
    [input.title]
  );

  if (existing.rowCount && existing.rows[0]) {
    const row = existing.rows[0];
    await pool.query(
      `
      UPDATE deals
      SET
        source = $2,
        product_type = $3,
        set_name = $4,
        price = $5,
        price_per_pack = $6,
        score = $7,
        seller = $8,
        status = $9,
        url = $10,
        updated_at = NOW()
      WHERE id = $1
      `,
      [
        row.id,
        input.source,
        input.productType,
        input.setName,
        input.price,
        input.pricePerPack,
        input.score,
        input.seller,
        input.status,
        input.url
      ]
    );

    if (Number(row.price) !== input.price || Number(row.pricePerPack) !== input.pricePerPack) {
      await insertHistoryRow(row.id, input.price, input.pricePerPack);
    }

    return row.id as number;
  }

  const inserted = await pool.query(
    `
    INSERT INTO deals
    (title, source, product_type, set_name, price, price_per_pack, score, seller, status, url)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
    RETURNING id
    `,
    [
      input.title,
      input.source,
      input.productType,
      input.setName,
      input.price,
      input.pricePerPack,
      input.score,
      input.seller,
      input.status,
      input.url
    ]
  );

  const dealId = inserted.rows[0].id as number;
  await insertHistoryRow(dealId, input.price, input.pricePerPack);
  return dealId;
}

export async function syncDeals(inputs: InputDeal[]) {
  await ensureSchema();
  for (const input of inputs) {
    await upsertDeal(input);
  }
}

export async function seedIfEmpty() {
  await ensureSchema();
  const countResult = await pool.query("SELECT COUNT(*)::int AS count FROM deals");
  const count = countResult.rows[0]?.count ?? 0;

  if (count === 0) {
    await syncDeals(seedDeals);
  }
}
