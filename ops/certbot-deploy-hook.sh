#!/bin/bash
# Deploy hook de Certbot — recarga nginx dentro del contenedor tras cada renovación.
#
# Necesario porque los certificados se montan como volumen read-only desde el host:
# certbot renueva los archivos, pero nginx solo los relee al arrancar o al recibir
# la señal de reload. Sin este hook el certificado nuevo no se sirve hasta el
# siguiente deploy.
#
# Se instala en /etc/letsencrypt/renewal-hooks/deploy/ (ver setup-ssl-autorenew.sh).
# Certbot lo ejecuta solo cuando un certificado se renovó de verdad, y expone
# RENEWED_LINEAGE y RENEWED_DOMAINS.

set -euo pipefail

CONTAINER="aiattendance-frontend"

if ! command -v docker >/dev/null 2>&1; then
  echo "[certbot-hook] docker no disponible — se omite el reload" >&2
  exit 0
fi

if ! docker ps --format '{{.Names}}' | grep -qx "$CONTAINER"; then
  echo "[certbot-hook] el contenedor $CONTAINER no está corriendo — se omite el reload" >&2
  exit 0
fi

# Valida la config antes de recargar: si el certificado quedó corrupto, es mejor
# seguir sirviendo el anterior que dejar nginx caído.
if ! docker exec "$CONTAINER" nginx -t >/dev/null 2>&1; then
  echo "[certbot-hook] ERROR: 'nginx -t' falló en $CONTAINER — no se recarga" >&2
  docker exec "$CONTAINER" nginx -t >&2 || true
  exit 1
fi

docker exec "$CONTAINER" nginx -s reload
echo "[certbot-hook] nginx recargado en $CONTAINER — dominios: ${RENEWED_DOMAINS:-desconocidos}"
