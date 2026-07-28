#!/bin/bash
# Configura la renovación automática de los certificados Let's Encrypt.
# Se ejecuta UNA SOLA VEZ en el servidor, como root, DESPUÉS de haber desplegado
# el nginx.conf que sirve /.well-known/acme-challenge/ sin redirigir.
#
#   sudo bash ops/setup-ssl-autorenew.sh
#
# Es idempotente: se puede volver a correr sin romper nada.
#
# Qué hace:
#   1. Crea el webroot /var/www/certbot
#   2. Instala el deploy hook que recarga nginx tras cada renovación
#   3. Comprueba que nginx sirve el challenge en :80 SIN redirigir a https
#   4. Migra cada certificado de standalone → webroot (renovación sin downtime)
#   5. Verifica que el timer de certbot esté activo (o instala un cron)
#   6. Corre un dry-run real para confirmar que todo funciona

set -euo pipefail

WEBROOT="/var/www/certbot"
CHALLENGE_DIR="$WEBROOT/.well-known/acme-challenge"
HOOK_DST="/etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh"
HOOK_SRC="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/certbot-deploy-hook.sh"
CONTAINER="aiattendance-frontend"

log()  { echo -e "\n\033[1;34m==>\033[0m $*"; }
ok()   { echo -e "  \033[1;32m✓\033[0m $*"; }
warn() { echo -e "  \033[1;33m!\033[0m $*"; }
die()  { echo -e "\n\033[1;31m✗ $*\033[0m" >&2; exit 1; }

[[ $EUID -eq 0 ]] || die "Este script debe correr como root (usa: sudo bash $0)"
command -v certbot >/dev/null 2>&1 || die "certbot no está instalado en el host"
command -v docker  >/dev/null 2>&1 || die "docker no está instalado en el host"

