// k6 smoke test — runs on every PR/migration in CI.
//
// Low, fixed load (5 VUs for 30s) purely to verify that the service is
// functional and that it meets the SLO thresholds under light traffic.
// It is NOT a capacity test; see stress.js for that.
//
//   k6 run -e BASE_URL=http://localhost:3000 tests/load/smoke.js
import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';
import { BASE_URL, SLO_THRESHOLDS, registerAndLogin, authHeaders } from './lib/common.js';

const taskCreateDuration = new Trend('task_create_duration', true);
const businessSuccess = new Rate('business_success');

export const options = {
  vus: 5,
  duration: '30s',
  thresholds: {
    ...SLO_THRESHOLDS,
    task_create_duration: ['p(95)<300'],
    business_success: ['rate>0.99']
  },
  tags: { testid: 'smoke' }
};

export function setup() {
  // One shared user for the whole run (avoids hammering the register endpoint).
  const { token } = registerAndLogin();
  return { token };
}

export default function (data) {
  const headers = authHeaders(data.token);

  group('health', () => {
    const res = http.get(`${BASE_URL}/health/ready`, { tags: { endpoint: 'health' } });
    check(res, { 'health/ready -> 200': (r) => r.status === 200 });
  });

  group('tasks', () => {
    const created = http.post(
      `${BASE_URL}/api/tasks`,
      JSON.stringify({ title: `Load test task ${Date.now()}`, priority: 'medium' }),
      { headers, tags: { endpoint: 'tasks_create' } }
    );
    taskCreateDuration.add(created.timings.duration);
    businessSuccess.add(check(created, { 'create task -> 201': (r) => r.status === 201 }));

    const list = http.get(`${BASE_URL}/api/tasks`, {
      headers,
      tags: { endpoint: 'tasks_list' }
    });
    check(list, { 'list tasks -> 200': (r) => r.status === 200 });

    const stats = http.get(`${BASE_URL}/api/tasks/stats`, {
      headers,
      tags: { endpoint: 'tasks_stats' }
    });
    check(stats, { 'task stats -> 200': (r) => r.status === 200 });
  });

  sleep(1);
}
