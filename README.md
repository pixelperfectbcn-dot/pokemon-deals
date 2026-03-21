# Pokemon Deals Radar - Phase 7 Amazon Scrape

Incluye:
- PostgreSQL
- deals + price_history
- refresh con scraping directo de Amazon
- fallback dummy automático
- UI completa con pestaña de histórico

## Qué hacer
1. Reemplaza TODO el repo con este contenido.
2. Redeploy en Railway.
3. Comprueba:
   - /api/health
   - /api/deals
   - /api/history
4. En la home, pulsa "Actualizar Amazon".

## Variables opcionales
- AMAZON_BASE_URL
- AMAZON_SEARCH_TERMS
- AMAZON_RESULT_LIMIT
- AMAZON_SCRAPE_ENABLED

## Nota
El scraping directo de Amazon puede dejar de funcionar si Amazon devuelve captcha, HTML distinto o bloquea la IP.
El sistema hace fallback dummy si falla.