# ── 0. Estado actual ──────────────────────────────────────────────────────────
# Los certificados suelen estar en fases distintas del ciclo de 90 días: uno
# puede estar vencido y otro vigente aunque ambos tengan la renovación rota.
log "Estado actual de los certificados"
for C in /etc/letsencrypt/live/*/cert.pem; do
  [[ -f "$C" ]] || continue
  NAME="$(basename "$(dirname "$C")")"
  END="$(openssl x509 -in "$C" -noout -enddate | cut -d= -f2)"
  SANS="$(openssl x509 -in "$C" -noout -text \
          | grep -A1 'Subject Alternative Name' | tail -n1 \
          | tr -d ' ' | sed 's/DNS://g')"
  if openssl x509 -in "$C" -noout -checkend 0 >/dev/null 2>&1; then
    DAYS=$(( ( $(date -d "$END" +%s) - $(date +%s) ) / 86400 ))
    ok "$NAME — vigente, expira en $DAYS días ($END) — $SANS"
  else
    warn "$NAME — \033[1;31mVENCIDO\033[0m desde $END — $SANS"
  fi
done

# ── 1. Webroot ────────────────────────────────────────────────────────────────
log "Creando webroot en $WEBROOT"
mkdir -p "$CHALLENGE_DIR"
chmod -R 755 "$WEBROOT"
ok "$CHALLENGE_DIR listo"

# ── 2. Deploy hook ────────────────────────────────────────────────────────────
log "Instalando deploy hook"
[[ -f "$HOOK_SRC" ]] || die "No se encuentra $HOOK_SRC"
mkdir -p "$(dirname "$HOOK_DST")"
install -m 0755 "$HOOK_SRC" "$HOOK_DST"
ok "$HOOK_DST instalado"

# ── 3. Verificar que nginx sirve el challenge sin redirigir ───────────────────
log "Verificando que nginx sirve el challenge en :80"
docker ps --format '{{.Names}}' | grep -qx "$CONTAINER" \
  || die "El contenedor $CONTAINER no está corriendo. Despliega primero (Jenkins) y vuelve a ejecutar."

TOKEN="setup-test-$$-$(date +%s)"
echo "$TOKEN" > "$CHALLENGE_DIR/$TOKEN"
trap 'rm -f "$CHALLENGE_DIR/$TOKEN"' EXIT

CHALLENGE_OK=1
for DOMAIN in tiempoya.net www.tiempoya.net ci.tiempoya.net; do
  CODE=$(curl -4 -sS -o /tmp/acme-test.$$ -w '%{http_code}' --max-time 15 \
         "http://$DOMAIN/.well-known/acme-challenge/$TOKEN" 2>/dev/null || echo "000")
  BODY=$(cat /tmp/acme-test.$$ 2>/dev/null || true); rm -f /tmp/acme-test.$$

  if [[ "$CODE" == "200" && "$BODY" == "$TOKEN" ]]; then
    ok "$DOMAIN → 200 y contenido correcto"
  elif [[ "$CODE" == "301" || "$CODE" == "302" ]]; then
    warn "$DOMAIN → $CODE (redirige a https). El nginx.conf desplegado es el viejo."
    CHALLENGE_OK=0
  else
    warn "$DOMAIN → HTTP $CODE (esperado 200). Revisa DNS/firewall del puerto 80."
    CHALLENGE_OK=0
  fi
done

[[ $CHALLENGE_OK -eq 1 ]] || die "El challenge no se sirve correctamente. Despliega el nginx.conf actualizado y reintenta."

# ── 4. Migrar cada certificado a webroot ──────────────────────────────────────
log "Migrando certificados a autenticación webroot"
shopt -s nullglob
RENEWAL_CONFS=(/etc/letsencrypt/renewal/*.conf)
[[ ${#RENEWAL_CONFS[@]} -gt 0 ]] || die "No hay certificados en /etc/letsencrypt/renewal/"

for CONF in "${RENEWAL_CONFS[@]}"; do
  NAME="$(basename "$CONF" .conf)"
  CERT="/etc/letsencrypt/live/$NAME/cert.pem"
  [[ -f "$CERT" ]] || { warn "$NAME: sin cert.pem, se omite"; continue; }

  # Los dominios se leen del SAN del certificado (funciona aunque esté vencido)
  mapfile -t DOMAINS < <(
    openssl x509 -in "$CERT" -noout -text \
      | grep -A1 'Subject Alternative Name' | tail -n1 \
      | tr -d ' ' | tr ',' '\n' | sed 's/^DNS://' | grep -v '^$'
  )
  [[ ${#DOMAINS[@]} -gt 0 ]] || { warn "$NAME: no se pudieron leer los dominios, se omite"; continue; }

  ARGS=(); for D in "${DOMAINS[@]}"; do ARGS+=(-d "$D"); done
  echo "  → $NAME: ${DOMAINS[*]}"

  # --keep-until-expiring: no consume cuota si el cert sigue vigente, pero
  # reescribe el archivo de renovación con authenticator = webroot.
  certbot certonly \
    --webroot -w "$WEBROOT" \
    --cert-name "$NAME" "${ARGS[@]}" \
    --non-interactive --agree-tos --keep-until-expiring --quiet \
    && ok "$NAME migrado a webroot" \
    || warn "$NAME: certbot devolvió error (revisa /var/log/letsencrypt/letsencrypt.log)"
done

# ── 5. Timer de renovación ────────────────────────────────────────────────────
log "Verificando el disparador automático de renovación"
TIMER_OK=0
for T in certbot.timer snap.certbot.renew.timer; do
  if systemctl list-unit-files 2>/dev/null | grep -q "^$T"; then
    systemctl enable --now "$T" >/dev/null 2>&1 || true
    if systemctl is-active "$T" >/dev/null 2>&1; then
      ok "$T activo"; TIMER_OK=1; break
    fi
  fi
done

if [[ $TIMER_OK -eq 0 ]]; then
  warn "No hay timer de systemd — instalando cron en /etc/cron.d/certbot-renew"
  cat > /etc/cron.d/certbot-renew <<'CRON'
# Renovación automática de certificados Let's Encrypt (2 veces al día).
# Certbot solo renueva si faltan menos de 30 días para expirar.
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/sbin:/bin:/usr/sbin:/usr/bin
17 3,15 * * * root certbot -q renew
CRON
  chmod 0644 /etc/cron.d/certbot-renew
  ok "cron instalado"
fi

# ── 6. Dry-run ────────────────────────────────────────────────────────────────
log "Probando la renovación completa (dry-run, no consume cuota)"
if certbot renew --dry-run; then
  echo -e "\n\033[1;32m✓ Renovación automática configurada correctamente.\033[0m"
  echo "  Los certificados se renovarán solos ~30 días antes de expirar,"
  echo "  sin downtime, y nginx se recargará automáticamente."
  echo
  certbot certificates 2>/dev/null | grep -E 'Certificate Name|Expiry Date' || true
else
  die "El dry-run falló. Revisa /var/log/letsencrypt/letsencrypt.log"
fi
