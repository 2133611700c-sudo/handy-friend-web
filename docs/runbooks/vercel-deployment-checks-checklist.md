# Vercel Deployment Checks Checklist

Status: ACTIVE

## Goal

Protect production aliases from unsafe releases.

## Setup target

Use Vercel Deployment Checks for production promotion safety.

## Blocking check candidates

- Validate Site
- Vercel project guard
- pricing policy tests
- attribution tests
- secrets guard
- production readiness audit

## Manual or non-blocking until stable

- Alex production POST smoke
- OpenClaw deep scan
- Ads/GA4/CRM reconciliation
- full weekly regression

## Rules

- Do not block production on flaky network checks until raw logs are reliable.
- Do not promote a release if homepage or `/api/health` fails.
- Keep billing/payment out of release automation.

## Acceptance

- Production domain promotion is protected by selected checks.
- Failed release has raw logs.
- Rollback path is clear.
