# Pokemon Deals Radar - Phase 8 Amazon Official Store

Incluye:
- PostgreSQL
- deals + price_history
- refresh con scraping de la tienda oficial de Pokémon en Amazon España
- filtros estrictos por tipo y precio
- fallback dummy automático
- UI completa con pestaña de histórico

## Qué hacer
1. Reemplaza TODO el repo con este contenido.
2. En Railway, añade o revisa estas variables:
   - AMAZON_STORE_URL
   - AMAZON_BASE_URL
   - AMAZON_STORE_RESULT_LIMIT
   - AMAZON_STORE_ENABLED
   - AMAZON_ALLOWED_PRODUCT_TYPES
   - AMAZON_REQUIRE_POKEMON
3. Redeploy.
4. Comprueba:
   - /api/health
   - /api/deals
   - /api/history
5. En la home, pulsa "Actualizar tienda oficial".

## Nota
El scraping directo puede fallar si Amazon cambia el HTML o devuelve captcha/503.
El sistema hace fallback dummy si falla.
