# Daily Runbook — Handy & Friend

## Every day (08:00 PT)
1. Запустить production аудит:
   - `bash scripts/prod_audit.sh`
2. Обновить KPI-таблицу:
   - `ops/KPI_SCOREBOARD.csv`
3. Проверить stale leads и сделать 2 follow-ups минимум.
4. Отправить 3 review requests клиентам с завершёнными job.
5. Опубликовать контент по расписанию (FB/Nextdoor/GBP/CL manual where required).
6. Обновить GSC evidence matrix:
   - `ops/reports/2026-03-14-v4-gsc-evidence-matrix.csv`
7. После каждого завершённого job добавить proof assets:
   - сохранить raw файлы в `artifacts/imports/`
   - обновить публикации по SOP в `ops/reports/2026-03-14-v4-proof-asset-sop.md`

## Midday check (13:00 PT)
1. Проверка response SLA
2. Проверка платного трафика (Google Ads spend, clicks, search terms)
3. Проверка pipeline progression

## End of day (18:00 PT)
1. Обновить `reports/YYYY-MM-DD-eod-summary.md`
2. Зафиксировать:
   - wins
   - losses
   - next-day priority 1-3
3. Проверить, что top-3 задачи из `ops/TODAY_EXECUTION_BOARD.md` закрыты или перенесены с причиной.

## Non-negotiable controls
- Не оставлять лиды в `new` без контакта > 15 минут в рабочие часы.
- Не подтверждать "LIVE" без ссылки/скрина/лога.

## Before any Vercel action (mandatory)
1. Запустить preflight:
   - `bash scripts/ops/vercel-preflight.sh`
2. Только после PASS выполнять:
   - `vercel deploy`
   - `vercel inspect`
   - `vercel project list`
3. Если preflight вернул BLOCKED:
   - остановить действие
   - исправить repo/branch/project mismatch
   - повторить preflight
