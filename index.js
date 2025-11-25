const express = require("express");
const axios = require("axios");
const fs = require("fs");
const cors = require("cors");
const path = require("path");
const multer = require("multer");
const XLSX = require("xlsx");
require("dotenv").config();

const app = express();
app.use(express.json());
app.use(cors());

const upload = multer({ dest: "uploads/" });
const callStatus = {}; // Track number -> {status, summary, callId}
const CALL_CONCURRENCY = Math.max(parseInt(process.env.CALL_CONCURRENCY || "100", 10), 1);
const MAX_RETRIES = Math.max(parseInt(process.env.CALL_MAX_RETRIES || "3", 10), 0);
const CALL_RATE_PER_SEC = Math.max(parseInt(process.env.CALL_RATE_PER_SEC || "20", 10), 1); // Vapi-friendly creation rate

// Simple token-bucket style rate limiter for Vapi call creation
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

async function callVapi(number) {
  // Respect Vapi rate limits
  await acquireCallToken();
  const vapiResp = await axios.post(
    "https://api.vapi.ai/call",
    {
      assistantId: process.env.AGENT_ID,
      phoneNumberId: process.env.PHONE_NUMBER_ID,
      customer: { number }
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.VAPI_API_KEY}`,
        "Content-Type": "application/json"
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

// ========== Upload Excel and trigger calls ==========

app.post("/upload-excel", upload.single("file"), async (req, res) => {

  if (!fs.existsSync("uploads")) fs.mkdirSync("uploads");

  const filePath = req.file.path;
  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const csvData = XLSX.utils.sheet_to_csv(sheet);

  
 const prompt = `
You are a smart parser.

Below is spreadsheet data converted to CSV format:
---
${csvData}
---

Your task is to extract only valid US phone numbers from the **second column**, starting from **row 2 onward** (skip the header row).

Clean the phone numbers and convert them to strict E.164 format (like: "+13159523471").

- If a number is in the format "(555) 123-4567" or "315-952-3471", normalize it.
- If the number is 10 digits long without a country code, prepend +1.
- If the number is malformed or too short/long, skip it.

Return only a **JSON array** of valid numbers. No commentary or explanation.

Output example: ["+13159523471", "+15551234567"]
`;




  try {
    const gptResp = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    const content = gptResp.data.choices[0].message.content.trim();
    let numbers;
    try {
      numbers = JSON.parse(content);
    } catch {
      return res.status(400).json({ error: "Failed to parse LLM output", raw: content });
    }

    console.log("Extracted numbers:", numbers);
    res.json({ message: "Calls starting", numbers });

    // Concurrent call dispatch with a configurable pool size
    runPool(numbers, CALL_CONCURRENCY, async (number) => {
      callStatus[number] = { status: "Calling" };
      try {
        const callId = await callVapiWithRetry(number);
        callStatus[number] = { status: "In Progress", callId };
        return { number, callId };
      } catch (err) {
        callStatus[number] = { status: "Failed", error: err.message };
        return { number, error: err.message };
      }
    })
      .then(() => console.log(`Dispatched ${numbers.length} calls with concurrency ${CALL_CONCURRENCY}`))
      .catch((e) => console.error("Call dispatch error:", e.message));
  } catch (err) {
    console.error("OpenAI error:", err.message);
    res.status(500).json({ error: "Failed to extract numbers", err });
  }
});

// ========== Extractor ==========
async function extractFieldsFromSummary(summary, transcript = "") {
  const prompt = `
You are an information extraction assistant. 
Analyze the following real estate call summary and extract key fields.

Call summary:
"${summary}"

Transcript (if needed):
"${transcript?.slice(0, 1500)}"

Return a JSON object:
{
  "intent": true or false,
  "priceRange": string or null,
  "timeline": string or null,
  "condition": string or null,
  "notes": short concise note about motivation, hesitation, or concerns
}
Only valid JSON, no commentary.
  `;

  const response = await axios.post(
    "https://api.openai.com/v1/chat/completions",
    {
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      }
    }
  );

  const raw = response.data.choices[0].message.content.trim();
  try {
    return JSON.parse(raw);
  } catch (e) {
    console.error("JSON parse error from OpenAI:", raw);
    return {
      intent: false,
      priceRange: null,
      timeline: null,
      condition: null,
      notes: "LLM extraction failed"
    };
  }
}

// ========== Webhook ==========
app.post("/webhook", async (req, res) => {
  const msg = req.body.message;

  const filename = `vapi-webhook-${Date.now()}.json`;
  const logsDir = path.join(__dirname, "logs");
  try {
    if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });
    fs.writeFileSync(path.join(logsDir, filename), JSON.stringify(req.body, null, 2));
  } catch (e) {
    console.error("Failed to write webhook log:", e.message);
  }

  if (!msg || msg.type !== "end-of-call-report") {
    return res.status(200).send("ignored");
  }

  const callId = msg.call?.id;
  const customerNumber = msg.customer?.number || "N/A";
  const summary = msg.analysis?.summary || "No summary available";
  const transcript = msg.artifact?.transcript || "";

  if (!summary || !callId) {
    return res.status(400).json({ error: "Missing summary or callId" });
  }

  try {
    const extracted = await extractFieldsFromSummary(summary, transcript);

    if (extracted.priceRange) {
      const match = extracted.priceRange.match(/\d+/g);
      if (match) {
        const numberOnly = match.join("");
        const formatted = `$${Number(numberOnly).toLocaleString()}`;
        extracted.priceRange = formatted;
      }
    }

    const lead = {
      id: callId,
      number: customerNumber,
      createdAt: new Date().toISOString(),
      ...extracted,
      rawSummary: summary
    };

    const file = extracted.intent
      ? "qualified_leads.json"
      : "unqualified_leads.json";

    let existingLeads = [];
    if (fs.existsSync(file)) {
      try {
        const rawData = fs.readFileSync(file, "utf-8");
        existingLeads = JSON.parse(rawData);
      } catch {
        existingLeads = [];
      }
    }

    existingLeads.push(lead);
    fs.writeFileSync(file, JSON.stringify(existingLeads, null, 2));
    console.log(`Logged to ${file}`);

    // Update status
    callStatus[customerNumber] = {
      status: "Completed",
      summary,
      ...extracted
    };

    res.json({ callId, summary, customerNumber, structured: extracted });
  } catch (error) {
    console.error("Webhook error:", error.message);
    res.status(500).json({ error: "Failed to process webhook" });
  }
});

// ========== Fetch leads ==========
app.get("/leads/qualified", (req, res) => {
  try {
    const data = fs.readFileSync("qualified_leads.json", "utf-8");
    res.json(JSON.parse(data));
  } catch {
    res.status(500).json({ error: "Failed to read qualified leads" });
  }
});

app.get("/leads/unqualified", (req, res) => {
  try {
    const data = fs.readFileSync("unqualified_leads.json", "utf-8");
    res.json(JSON.parse(data));
  } catch {
    res.status(500).json({ error: "Failed to read unqualified leads" });
  }
});

// ========== Call status for polling ==========
app.get("/call-status", (req, res) => {
  res.json(callStatus);
});

// ========== Start ==========
app.listen(3000, () => {
  console.log("Server running on port 3000");
});
