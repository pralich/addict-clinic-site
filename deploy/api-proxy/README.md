# API на поддомене api.addict.clinic

Сервер принимает запросы на `https://api.addict.clinic/v1/...` и передаёт их в CRM API.
Сайт addict.clinic при этом не затрагивается.

## Что нужно

- VPS с Ubuntu 22.04/24.04 (хватит минимального: 1 vCPU, 1 ГБ RAM), публичный IP.
- Доступ к DNS домена addict.clinic у регистратора.

## 1. DNS

У регистратора добавьте запись:

| Тип | Имя | Значение      | TTL |
|-----|-----|---------------|-----|
| A   | api | IP_ВАШЕГО_VPS | 300 |

Проверка (через 5–30 минут): `dig +short api.addict.clinic` → должен вернуть IP сервера.

## 2. Установка nginx и сертификата

```bash
sudo apt update
sudo apt install -y nginx certbot python3-certbot-nginx
sudo ufw allow 'Nginx Full' || true
```

## 3. Конфиги

Скопируйте на сервер два файла из этой папки:

```bash
sudo cp addict-api-proxy.conf /etc/nginx/snippets/addict-api-proxy.conf
sudo cp nginx.conf /etc/nginx/sites-available/api.addict.clinic
sudo ln -s /etc/nginx/sites-available/api.addict.clinic /etc/nginx/sites-enabled/
```

Сертификата ещё нет, поэтому сначала выпускаем его на временном конфиге:

```bash
sudo tee /etc/nginx/sites-enabled/api.addict.clinic >/dev/null <<'EOF'
server { listen 80; server_name api.addict.clinic; location / { return 200 'ok'; } }
EOF
sudo nginx -t && sudo systemctl reload nginx
sudo certbot certonly --nginx -d api.addict.clinic --agree-tos -m admin@addict.clinic --non-interactive
```

Возвращаем рабочий конфиг:

```bash
sudo rm /etc/nginx/sites-enabled/api.addict.clinic
sudo ln -s /etc/nginx/sites-available/api.addict.clinic /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

Сертификат продлевается автоматически (`systemctl list-timers | grep certbot`).

## 4. Проверка

```bash
curl https://api.addict.clinic/
curl https://api.addict.clinic/v1/dictionaries
curl https://api.addict.clinic/v1/ping -H "X-Api-Key: ВАШ_КЛЮЧ"
```

## Адреса

| Было                                         | Стало                                      |
|----------------------------------------------|--------------------------------------------|
| `…?resource=leads` (POST)                    | `POST /v1/leads`                           |
| `…?resource=leads&id=15` (GET)               | `GET /v1/leads/15`                         |
| `…?resource=leads&external_id=ABC-1` (GET)   | `GET /v1/leads/ext/ABC-1`                  |
| `…?resource=clients` / `deals`               | `/v1/clients`, `/v1/deals` (так же)        |
| `…?resource=ping`                            | `GET /v1/ping`                             |
| `…?resource=dictionaries`                    | `GET /v1/dictionaries`                     |

Старые параметры тоже работают: `GET /v1/leads?id=15`.
Ключ передаётся как раньше — в заголовке `X-Api-Key` или `Authorization: Bearer …`.

## Если поменяется адрес функции

Адрес функции зашит в `nginx.conf` в строке `set $fn_path "…"`.
Если он изменится — поправьте его и выполните `sudo nginx -t && sudo systemctl reload nginx`.
