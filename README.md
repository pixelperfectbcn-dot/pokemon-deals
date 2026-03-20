# Pokemon Deals Radar v2

Versión con frontend + backend básico dentro de Next.js.

## Qué incluye
- Frontend conectado a API interna
- `GET /api/deals`
- `GET /api/health`
- `POST /api/refresh` (stub para la siguiente fase)
- Datos mock centralizados en `lib/deals.ts`

## Ejecutar en local

```bash
npm install
npm run dev
```

## Endpoints
- `GET /api/health`
- `GET /api/deals`
- `POST /api/refresh`

## Deploy en Railway
- Sube este proyecto a GitHub
- En Railway: New Project -> Deploy from GitHub repo
- Si hace falta, configura:
  - Build Command: `npm run build`
  - Start Command: `npm run start`

## Siguiente fase recomendada
1. Añadir PostgreSQL
2. Persistir deals e histórico
3. Añadir worker/scraper
4. Reemplazar los mocks por datos reales
