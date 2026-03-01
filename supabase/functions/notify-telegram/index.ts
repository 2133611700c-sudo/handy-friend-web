/**
 * Supabase Edge Function: notify-telegram
 * Triggered via Database Webhook when a new row is inserted into public.leads.
 *
 * Deploy:
 *   supabase functions deploy notify-telegram --no-verify-jwt
 *
 * Required Supabase secrets (set once):
 *   supabase secrets set TELEGRAM_BOT_TOKEN=<token> TELEGRAM_CHAT_ID=<chat_id>
 */

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN") ?? "";
const CHAT_ID   = Deno.env.get("TELEGRAM_CHAT_ID")   ?? "";

serve(async (req: Request) => {
  // Supabase Database Webhooks send a JSON body with { type, table, record, old_record }
  let payload: Record<string, unknown>;
  try {
    payload = await req.json();
  } catch {
    return new Response("bad_request", { status: 400 });
  }

  const record = payload?.record as Record<string, string | number | null> | undefined;
  if (!record) {
    return new Response("no_record", { status: 400 });
  }

  const name        = String(record.full_name   ?? record.name ?? "—");
  const phone       = String(record.phone       ?? "—");
  const service     = String(record.service_type ?? "—");
  const city        = String(record.city         ?? "—");
  const zip         = String(record.zip          ?? "");
  const description = String(record.problem_description ?? record.description ?? "");
  const status      = String(record.status       ?? "new");
  const source      = String(record.source       ?? "website");
  const leadId      = String(record.id           ?? "");
  const budget      = String(record.budget_range ?? record.budget ?? "");

  const location = [city, zip].filter(Boolean).join(" ");

  const lines: string[] = [
    `🔔 <b>Новий лід!</b>`,
    ``,
    `👤 <b>${escHtml(name)}</b>`,
    `📞 ${escHtml(phone)}`,
    `🔧 ${escHtml(service)}`,
    `📍 ${escHtml(location) || "—"}`,
  ];

  if (description) {
    lines.push(`💬 ${escHtml(description.slice(0, 200))}${description.length > 200 ? "…" : ""}`);
  }
  if (budget) {
    lines.push(`💰 ${escHtml(budget)}`);
  }

  lines.push(``);
  lines.push(`📊 Status: <code>${status}</code>  Source: <code>${source}</code>`);
  lines.push(`🆔 <code>${leadId}</code>`);

  const text = lines.join("\n");

  if (!BOT_TOKEN || !CHAT_ID) {
    console.warn("[notify-telegram] Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID — skipping.");
    return new Response(JSON.stringify({ ok: true, skipped: true }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  const tgRes = await fetch(
    `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id:    CHAT_ID,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    }
  );

  const tgBody = await tgRes.json().catch(() => ({}));

  if (!tgRes.ok) {
    console.error("[notify-telegram] Telegram API error", tgBody);
    return new Response(JSON.stringify({ ok: false, error: tgBody }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ ok: true, telegram: tgBody }), {
    headers: { "Content-Type": "application/json" },
  });
});

function escHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
