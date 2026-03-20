# Pokemon Deals Radar - Phase 3

Versión con PostgreSQL en Railway.

## Incluye
- Frontend Next.js
- API interna
- PostgreSQL via `DATABASE_URL`
- Endpoints:
  - GET /api/health
  - GET /api/deals
  - POST /api/init
  - POST /api/refresh

## Flujo en Railway
1. Sube este proyecto al repo.
2. Redeploy del servicio web.
3. Añade un servicio PostgreSQL en Railway.
4. En el servicio web, crea la variable `DATABASE_URL` apuntando al Postgres de Railway.
5. Cuando el deploy esté listo, ejecuta:
   - POST /api/init
6. Comprueba:
   - /api/health
   - /api/deals

## Local
```bash
npm install
npm run dev
```
