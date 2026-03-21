Reemplaza en tu repo estos archivos:
- package.json
- lib/source-amazon-store.ts

Luego haz redeploy del servicio web.

Variables recomendadas:
AMAZON_STORE_URL=https://www.amazon.es/stores/page/70E78EA6-79CB-4678-9249-717F2A13EB77
AMAZON_BASE_URL=https://www.amazon.es
AMAZON_STORE_RESULT_LIMIT=24
AMAZON_STORE_ENABLED=true
AMAZON_ALLOWED_PRODUCT_TYPES=ETB,Booster Box,Booster Bundle,Booster Pack,Other
AMAZON_REQUIRE_POKEMON=false

Si el build falla por instalación del navegador, te preparo la versión Docker en el siguiente paso.
