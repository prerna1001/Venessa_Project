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

// ========== Upload Excel and trigger calls ==========

app.post("/upload-excel", upload.single("file"), async (req, res) => {

  if (!fs.existsSync("uploads")) fs.mkdirSync("uploads");

  const filePath = req.file.path;
  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const csvData = XLSX.utils.sheet_to_csv(sheet);

  
 const prompt = `
You are a smart parser.
Given the following spreadsheet data:
---
${csvData}
---
Extract all valid U.S. phone numbers and return a JSON array in E.164 format, like:
["+13159523471", "+15559876543"]
Always add the +1 country code if it's missing.
Only return the JSON array. No extra commentary.
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

    // Sequential call loop
    for (const number of numbers) {
      callStatus[number] = { status: "Calling" };
      try {
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
        const callId = vapiResp.data.id;
        callStatus[number] = { status: "In Progress", callId };
      } catch (err) {
        callStatus[number] = { status: "Failed", error: err.message };
      }
    }
  } catch (err) {
    console.error("OpenAI error:", err.message);
    res.status(500).json({ error: "Failed to extract numbers" });
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
  fs.writeFileSync(path.join(__dirname, "logs", filename), JSON.stringify(req.body, null, 2));

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
