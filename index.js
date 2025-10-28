<<<<<<< HEAD
//basic setup for express server with webhook endpoint and call initiation
const express = require("express"); // Server Express Framework
const axios = require("axios"); //For making API requests (to OpenAI, Vapi)
const fs = require("fs"); // File system access to store leads
const cors = require("cors"); //to allow frontend to access backend
const path = require("path"); // For file paths
require("dotenv").config();  // Load env vars from .env file
  
// Initialize Express app
=======
const express = require("express");
const axios = require("axios");
const fs = require("fs");
const cors = require("cors");
const path = require("path");
const multer = require("multer");
const XLSX = require("xlsx");
require("dotenv").config();

>>>>>>> e0bd3ca (Initial commit - Vanessa Voice AI prototype)
const app = express();
app.use(express.json());
app.use(cors());

<<<<<<< HEAD
//POST /call - Trigger an outbound call via Vapi
app.post("/call", async (req, res) => {
  try {
    const response = await axios.post(
      "https://api.vapi.ai/call",
      {
        assistantId: process.env.AGENT_ID,
        phoneNumberId: process.env.PHONE_NUMBER_ID,
        customer: {
          number: "+13159523471"  // for testing, replace it with your verified number
        }
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.VAPI_API_KEY}`,
=======
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
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
>>>>>>> e0bd3ca (Initial commit - Vanessa Voice AI prototype)
          "Content-Type": "application/json"
        }
      }
    );

<<<<<<< HEAD
    res.json({
      message: "Call started",
      callId: response.data.id
    });
  } catch (error) {
    console.error("Vapi error:", error.response?.data || error.message);
    res.status(500).json({ error: "Failed to start call" });
  }
});


// LLM extractor - call OpenAI to extract fields from call summary we get from Vanessa
async function extractFieldsFromSummary(summary, transcript = "") {
  const prompt = `
                  You are an information extraction assistant. 
                  Analyze the following real estate call summary and extract key fields.

                  Call summary:
                  "${summary}"

                  If useful, you can reference the transcript for context:
                  "${transcript?.slice(0, 1500)}"

                  Return a JSON object with this structure only:
                  {
                    "intent": true or false,
                    "priceRange": string or null,
                    "timeline": string or null,
                    "condition": string or null,
                    "notes": short concise note about motivation, hesitation, or concerns
                  }

                  Rules:
                  - intent = true if homeowner showed interest in selling or openness
                  - intent = false if they declined, hesitated, or ended call with no interest
                  - Only output valid JSON, no commentary.
                  `;
=======
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
>>>>>>> e0bd3ca (Initial commit - Vanessa Voice AI prototype)

  const response = await axios.post(
    "https://api.openai.com/v1/chat/completions",
    {
      model: "gpt-4o-mini",
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

<<<<<<< HEAD
// Webhook endpoint to receive call summaries from Vapi
app.post("/webhook", async (req, res) => {
  const msg = req.body.message;

  //Save incoming JSON file for debugging/backup
  const fullPayload = JSON.stringify(req.body, null, 2);
  const filename = `vapi-webhook-${Date.now()}.json`;
  fs.writeFileSync(path.join(__dirname, "logs", filename), fullPayload, "utf-8");
  console.log(`Saved incoming webhook to logs/${filename}`);

  //Ignore irrelevant messages
=======
// ========== Webhook ==========
app.post("/webhook", async (req, res) => {
  const msg = req.body.message;

  const filename = `vapi-webhook-${Date.now()}.json`;
  fs.writeFileSync(path.join(__dirname, "logs", filename), JSON.stringify(req.body, null, 2));

>>>>>>> e0bd3ca (Initial commit - Vanessa Voice AI prototype)
  if (!msg || msg.type !== "end-of-call-report") {
    return res.status(200).send("ignored");
  }

<<<<<<< HEAD
  // Extracting fields from webhook payload
=======
>>>>>>> e0bd3ca (Initial commit - Vanessa Voice AI prototype)
  const callId = msg.call?.id;
  const customerNumber = msg.customer?.number || "N/A";
  const summary = msg.analysis?.summary || "No summary available";
  const transcript = msg.artifact?.transcript || "";

<<<<<<< HEAD
  console.log("Received webhook from Vanessa:");
  console.log("Call ID:", callId);
  console.log("Summary:", summary);
  console.log("Transcript:", transcript);
  console.log("customerNumber:", customerNumber);

  //if key data is missing, return error
=======
>>>>>>> e0bd3ca (Initial commit - Vanessa Voice AI prototype)
  if (!summary || !callId) {
    return res.status(400).json({ error: "Missing summary or callId" });
  }

  try {
<<<<<<< HEAD
    //Extracting fields using LLM
    const extracted = await extractFieldsFromSummary(summary, transcript);
    console.log("Extracted via LLM:", extracted);

    // Normalize price format: "40000 dollars" => "$40,000"
=======
    const extracted = await extractFieldsFromSummary(summary, transcript);

>>>>>>> e0bd3ca (Initial commit - Vanessa Voice AI prototype)
    if (extracted.priceRange) {
      const match = extracted.priceRange.match(/\d+/g);
      if (match) {
        const numberOnly = match.join("");
        const formatted = `$${Number(numberOnly).toLocaleString()}`;
        extracted.priceRange = formatted;
      }
    }

<<<<<<< HEAD
    // Build complete lead object
=======
>>>>>>> e0bd3ca (Initial commit - Vanessa Voice AI prototype)
    const lead = {
      id: callId,
      number: customerNumber,
      createdAt: new Date().toISOString(),
      ...extracted,
      rawSummary: summary
    };

<<<<<<< HEAD
    //saving lead to respective file based on intent
=======
>>>>>>> e0bd3ca (Initial commit - Vanessa Voice AI prototype)
    const file = extracted.intent
      ? "qualified_leads.json"
      : "unqualified_leads.json";

    let existingLeads = [];
    if (fs.existsSync(file)) {
      try {
        const rawData = fs.readFileSync(file, "utf-8");
        existingLeads = JSON.parse(rawData);
<<<<<<< HEAD
        if (!Array.isArray(existingLeads)) throw new Error("Not an array");
      } catch (e) {
        console.error(`Failed to parse ${file}:`, e.message);
=======
      } catch {
>>>>>>> e0bd3ca (Initial commit - Vanessa Voice AI prototype)
        existingLeads = [];
      }
    }

<<<<<<< HEAD
    //Adding new lead to existing leads and saving to file
=======
>>>>>>> e0bd3ca (Initial commit - Vanessa Voice AI prototype)
    existingLeads.push(lead);
    fs.writeFileSync(file, JSON.stringify(existingLeads, null, 2));
    console.log(`Logged to ${file}`);

<<<<<<< HEAD
    res.json({ callId, summary, customerNumber, structured: extracted });
  } catch (error) {
    console.error("Error processing webhook:", error.message);
=======
    // Update status
    callStatus[customerNumber] = {
      status: "Completed",
      summary,
      ...extracted
    };

    res.json({ callId, summary, customerNumber, structured: extracted });
  } catch (error) {
    console.error("Webhook error:", error.message);
>>>>>>> e0bd3ca (Initial commit - Vanessa Voice AI prototype)
    res.status(500).json({ error: "Failed to process webhook" });
  }
});

<<<<<<< HEAD
// Sending qualified leadds to the frontend
=======
// ========== Fetch leads ==========
>>>>>>> e0bd3ca (Initial commit - Vanessa Voice AI prototype)
app.get("/leads/qualified", (req, res) => {
  try {
    const data = fs.readFileSync("qualified_leads.json", "utf-8");
    res.json(JSON.parse(data));
<<<<<<< HEAD
  } catch (err) {
=======
  } catch {
>>>>>>> e0bd3ca (Initial commit - Vanessa Voice AI prototype)
    res.status(500).json({ error: "Failed to read qualified leads" });
  }
});

<<<<<<< HEAD
// Sending unqualified leads to the frontend
=======
>>>>>>> e0bd3ca (Initial commit - Vanessa Voice AI prototype)
app.get("/leads/unqualified", (req, res) => {
  try {
    const data = fs.readFileSync("unqualified_leads.json", "utf-8");
    res.json(JSON.parse(data));
<<<<<<< HEAD
  } catch (err) {
=======
  } catch {
>>>>>>> e0bd3ca (Initial commit - Vanessa Voice AI prototype)
    res.status(500).json({ error: "Failed to read unqualified leads" });
  }
});

<<<<<<< HEAD
// Start the server
app.listen(3000, () => {
  console.log("Server running on port 3000")
});
=======
// ========== Call status for polling ==========
app.get("/call-status", (req, res) => {
  res.json(callStatus);
});

// ========== Start ==========
app.listen(3000, () => {
  console.log("Server running on port 3000");
});
>>>>>>> e0bd3ca (Initial commit - Vanessa Voice AI prototype)
