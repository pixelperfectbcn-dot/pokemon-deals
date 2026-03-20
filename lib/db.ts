import { Pool } from "pg";

declare global {
  // eslint-disable-next-line no-var
  var __pokemonDealsPool: Pool | undefined;
}

function getPool() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL no está configurada");
  }

  if (!global.__pokemonDealsPool) {
    global.__pokemonDealsPool = new Pool({ connectionString });
  }

  return global.__pokemonDealsPool;
}

export const pool = getPool();
