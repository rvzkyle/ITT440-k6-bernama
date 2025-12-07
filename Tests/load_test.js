import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = 'https://www.bernama.com';

export const options = {
  stages: [
    { duration: '2m', target: 10 }, // ramp up
    { duration: '5m', target: 10 }, // hold
    { duration: '2m', target: 0 },  // ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95) < 2000'],
    http_req_failed: ['rate < 0.01'],
  },
};

export default function () {
  const res = http.get(BASE_URL);

  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 2s': (r) => r.timings.duration < 2000,
  });

  sleep(1);
}
