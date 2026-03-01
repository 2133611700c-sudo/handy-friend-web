# БЛОК 1: Supabase Setup — Покроковий план

**Проект:** taqlarevwifgfnjxilfh
**Dashboard:** https://supabase.com/dashboard/project/taqlarevwifgfnjxilfh

---

## КРОК 1 — Запустити SQL (SQL Editor)

Відкрий: **Dashboard → SQL Editor → New Query**

### 1.1 — Основна схема (таблиці + тригери)
Копіюй вміст `supabase/sql/001_leads_core.sql` → Run

### 1.2 — RLS Policies
Копіюй вміст `supabase/sql/002_rls_policies.sql` → Run

### 1.3 — Storage bucket
Копіюй вміст `supabase/sql/003_storage_private_bucket.sql` → Run

### 1.4 — Analytics views
Копіюй вміст `supabase/sql/004_analytics_views.sql` → Run

### 1.5 — Conversations patch (session_id + tokens_used)
Копіюй вміст `supabase/sql/005_conversations_patch.sql` → Run

---

## КРОК 2 — Deploy Edge Function

### Встанови Supabase CLI (якщо немає):
```bash
brew install supabase/tap/supabase
```

### Увійди в проект:
```bash
supabase login
supabase link --project-ref taqlarevwifgfnjxilfh
```

### Встанови секрети Edge Function:
```bash
supabase secrets set TELEGRAM_BOT_TOKEN=<твій_токен>
supabase secrets set TELEGRAM_CHAT_ID=<твій_chat_id>
```

### Deploy:
```bash
supabase functions deploy notify-telegram --no-verify-jwt
```

Edge Function URL буде:
`https://taqlarevwifgfnjxilfh.supabase.co/functions/v1/notify-telegram`

---

## КРОК 3 — Налаштувати Database Webhook

Відкрий: **Dashboard → Database → Webhooks → Create a new hook**

| Поле | Значення |
|------|---------|
| Name | `on_new_lead` |
| Table | `public.leads` |
| Events | ✅ Insert |
| Type | Supabase Edge Functions |
| Function | `notify-telegram` |

Натисни **Confirm** → зберегти.

> ℹ️ Без `pg_net` extension — Dashboard Webhooks використовують вбудований механізм.

---

## КРОК 4 — Додати env vars у Vercel

**Vercel Dashboard → Project → Settings → Environment Variables**

| Variable | Value |
|----------|-------|
| `SUPABASE_URL` | `https://taqlarevwifgfnjxilfh.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJ...` (з Dashboard → Settings → API) |

> ⚠️ `SUPABASE_SERVICE_ROLE_KEY` — НІКОЛИ не додавай у `NEXT_PUBLIC_*` префікс!

---

## КРОК 5 — Перевірити що все працює

### Тест INSERT через curl:
```bash
curl -X POST https://taqlarevwifgfnjxilfh.supabase.co/rest/v1/leads \
  -H "apikey: <SERVICE_ROLE_KEY>" \
  -H "Authorization: Bearer <SERVICE_ROLE_KEY>" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=minimal" \
  -d '{
    "id": "test-001",
    "full_name": "Test User",
    "phone": "+1 555 000 0000",
    "service_type": "Kitchen Cabinet Painting",
    "city": "Los Angeles",
    "zip": "90001",
    "source": "test"
  }'
```

Очікується: `204 No Content`
Telegram має отримати повідомлення протягом 1-2 секунд.

### Перевір таблицю:
Dashboard → Table Editor → leads → повинен бути один запис.

---

## Результат БЛОК 1

Після виконання всіх кроків:

- ✅ БД готова до прийому лідів
- ✅ Фото зберігаються в private bucket
- ✅ Кожен новий лід → Telegram повідомлення (через Edge Function)
- ✅ Analytics views для воронки
- ✅ ai_conversations готова для БЛОК 2 (DeepSeek)

---

## Наступний крок → БЛОК 2: DeepSeek AI

Команда: **"БЛОК 2 СТАРТ"**

Що буде:
- `/api/ai-chat.js` — serverless endpoint для чату
- System prompt на продажника (всі послуги, ціни, заперечення)
- Збереження розмови в `ai_conversations`
- Автоматичне створення ліда після збору контакту
