#!/usr/bin/env bash
# One-time setup of a fresh Ubuntu 22.04/24.04 VPS (Contabo) for E-Avto Test. Run as root:
#   scp -r deploy root@SERVER_IP:/root/eavto-deploy
#   ssh root@SERVER_IP 'bash /root/eavto-deploy/server-setup.sh example.uz'
#
# Does: a "deploy" user (sudo + docker, your SSH key), UFW (22, 80, 443 only), Docker + compose plugin,
# nginx with the site config and Cloudflare real-IP, certbot, /opt/eavto/deploy, daily DB backup cron.
# Does NOT: turn off root/password SSH login (do it yourself once key login as "deploy" works),
# fill in secrets (.env.production), or request the certificate (see the last lines it prints).
set -euo pipefail

DOMAIN="${1:?Usage: server-setup.sh <domain>   e.g. server-setup.sh example.uz}"
DEPLOY_USER="${DEPLOY_USER:-deploy}"
APP_DIR=/opt/eavto
SRC="$(cd "$(dirname "$0")" && pwd)"

[ "$(id -u)" -eq 0 ] || { echo "Run as root" >&2; exit 1; }
echo "== E-Avto Test server setup for $DOMAIN"

# 1. Packages
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get upgrade -y
apt-get install -y ca-certificates curl gnupg ufw nginx certbot python3-certbot-nginx unattended-upgrades fail2ban

# 2. Docker Engine + compose plugin from Docker's apt repository
if ! command -v docker >/dev/null; then
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc
  . /etc/os-release
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu ${VERSION_CODENAME} stable" > /etc/apt/sources.list.d/docker.list
  apt-get update -y
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
fi
systemctl enable --now docker

# 3. Deploy user with the same SSH keys as root (key login only for this user)
if ! id "$DEPLOY_USER" >/dev/null 2>&1; then
  adduser --disabled-password --gecos "" "$DEPLOY_USER"
fi
usermod -aG sudo,docker "$DEPLOY_USER"
install -d -m 700 -o "$DEPLOY_USER" -g "$DEPLOY_USER" "/home/$DEPLOY_USER/.ssh"
if [ -f /root/.ssh/authorized_keys ]; then
  cat /root/.ssh/authorized_keys >> "/home/$DEPLOY_USER/.ssh/authorized_keys"
  sort -u -o "/home/$DEPLOY_USER/.ssh/authorized_keys" "/home/$DEPLOY_USER/.ssh/authorized_keys"
  chown "$DEPLOY_USER:$DEPLOY_USER" "/home/$DEPLOY_USER/.ssh/authorized_keys"
  chmod 600 "/home/$DEPLOY_USER/.ssh/authorized_keys"
fi

# 4. Firewall: SSH first, then web. App ports (5000, 8080) stay on 127.0.0.1 and are never opened.
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

# 5. App directory with the deploy files
install -d -o "$DEPLOY_USER" -g "$DEPLOY_USER" "$APP_DIR" "$APP_DIR/deploy" "$APP_DIR/deploy/backups"
cp -r "$SRC"/. "$APP_DIR/deploy/"
chown -R "$DEPLOY_USER:$DEPLOY_USER" "$APP_DIR"
chmod +x "$APP_DIR/deploy/"*.sh
if [ ! -f "$APP_DIR/deploy/.env.production" ]; then
  cp "$APP_DIR/deploy/.env.production.example" "$APP_DIR/deploy/.env.production"
  sed -i "s#https://api.example.uz/api#https://api.$DOMAIN/api#; s#https://api.example.uz#https://api.$DOMAIN#; s#https://example.uz#https://$DOMAIN#; s#no-reply@example.uz#no-reply@$DOMAIN#" "$APP_DIR/deploy/.env.production"
  chown "$DEPLOY_USER:$DEPLOY_USER" "$APP_DIR/deploy/.env.production"
fi
chmod 600 "$APP_DIR/deploy/.env.production"

# 6. nginx: Cloudflare real-IP list + the site
mkdir -p /etc/nginx/snippets
{
  echo "# Cloudflare edge addresses (refreshed by server-setup.sh). Visitor IP from CF-Connecting-IP."
  for ip in $(curl -fsS https://www.cloudflare.com/ips-v4) $(curl -fsS https://www.cloudflare.com/ips-v6); do echo "set_real_ip_from $ip;"; done
  echo "real_ip_header CF-Connecting-IP;"
} > /etc/nginx/snippets/cloudflare-realip.conf
sed "s/__DOMAIN__/$DOMAIN/g" "$SRC/nginx/eavto.conf.template" > /etc/nginx/sites-available/eavto.conf
ln -sf /etc/nginx/sites-available/eavto.conf /etc/nginx/sites-enabled/eavto.conf
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx

# 7. Daily database backup at 03:30 (pre-deploy backups are made by deploy.sh too)
cat > /etc/cron.d/eavto-backup <<CRON
30 3 * * * $DEPLOY_USER cd $APP_DIR/deploy && docker compose -f docker-compose.prod.yml --env-file .env.production exec -T db sh -c 'pg_dump -U "\$POSTGRES_USER" -d "\$POSTGRES_DB" --format=custom --no-owner' > backups/daily-\$(date +\%Y\%m\%d).dump 2>/dev/null && ls -1t backups/daily-*.dump | tail -n +15 | xargs -r rm --
CRON

cat <<DONE

== Done. Next steps (see docs/DEPLOYMENT.md):
 1. Check key login works:  ssh $DEPLOY_USER@<SERVER_IP>
    Then turn off root/password login in /etc/ssh/sshd_config (PermitRootLogin no, PasswordAuthentication no)
    and run: systemctl reload ssh
 2. Fill in secrets:  nano $APP_DIR/deploy/.env.production   (IMAGE_REGISTRY, POSTGRES_PASSWORD, JWT_SECRET, ...)
 3. DNS (Cloudflare): A records  @, www, api  →  this server's IP.
 4. Certificate:  certbot --nginx -d $DOMAIN -d www.$DOMAIN -d api.$DOMAIN
    Cloudflare → SSL/TLS → Full (strict). Test renewal: certbot renew --dry-run
 5. Push to main on GitHub: the "Deploy" workflow builds and starts everything.
DONE
