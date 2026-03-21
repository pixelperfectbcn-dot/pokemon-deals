# Pokemon Deals Radar - Phase 9 Cron + Email

Incluye:
- tienda oficial de Amazon
- PostgreSQL + price_history
- refresh mejorado
- cron hourly vía servicio aparte en Railway
- email solo cuando hay novedades

## Qué hacer
1. Reemplaza TODO el repo con este contenido.
2. En el servicio web añade o revisa:
   - DATABASE_URL
   - APP_URL
   - AMAZON_STORE_URL
   - AMAZON_BASE_URL
   - AMAZON_STORE_RESULT_LIMIT
   - AMAZON_STORE_ENABLED
   - AMAZON_ALLOWED_PRODUCT_TYPES
   - AMAZON_REQUIRE_POKEMON
   - REFRESH_SECRET
3. Para email añade:
   - RESEND_API_KEY
   - RESEND_FROM_EMAIL
   - NOTIFY_EMAIL_TO
4. Crea un segundo servicio en Railway desde este mismo repo para el cron.
5. En ese segundo servicio añade:
   - CRON_REFRESH_URL
   - REFRESH_SECRET
   - RESEND_API_KEY
   - RESEND_FROM_EMAIL
   - NOTIFY_EMAIL_TO
6. En el servicio cron configura:
   - Start Command: npm run cron:refresh
   - Cron Schedule: 0 * * * *
7. En el servicio web prueba POST /api/refresh con header x-refresh-secret o desde la UI.

## Nota
Railway cron jobs ejecutan el start command del servicio y deben terminar al acabar. Los horarios son UTC.
