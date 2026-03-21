import { Pool } from "pg";

declare global {
  // eslint-disable-next-line no-var
  var __pokemonDealsPool: Pool | undefined;
}

function createPool() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL no está configurada");
  }

  if (!global.__pokemonDealsPool) {
    global.__pokemonDealsPool = new Pool({ connectionString });
  }

  return global.__pokemonDealsPool;
}

export function getPool() {
  return createPool();
}

// Wrapper lazy para evitar que Next intente conectar a la DB durante el build
export const pool = {
  query: async (...args: Parameters<Pool["query"]>) => {
    return createPool().query(...args);
  }
};
