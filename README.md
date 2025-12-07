# Performance Testing Report for Bernama.com

**Course:** ITT440 – Network Programming  
**Student:** Mohamad Rizky bin Mohd Jamil  
**Student ID:** 2022242348  

---

## 1. Introduction

For this ITT440 – Network Programming individual assignment, I carried out performance testing on the Malaysian news portal **Bernama** (`https://www.bernama.com`) using the open-source tool **k6**.

**Objectives:**

- To see how the site behaves under normal, steady traffic (**load test**).  
- To check how it handles increasing traffic levels (**stress test**).  
- To observe its behaviour during a sudden burst of users (**spike test**).  
- To interpret the results and suggest realistic improvements.

**Hypothesis:**  
Because Bernama is a professional news portal, I expected it to handle normal and moderately high traffic without major errors. However, I anticipated that sudden spikes might cause higher response times and possibly some dropped connections, either due to capacity limits or security protections such as WAF/rate limiting.

---

## 2. Tools, Environment and Test Design

### 2.1 Tool: k6

I used **k6** because:

- It’s lightweight and easy to run from the command line.  
- Test scripts are written in JavaScript, which is simple to read and modify.  
- It provides clear terminal summaries and supports different test patterns (load, stress, spike, etc.).

### 2.2 Environment

| Item               | Details                                           |
|--------------------|---------------------------------------------------|
| Operating System   | Kali Linux (local VM)                             |
| Execution mode     | Local (no k6 Cloud)                               |
| Network            | Normal home/academic internet connection          |
| Target application | `https://www.bernama.com` (public news website)   |

### 2.3 Basic Script Structure

All three tests were built around the same simple HTTP scenario: send a GET request to the Bernama homepage, check the response, and then sleep for one second.

```js
import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = 'https://www.bernama.com';

export default function () {
  const res = http.get(BASE_URL);

  check(res, {
    'status is 200': (r) => r.status === 200,
  });

  // think time to simulate a real user pause
  sleep(1);
}
```
### 3. Load Test – Normal Traffic

#### 3.1 Scenario

**File:** `load_test.js`  

**Objective:** Simulate a modest, steady stream of users browsing the site.

**Load profile:**

- **Maximum virtual users (VUs):** 10  
- **Total duration:** 9 minutes  
- Ramp up from 0 → 10 VUs  
- Hold at 10 VUs  
- Ramp down to 0 VUs  

Each VU:

- Requests the Bernama homepage.  
- Performs two checks:  
  - Status code must be **200**.  
  - Response time must be **< 2 seconds**.  
- Sleeps for **1 second** between requests.

#### 3.2 Results (k6 summary, approximate)

- **Iterations:** 2,544  
- **HTTP requests:** 5,088 (around 9.3 req/s)  
- **Data received:** ~255 MB  
- **Data sent:** ~841 kB  

**Response time (`http_req_duration`):**

- **Average:** ~332 ms  
- **90th percentile:** ~790 ms  
- **95th percentile:** ~1.0 s  
- **Maximum:** ~40.8 s (a rare outlier)  

**Checks and errors:**

- `status is 200`: ~99% passed (1 failure).  
- `response time < 2s`: ~99% passed (18 responses slower than 2 seconds).  
- `http_req_failed`: about 0.01% (1 failed request) with a warning like  
  “connection reset by peer” – meaning the server closed the connection.

#### 3.3 Interpretation

For a normal load of 10 concurrent users, **Bernama.com** behaved very well:

- Almost all requests got an HTTP 200 response.  
- Most pages loaded in under one second, which is very comfortable for users.  
- Only a handful of requests were slower than 2 seconds, and just a single request actually failed (likely a temporary network/server reset).

From a user’s point of view, under this kind of everyday load the site feels **fast, responsive, and stable**.

---

### 4. Stress Test – Gradually Increasing Load

#### 4.1 Scenario

**File:** `stress_test.js`  

**Objective:** See how the website performs as we gradually increase the number of concurrent users, and whether it starts to show signs of stress.

**Load profile:**

- **Maximum VUs:** 40  
- **Total duration:** 12 minutes  
- Multiple stages that slowly ramp from low VUs up to 40 VUs, then ramp back down.

**Main check:**

- `status not 5xx` – ensures the server does not return HTTP 5xx errors.

#### 4.2 Results (k6 summary, approximate)

- **Iterations:** 6,722  
- **HTTP requests:** 13,444 (around 18.7 req/s)  
- **Data received:** ~674 MB  
- **Data sent:** ~2.2 MB  

**Response time (`http_req_duration`):**

- **Average:** ~567 ms  
- **90th percentile:** ~1.4 s  
- **95th percentile:** ~1.72 s  
- **Maximum:** ~17.7 s  

**Checks and errors:**

- `status not 5xx`: 100% passed (no 5xx errors).  
- `http_req_failed`: 0% – no failed requests at all.

#### 4.3 Interpretation

Even when I pushed the load up to 40 simultaneous virtual users, the site stayed stable:

- There were no failing requests and no server-side error codes.  
- Response times increased compared to the load test, which is expected, but 95% of requests still completed in under 2 seconds.

