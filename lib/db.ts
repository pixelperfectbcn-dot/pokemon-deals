import { Pool } from "pg";

declare global {
  // eslint-disable-next-line no-var
  var __pokemonDealsPool: Pool | undefined;
}

function createPool(): Pool {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL no está configurada");
  }

  if (!global.__pokemonDealsPool) {
    global.__pokemonDealsPool = new Pool({ connectionString });
  }

  return global.__pokemonDealsPool;
}

export function getPool(): Pool {
  return createPool();
}

// Wrapper lazy compatible con todas las llamadas existentes a pool.query(...)
export const pool = {
  query: async (...args: any[]) => {
    const realPool = createPool();
    return (realPool.query as any)(...args);
  }
};
