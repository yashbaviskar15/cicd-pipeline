// Shared helpers for the k6 load tests.
//
// Every scenario targets a real, running backend (local docker compose stack
// in CI, or the deployed ALB URL on demand). Configure the target with the
// BASE_URL environment variable.
//
//   k6 run -e BASE_URL=http://localhost:3000 tests/load/smoke.js
import http from 'k6/http';
import { check } from 'k6';

export const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
export const JSON_HEADERS = { 'Content-Type': 'application/json' };

// Thresholds mirror the SLOs documented in docs/slo.md:
//   - availability 99.5%  -> http_req_failed rate < 0.005
//   - latency p95 < 300ms -> http_req_duration p(95) < 300
export const SLO_THRESHOLDS = {
  checks: ['rate>0.99'],
  http_req_failed: ['rate<0.005'],
  http_req_duration: ['p(95)<300', 'p(99)<1000'],
  'http_req_duration{endpoint:health}': ['p(95)<50'],
  'http_req_duration{endpoint:tasks_list}': ['p(95)<250']
};

/** Unique per-VU/per-iteration email so runs never collide on the unique index. */
export function uniqueEmail(prefix = 'loadtest') {
  return `${prefix}+${Date.now()}-${__VU}-${__ITER}@example.com`;
}

/**
 * Register a fresh user and return an access token.
 * Registration returns { user, accessToken, refreshToken }.
 */
export function registerAndLogin(headers = JSON_HEADERS) {
  const email = uniqueEmail();
  const payload = JSON.stringify({ email, name: 'Load Test', password: 'LoadTest123!' });
  const res = http.post(`${BASE_URL}/api/auth/register`, payload, {
    headers,
    tags: { endpoint: 'auth_register' }
  });
  check(res, { 'register -> 201': (r) => r.status === 201 });
  const body = res.json() || {};
  return { token: body.accessToken, email };
}

export function authHeaders(token) {
  return { ...JSON_HEADERS, Authorization: `Bearer ${token}` };
}
