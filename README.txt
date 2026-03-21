Añade estos archivos en la raíz del repo:
- Dockerfile
- .dockerignore

Luego:
1. commit + push
2. redeploy del servicio web en Railway
3. Railway detectará el Dockerfile y construirá con Docker
4. prueba otra vez el refresh

No hace falta tocar el cron.
