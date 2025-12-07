import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = 'https://www.bernama.com';

export const options = {
  stages: [
    { duration: '1m', target: 5 },
    { duration: '10s', target: 30 },
    { duration: '1m', target: 30 },
    { duration: '1m', target: 5 },
    { duration: '1m', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95) < 3000'],
    http_req_failed: ['rate < 0.03'],
  },
};

export default function () {
  const res = http.get(BASE_URL);

  check(res, {
    'status is 200': (r) => r.status === 200,
  });

  sleep(1);
}
