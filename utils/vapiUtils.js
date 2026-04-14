const axios = require('axios');

const CALL_CONCURRENCY = Math.max(parseInt(process.env.CALL_CONCURRENCY || '100', 10), 1);
const MAX_RETRIES = Math.max(parseInt(process.env.CALL_MAX_RETRIES || '3', 10), 0);
const CALL_RATE_PER_SEC = Math.max(parseInt(process.env.CALL_RATE_PER_SEC || '20', 10), 1);

let callTokens = CALL_RATE_PER_SEC;
const callWaiters = [];
function flushCallWaiters() {
  while (callTokens > 0 && callWaiters.length > 0) {
    callTokens--;
    const resolve = callWaiters.shift();
    resolve();
  }
}
setInterval(() => {
  callTokens = CALL_RATE_PER_SEC;
  flushCallWaiters();
}, 1000);
async function acquireCallToken() {
  if (callTokens > 0) {
    callTokens--;
    return;
  }
  return new Promise((resolve) => callWaiters.push(resolve));
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
//So async means the system does not block while waiting for a response. For example, if one call is in progress and waiting for a response, the thread is freed up to handle other tasks instead of sitting idle.

// Synchronous is the opposite, where the system waits for each task to complete before moving to the next, so the thread remains blocked.

//Concurrency means handling multiple tasks at the same time, either by switching between them efficiently using async or by using multiple threads.

//So in my system, I used asynchronous handling for webhook events so that multiple calls can be processed without blocking the server.

async function callVapi(number) {
  await acquireCallToken();
  const vapiResp = await axios.post(
    'https://api.vapi.ai/call',
    {
      assistantId: process.env.AGENT_ID,
      phoneNumberId: process.env.PHONE_NUMBER_ID,
      customer: { number }
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.VAPI_API_KEY}`,
        'Content-Type': 'application/json'
      }
    }
  );
  return vapiResp.data.id;
}

async function callVapiWithRetry(number) {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await callVapi(number);
    } catch (err) {
      const status = err?.response?.status;
      const retriable = status === 429 || (status >= 500 && status < 600);
      if (attempt < MAX_RETRIES && retriable) {
        const backoff = Math.min(1000 * Math.pow(2, attempt), 8000) + Math.floor(Math.random() * 250);
        await sleep(backoff);
        continue;
      }
      throw err;
    }
  }
}

async function runPool(items, limit, worker) {
  const results = new Array(items.length);
  let index = 0;
  const workers = new Array(Math.min(limit, items.length)).fill(0).map(async () => {
    while (true) {
      const current = index++;
      if (current >= items.length) break;
      const item = items[current];
      results[current] = await worker(item, current);
    }
  });
  await Promise.all(workers);
  return results;
}

module.exports = { callVapiWithRetry, runPool };
