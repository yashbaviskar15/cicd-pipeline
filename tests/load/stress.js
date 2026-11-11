// k6 stress test — run on demand, never on every PR.
//
// Ramps from 0 to 100 virtual users to find the knee of the latency curve and
// verify the autoscaling policies (ECS Application Auto Scaling / Kubernetes
// HPA) react. Thresholds are looser than the SLO because the point is to find
// the breaking point, not to gate a merge.
//
//   k6 run -e BASE_URL=https://api.example.com tests/load/stress.js
//
// For a portfolio demo prefer:
//   k6 run --out web-dashboard -e BASE_URL=... tests/load/stress.js
import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';
import { BASE_URL, registerAndLogin, authHeaders } from './lib/common.js';

const taskCreateDuration = new Trend('task_create_duration', true);
const businessSuccess = new Rate('business_success');

export const options = {
  scenarios: {
    stress: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 20 }, // warm up
        { duration: '1m', target: 50 }, // normal-ish load
        { duration: '2m', target: 100 }, // stress
        { duration: '1m', target: 150 }, // push past the knee
        { duration: '1m', target: 0 } // ramp down
      ],
      gracefulRampDown: '10s'
    }
  },
  thresholds: {
    checks: ['rate>0.95'],
    http_req_failed: ['rate<0.02'],
    http_req_duration: ['p(95)<500', 'p(99)<1500'],
    business_success: ['rate>0.95']
  },
  tags: { testid: 'stress' }
};

export function setup() {
  const { token } = registerAndLogin();
  return { token };
}

export default function (data) {
  const headers = authHeaders(data.token);

  group('read path', () => {
    const res = http.get(`${BASE_URL}/api/tasks`, { headers, tags: { endpoint: 'tasks_list' } });
    check(res, { 'list tasks -> 200': (r) => r.status === 200 });
  });

  group('write path', () => {
    const res = http.post(
      `${BASE_URL}/api/tasks`,
      JSON.stringify({ title: `Stress task ${Date.now()}`, priority: 'low' }),
      { headers, tags: { endpoint: 'tasks_create' } }
    );
    taskCreateDuration.add(res.timings.duration);
    businessSuccess.add(check(res, { 'create task -> 201': (r) => r.status === 201 }));
  });

  sleep(0.5);
}
