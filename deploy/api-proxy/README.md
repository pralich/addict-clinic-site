# API на поддомене api.addict.clinic

Сервер просто пересылает все запросы с `https://api.addict.clinic` в CRM API и возвращает ответ без изменений.
Параметры, заголовки, ключи и тело запроса — те же, что и раньше. Сайт addict.clinic не затрагивается.

```
https://api.addict.clinic/?resource=leads
        ↓
https://functions.poehali.dev/1145187d-844f-4f3f-8a1f-575d26202624?resource=leads
```

## Что нужно

- VPS с Ubuntu 22.04/24.04 (1 vCPU, 1 ГБ RAM достаточно), публичный IP.
- Доступ к DNS домена addict.clinic.

## 1. DNS

| Тип | Имя | Значение      | TTL |
|-----|-----|---------------|-----|
| A   | api | IP_ВАШЕГО_VPS | 300 |

Проверка: `dig +short api.addict.clinic` → IP сервера.

## 2. nginx и сертификат

```bash
sudo apt update
sudo apt install -y nginx certbot python3-certbot-nginx
sudo ufw allow 'Nginx Full' || true
sudo certbot certonly --nginx -d api.addict.clinic --agree-tos -m admin@addict.clinic --non-interactive
```

## 3. Конфиг

```bash
sudo cp nginx.conf /etc/nginx/sites-available/api.addict.clinic
sudo ln -s /etc/nginx/sites-available/api.addict.clinic /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

Сертификат продлевается автоматически.

## 4. Проверка

```bash
curl "https://api.addict.clinic/?resource=dictionaries"
curl "https://api.addict.clinic/?resource=ping" -H "X-Api-Key: ВАШ_КЛЮЧ"
```

Ответы должны совпадать с ответами по старому адресу.

## Если поменяется адрес функции

Поправьте строку `set $api "…"` в `nginx.conf` и выполните `sudo nginx -t && sudo systemctl reload nginx`.
