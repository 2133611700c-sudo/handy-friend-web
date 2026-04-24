# PROMPTS.md — Working Prompts for Each AI

> Save prompts that work. Delete prompts that don't. No hoarding.

## Claude (Strategy & Ops)

### Client Estimate
```
Generate a PDF estimate for [CLIENT NAME] at [ADDRESS].
Services: [list]. Use prices from price-registry.js.
Include: company header, itemized breakdown, total, payment terms, validity 7 days.
Contact: (213) 361-1700, hello@handyandfriend.com
```

### Lead Analysis
```
Pull /api/health?type=stats&days=7 and analyze:
1. Lead sources — which channel is working?
2. Conversion rate — are we closing?
3. SLA — are we responding fast enough?
4. Top services requested
Action items: what to do THIS WEEK to improve.
```

## ChatGPT (Knowledge Base + Images)

### DALL-E Image for Posts
```
Create a photo-realistic image of a professional handyman [doing X] in a modern Los Angeles home.
Clean workspace, natural lighting, worker wearing clean navy polo.
No text on image. No logos. Horizontal 16:9 format.
```

## Codex (Code Execution)

### Standard Task
```
Read AGENTS.md first. Create a feature branch.
Task: [description]
Acceptance criteria: [list]
Submit PR when done.
```

## Gemini (Research)

### Market Research
```
Research [TOPIC] for a handyman business in Los Angeles.
I need: market size, top 5 competitors with pricing, demand trends, seasonal patterns.
Sources must be verifiable. Flag anything uncertain.
```

## DeepSeek (Bulk via n8n)

### Lead Classification
```
Classify this message into: cabinet_painting, tv_mounting, furniture_assembly, interior_painting, flooring, plumbing, electrical, drywall, door, other.
Message: {message}
Return JSON: {"service": "...", "confidence": 0.0-1.0}
```

---
*Add prompts as you find ones that work. Remove ones that don't.*