This suggests that **Bernama.com** can comfortably handle significantly more load than the small normal scenario (at least up to the levels tested) without breaking.

---

### 5. Spike Test – Sudden Burst of Users

#### 5.1 Scenario

**File:** `spike_test.js`  

**Objective:** Observe how the system reacts when the number of users jumps suddenly instead of increasing gradually.

**Load profile:**

- **Maximum VUs:** 30  
- **Total duration:** about 4 minutes 10 seconds  

**Stages:**

- Start at low VUs.  
- Quickly jump up to 30 VUs (spike).  
- Hold for a short period.  
- Drop back down and finish.

**Check:**

- `status is 200`

#### 5.2 Results (k6 summary, approximate)

- **Iterations:** 1,229  
- **HTTP requests:** 2,459 (around 9.8 req/s)  
- **Data received:** ~123 MB  
- **Data sent:** ~424 kB  

**Response time (`http_req_duration`):**

- **Average:** ~883 ms  
- **90th percentile:** ~2.1 s  
- **95th percentile:** ~2.7 s  
- **Maximum:** ~38.6 s  

**Checks and errors:**

- `status is 200`: ~99% passed (3 failures).  
- `http_req_failed`: about 0.12% (3 failed requests).  
- k6 printed warnings like: `read ...: read: connection reset by peer` –  
  these messages mean that the remote server or firewall closed some connections during the spike.

#### 5.3 Interpretation

The spike test is where performance became a bit more shaky:

- The average response time was still under 1 second, but the 90th and 95th percentiles went above 2 seconds. That means a noticeable portion of users would experience slower page loads during a spike.  
- A small number of requests actually failed, because the connection was reset by the server or some protection layer.

This behaviour is typical when a system has rate limiting, a WAF, or simply hits a temporary capacity limit when traffic suddenly jumps.

---

### 6. Overall Comparison

#### 6.1 Summary Table

| Test Type | Max VUs | Avg RT (ms) | p95 RT (ms) | Max RT (s) | HTTP Requests | Error Rate (`http_req_failed`)      |
|----------:|:-------:|------------:|------------:|-----------:|--------------:|------------------------------------:|
| Load      | 10      | ~332        | ~1,010      | ~40.8      | 5,088         | ~0.01% (1 / 5,088)                  |
| Stress    | 40      | ~567        | ~1,720      | ~17.7      | 13,444        | 0%                                  |
| Spike     | 30      | ~883        | ~2,720      | ~38.6      | 2,459         | ~0.12% (3 / 2,459)                  |

#### 6.2 What I Learned from the Numbers

- **Normal load:** The site is very responsive and almost error-free with 10 concurrent users.  
- **Gradual heavy load:** Even with 40 virtual users, the site remains stable, and response times are still reasonable for most users.  
- **Sudden spike:** The system can still serve traffic, but:
  - More users see slower responses.  
  - A small number of requests are dropped/reset.

Overall, **Bernama.com** seems well-tuned for normal and gradually increasing traffic, but it feels more vulnerable to sudden bursts.

---

### 7. Possible Bottlenecks & Recommendations

Based on the three tests, these are the main issues I noticed:

- Occasional very slow responses (tens of seconds) during higher load or spikes.  
- `connection reset by peer` errors during the load and spike tests, which suggest:
  - A firewall or WAF might be dropping some aggressive traffic.  
  - The backend is momentarily overloaded and closing connections.

#### Recommendations

If I were responsible for improving the site, I would consider:

1. **Scaling and capacity**  
   - Use autoscaling or add extra backend capacity to absorb sudden spikes more smoothly.

2. **Rate limiting and WAF tuning**  
   - Review any DDoS protection or rate limits to make sure legitimate short spikes are not punished too aggressively.

3. **Caching and static content optimisation**  
   - Ensure that static assets (images, CSS, JS) are cached properly and possibly served via a CDN, reducing load on the main servers.

4. **Monitoring and logging**  
   - Add detailed monitoring (APM, dashboards, logs) to pinpoint exactly which components contribute to the slowest response times and connection resets.

---

### 8. Video Walkthrough (YouTube)

As part of this assignment, I also recorded a short video where I:

- Introduce the objective and the target website.  
- Show the k6 scripts (`load_test.js`, `stress_test.js`, `spike_test.js`).  
- Run each test from the terminal.  
- Walk through the k6 output and highlight the key metrics.  
- Summarise the findings and recommendations.

👉 **YouTube link:**  
*(replace this with your actual video once uploaded)*

---

### 9. Conclusion

Working on this assignment gave me a practical feel for performance testing and how real websites react under different traffic patterns.

I learned how to design and run load, stress, and spike tests using k6. I saw that averages can look fine while percentiles and error rates tell a deeper story. I also realised how important it is to test ethically, especially when targeting real production sites.

Overall, **Bernama.com** handled my tests better than I expected:

- It stayed up and responded quickly most of the time.  
- It only showed minor issues during sudden spikes.  

With some tuning and monitoring, it could probably handle even heavier real-world traffic.
