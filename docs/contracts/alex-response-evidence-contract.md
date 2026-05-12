# Alex Response Evidence Contract

Status: ACTIVE

## Goal

Every `/api/ai-chat` response should be operationally traceable without exposing secrets or internal prompts.

## Required safe fields

Add these fields to successful JSON responses when implementation is safe:

- `session_id`: public-safe session identifier.
- `correlation_id`: request-level trace id for logs and CRM events.
- `latency_ms`: total handler latency.
- `model_source`: `deepseek`, `static_fallback`, or other approved provider/source.
- `fallback_used`: boolean.
- `leadCaptured`: boolean.
- `leadId`: CRM lead id when created, otherwise null.
- `service`: inferred service type when available.

## Field rules

- No secrets.
- No system prompt.
- No internal rates/margins.
- No provider API keys.
- No raw customer PII beyond what the existing reply already returns.
- Must remain backward-compatible with current frontend, which expects a `reply` field.

## Example shape

```json
{
  "reply": "Thanks for reaching out...",
  "session_id": "abc",
  "correlation_id": "req_abc",
  "latency_ms": 842,
  "model_source": "deepseek",
  "fallback_used": false,
  "leadCaptured": true,
  "leadId": "lead_123",
  "service": "tv_mounting"
}
```

## Acceptance criteria

1. Existing chat frontend still works.
2. Existing webhook/Telegram behavior still works.
3. `reply` remains present.
4. Production `/api/health` remains healthy.
5. `npm run smoke:alex` can validate latency/model/fallback when raw POST works.
6. No private tokens, prompts, or internal pricing appear in response.

## Implementation note

Patch `/api/ai-chat.js` only with a small targeted change after obtaining a full local file and test runner. Do not replace the large route blindly through a truncated payload.
