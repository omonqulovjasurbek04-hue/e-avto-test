# E-Avto Test — serverga chiqarish (Contabo · Docker · Nginx · Cloudflare · CI/CD)

> Asos: `AI-Prompt-and-Dars/Dasturchi/Deployment_Contabo_Docker_Nginx_Cloudflare_CICD_toliq_v3.md`.
> Bu hujjat shu qo'llanmani aynan shu loyihaga qo'llaydi.

```
Brauzer → DNS → Cloudflare (proxy, Full strict) → host Nginx :80/:443 → Docker
                                                   ├─ example.uz      → web  127.0.0.1:8080
                                                   └─ api.example.uz  → api  127.0.0.1:5000 → db, redis (faqat ichki tarmoq)
```

**Avtomatik deploy:** `main`ga push → **CI** (lint, tiplar, 299+ test real PostgreSQL'da, frontend build) →
image'lar GHCR'ga (`tag = commit SHA`) → SSH orqali serverda `deploy/deploy.sh`:
**backup → pull → migratsiya → ishga tushirish → healthcheck → muvaffaqiyatsiz bo'lsa avtomatik rollback.**

| Fayl | Vazifasi |
|---|---|
| `.github/workflows/ci.yml` | Har push va PR: backend + frontend tekshiruvi |
| `.github/workflows/deploy.yml` | `main` → image → server; qo'lda "rollback" tugmasi |
| `deploy/server-setup.sh` | Yangi VPS'ni bir marta tayyorlaydi |
| `deploy/deploy.sh` | Serverda bitta versiyani chiqaradi / qaytaradi |
| `deploy/docker-compose.prod.yml` | db, redis, migrate, api, web (+ ixtiyoriy clamav) |
| `deploy/nginx/eavto.conf.template` | Host Nginx: domen va api subdomen, Cloudflare real IP |
| `deploy/.env.production.example` | Server sirlari shabloni (serverda `.env.production`, Git'ga tushmaydi) |

---

## 1. Kerak bo'ladiganlar

- Contabo VPS: Ubuntu 22.04/24.04, kamida 2 vCPU / 4 GB RAM (ClamAV bilan 6 GB+), public IP.
- Domen (masalan `example.uz`) va bepul Cloudflare hisobi.
- O'z kompyuteringizda SSH kalit: `ssh-keygen -t ed25519 -f ~/.ssh/contabo_key`
  (Contabo panelida yoki `ssh-copy-id -i ~/.ssh/contabo_key.pub root@SERVER_IP` bilan serverga qo'shing).
- GitHub repo: `omonqulovjasurbek04-hue/e-avto-test`.

## 2. Serverni tayyorlash (bir marta)

```bash
# o'z kompyuteringizdan, repo ildizida
scp -i ~/.ssh/contabo_key -r deploy root@SERVER_IP:/root/eavto-deploy
ssh -i ~/.ssh/contabo_key root@SERVER_IP 'bash /root/eavto-deploy/server-setup.sh example.uz'
```

Skript: `deploy` foydalanuvchisi (sudo + docker, sizning kalitingiz), UFW (faqat 22/80/443),
Docker + compose, Nginx sayt sozlamasi, Cloudflare real-IP, certbot, fail2ban, `/opt/eavto/deploy`,
kunlik DB backup (03:30, oxirgi 14 ta).

**Keyin, tartib bilan:**

1. `ssh -i ~/.ssh/contabo_key deploy@SERVER_IP` ishlashini tekshiring. **Shundan keyingina**
   `/etc/ssh/sshd_config` da `PermitRootLogin no`, `PasswordAuthentication no` → `sudo systemctl reload ssh`.
2. Sirlarni to'ldiring: `nano /opt/eavto/deploy/.env.production`
   - `POSTGRES_PASSWORD`, `JWT_SECRET`, `TOTP_ENCRYPTION_KEY`, `MEDIA_SIGNING_SECRET` — tasodifiy:
     `openssl rand -hex 48`
   - `TELEGRAM_BOT_TOKEN`, `TELEGRAM_BOT_USERNAME` — bot (bitta token faqat **bitta** serverda ishlasin!)
   - `PAYMENT_PROVIDER` — hozircha bo'sh (Payme/Click deploy oxirida ulanadi)
   - Domen manzillari skript tomonidan qo'yilgan; tekshiring.

## 3. Cloudflare va HTTPS

1. Cloudflare'da domen → nameserverlarni domen registratorida almashtiring.
2. DNS → **A** yozuvlar, to'q sariq bulut (Proxied):

   | Type | Name | Value |
   |---|---|---|
   | A | `@` | SERVER_IP |
   | A | `www` | SERVER_IP |
   | A | `api` | SERVER_IP |

3. Serverda sertifikat:
   ```bash
   sudo certbot --nginx -d example.uz -d www.example.uz -d api.example.uz
   sudo certbot renew --dry-run
   ```
4. Cloudflare → SSL/TLS → **Full (strict)** ("Flexible" — redirect loop beradi).

## 4. GitHub sozlamalari (bir marta)

**Settings → Secrets and variables → Actions:**

| Tur | Nomi | Qiymati |
|---|---|---|
| Secret | `SSH_HOST` | Server IP |
| Secret | `SSH_USER` | `deploy` |
| Secret | `SSH_PRIVATE_KEY` | Deploy uchun **alohida** kalitning private qismi (pastda) |
| Secret | `SSH_HOST_FINGERPRINT` | Serverda: `ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub \| awk '{print $2}'` |
| Variable | `PUBLIC_API_URL` | `https://api.example.uz/api` |

Deploy kaliti (shaxsiy kalitingizni GitHub'ga bermang):
```bash
ssh-keygen -t ed25519 -f ./gh_deploy -N "" -C "github-actions"
ssh deploy@SERVER_IP 'cat >> ~/.ssh/authorized_keys' < gh_deploy.pub
# gh_deploy (private) → SSH_PRIVATE_KEY secret, keyin lokal nusxani o'chiring
```

**Settings → Environments → New environment → `production`.** Har bir deployni qo'lda tasdiqlash
uchun "Required reviewers"ga o'zingizni qo'shing (tavsiya: Continuous Delivery).

**Settings → Branches → `main`:** "Require status checks" → `backend`, `frontend` (CI'siz merge bo'lmaydi).

## 5. Birinchi deploy

`main`ga push (yoki Actions → Deploy → Run workflow). Kuzatish: GitHub → Actions.
Muvaffaqiyatdan keyin:

```bash
curl -fsS https://api.example.uz/api/health      # {"status":"ok", db: ok}
curl -I https://example.uz                        # 200, security headerlar
```

Birinchi admin: serverda bir marta seed (faqat yangi bazada!) yoki admin panel orqali yarating.
Seed'dagi `admin123` kabi parollarni **productionda ishlatmang** — darhol almashtiring va 2FA yoqing.

## 6. Kundalik ish

| Vazifa | Qanday |
|---|---|
| Yangi versiya | `main`ga merge/push — qolgani avtomatik |
| Orqaga qaytarish | Actions → Deploy → Run workflow → ☑ rollback (yoki serverda `./deploy.sh --rollback`) |
| Loglar | `cd /opt/eavto/deploy && docker compose -f docker-compose.prod.yml logs -f api` |
| Holat | `docker compose -f docker-compose.prod.yml ps` |
| Backup | `deploy/backups/` (har deploydan oldin + har kuni) |
| Tiklash | Avval **sinov bazasida**: `CONFIRM_RESTORE=yes DATABASE_URL=... ./restore.sh backups/x.dump` |

**Muhim:** rollback faqat kodni qaytaradi, migratsiyani emas. Migratsiyalarni orqaga mos yozing
(expand → contract: avval ustun qo'shish, eski kod ham ishlasin; o'chirishni keyingi relizda).

## 7. Production checklist

- [ ] DNS (`@`, `www`, `api`) Cloudflare orqali, Proxied
- [ ] HTTPS valid, Cloudflare **Full (strict)**, `certbot renew --dry-run` o'tadi
- [ ] `ss -tlnp` — 5000/8080 faqat `127.0.0.1`da; UFW: 22, 80, 443
- [ ] Root va parol bilan SSH o'chirilgan, `deploy` kalit bilan kiradi
- [ ] `.env.production` — `chmod 600`, Git'da yo'q, barcha `CHANGE_ME` almashtirilgan
- [ ] `/api/health` 200; deploy healthcheck'dan o'tdi
- [ ] Backup bor **va** restore sinab ko'rilgan
- [ ] Rollback bir marta sinab ko'rilgan
- [ ] Telegram bot tokeni boshqa joyda ishlatilmayapti
- [ ] Seed admin paroli almashtirilgan, 2FA yoqilgan

## 8. Muammo bo'lsa (qatlamma-qatlam)

| Belgisi | Qayerni tekshirish |
|---|---|
| Domen ochilmaydi | DNS (Cloudflare), `dig example.uz` |
| 521/522 (Cloudflare) | Server o'chiq yoki UFW 80/443 yopiq, `systemctl status nginx` |
| 525/526 | Sertifikat yo'q/eskirgan → `certbot`; rejim Full (strict) |
| 502 Bad Gateway | Nginx ↔ container: `docker compose ps`, `curl 127.0.0.1:5000/api/health/live` |
| API 500 / start bo'lmaydi | `docker compose logs api` — odatda `.env.production` qiymati (CLIENT_URL, PUBLIC_API_ORIGIN https bo'lishi shart) |
| Deploy job "unhealthy" | Avtomatik rollback bo'ladi; sababi Actions logida (`logs --tail=50 api`) |
