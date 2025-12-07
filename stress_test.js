import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = 'https://www.bernama.com';

export const options = {
  stages: [
    { duration: '2m', target: 10 },
    { duration: '2m', target: 20 },
    { duration: '2m', target: 30 },
    { duration: '2m', target: 40 }, // you can lower to 30 if you want to be safer
    { duration: '2m', target: 20 },
    { duration: '2m', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95) < 4000'],
    http_req_failed: ['rate < 0.05'],
  },
};

export default function () {
  const res = http.get(BASE_URL);

  check(res, {
    'status not 5xx': (r) => r.status < 500,
  });

  sleep(1);
}
