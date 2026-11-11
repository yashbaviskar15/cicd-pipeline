#!/usr/bin/env node
// Post-deploy / CI end-to-end smoke test.
//
// Exercises the critical user journey against a REAL deployment over HTTP:
//   health -> register -> login -> create -> read -> list -> stats -> delete -> metrics
//
// Zero dependencies (uses the built-in fetch, Node 18+), so it can run in CI,
// after a blue/green deploy, or from a laptop.
//
//   BASE_URL=https://api.example.com node scripts/smoke-test.mjs
//
// Exit code 0 = healthy, 1 = at least one check failed (safe to gate a deploy
// and trigger an automatic rollback).

const BASE_URL = (process.env.BASE_URL || 'http://localhost:3000').replace(/\/+$/, '');
const TIMEOUT_MS = Number(process.env.SMOKE_TIMEOUT_MS || 10_000);
const RETRIES = Number(process.env.SMOKE_RETRIES || 1);

let passed = 0;
let failed = 0;

function check(name, condition, detail = '') {
  if (condition) {
    passed += 1;
    console.log(`  \u2713 ${name}`);
  } else {
    failed += 1;
    console.error(`  \u2717 ${name}${detail ? ` -> ${detail}` : ''}`);
  }
}

async function request(method, path, { token, body, expect } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: {
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal
    });
    const text = await res.text();
    let json;
    try {
      json = text ? JSON.parse(text) : undefined;
    } catch {
      json = undefined;
    }
    if (expect && res.status !== expect) {
      throw new Error(`${method} ${path} expected ${expect}, got ${res.status} ${text.slice(0, 200)}`);
    }
    return { status: res.status, json, text };
  } finally {
    clearTimeout(timer);
  }
}

async function runOnce() {
  const email = `smoke+${Date.now()}@example.com`;
  const password = 'SmokeTest123!';

  console.log(`\nSmoke test against ${BASE_URL}\n`);

  // 1. Liveness + readiness
  const live = await request('GET', '/health/live', { expect: 200 });
  check('GET /health/live -> 200', live.json?.status === 'alive', JSON.stringify(live.json));

  const ready = await request('GET', '/health/ready', { expect: 200 });
  check('GET /health/ready -> 200', ready.json?.status === 'ready', JSON.stringify(ready.json));

  const root = await request('GET', '/', { expect: 200 });
  check('GET / -> service overview', root.json?.service === 'cicd-backend');

  // 2. Register -> login
  const register = await request('POST', '/api/auth/register', {
    body: { email, name: 'Smoke Test', password },
    expect: 201
  });
  check('POST /api/auth/register -> 201', typeof register.json?.accessToken === 'string');

  const login = await request('POST', '/api/auth/login', { body: { email, password }, expect: 200 });
  const token = login.json?.accessToken;
  check('POST /api/auth/login -> 200', typeof token === 'string');
  if (!token) throw new Error('no access token; cannot continue');

  // 3. CRUD
  const created = await request('POST', '/api/tasks', {
    token,
    body: { title: 'Smoke test task', priority: 'high' },
    expect: 201
  });
  const taskId = created.json?.task?.id;
  check('POST /api/tasks -> 201', typeof taskId === 'string');

  const fetched = await request('GET', `/api/tasks/${taskId}`, { token, expect: 200 });
  check('GET /api/tasks/:id -> 200', fetched.json?.task?.id === taskId);

  const list = await request('GET', '/api/tasks', { token, expect: 200 });
  check('GET /api/tasks -> 200 lists the task', Array.isArray(list.json?.items));

  const stats = await request('GET', '/api/tasks/stats', { token, expect: 200 });
  check('GET /api/tasks/stats -> 200', stats.json !== undefined);

  const removed = await request('DELETE', `/api/tasks/${taskId}`, { token, expect: 204 });
  check('DELETE /api/tasks/:id -> 204', removed.status === 204);

  // 4. Observability endpoint
  const metrics = await request('GET', '/metrics', { expect: 200 });
  check('GET /metrics -> 200 exposes http_requests_total', metrics.text.includes('http_requests_total'));
}

async function main() {
  let attempt = 0;
  for (;;) {
    try {
      await runOnce();
      break;
    } catch (err) {
      attempt += 1;
      console.error(`\n  ! attempt ${attempt} failed: ${err.message}`);
      if (attempt > RETRIES) {
        failed += 1;
        break;
      }
      await new Promise((r) => setTimeout(r, 3000));
    }
  }

  console.log(`\n${passed} passed, ${failed} failed\n`);
  process.exit(failed === 0 ? 0 : 1);
}

main();
