//basic setup for express server with webhook endpoint and call initiation
const express = require("express"); // Server Express Framework
const axios = require("axios"); //For making API requests (to OpenAI, Vapi)
const fs = require("fs"); // File system access to store leads
const cors = require("cors"); //to allow frontend to access backend
const path = require("path"); // For file paths
require("dotenv").config();  // Load env vars from .env file
  
// Initialize Express app
const app = express();
app.use(express.json());
app.use(cors());

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
          "Content-Type": "application/json"
        }
      }
    );

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

// Webhook endpoint to receive call summaries from Vapi
app.post("/webhook", async (req, res) => {
  const msg = req.body.message;

  //Save incoming JSON file for debugging/backup
  const fullPayload = JSON.stringify(req.body, null, 2);
  const filename = `vapi-webhook-${Date.now()}.json`;
  fs.writeFileSync(path.join(__dirname, "logs", filename), fullPayload, "utf-8");
  console.log(`Saved incoming webhook to logs/${filename}`);

  //Ignore irrelevant messages
  if (!msg || msg.type !== "end-of-call-report") {
    return res.status(200).send("ignored");
  }

  // Extracting fields from webhook payload
  const callId = msg.call?.id;
  const customerNumber = msg.customer?.number || "N/A";
  const summary = msg.analysis?.summary || "No summary available";
  const transcript = msg.artifact?.transcript || "";

  console.log("Received webhook from Vanessa:");
  console.log("Call ID:", callId);
  console.log("Summary:", summary);
  console.log("Transcript:", transcript);
  console.log("customerNumber:", customerNumber);

  //if key data is missing, return error
  if (!summary || !callId) {
    return res.status(400).json({ error: "Missing summary or callId" });
  }

  try {
    //Extracting fields using LLM
    const extracted = await extractFieldsFromSummary(summary, transcript);
    console.log("Extracted via LLM:", extracted);

    // Normalize price format: "40000 dollars" => "$40,000"
    if (extracted.priceRange) {
      const match = extracted.priceRange.match(/\d+/g);
      if (match) {
        const numberOnly = match.join("");
        const formatted = `$${Number(numberOnly).toLocaleString()}`;
        extracted.priceRange = formatted;
      }
    }

    // Build complete lead object
    const lead = {
      id: callId,
      number: customerNumber,
      createdAt: new Date().toISOString(),
      ...extracted,
      rawSummary: summary
    };

    //saving lead to respective file based on intent
    const file = extracted.intent
      ? "qualified_leads.json"
      : "unqualified_leads.json";

    let existingLeads = [];
    if (fs.existsSync(file)) {
      try {
        const rawData = fs.readFileSync(file, "utf-8");
        existingLeads = JSON.parse(rawData);
        if (!Array.isArray(existingLeads)) throw new Error("Not an array");
      } catch (e) {
        console.error(`Failed to parse ${file}:`, e.message);
        existingLeads = [];
      }
    }

    //Adding new lead to existing leads and saving to file
    existingLeads.push(lead);
    fs.writeFileSync(file, JSON.stringify(existingLeads, null, 2));
    console.log(`Logged to ${file}`);

    res.json({ callId, summary, customerNumber, structured: extracted });
  } catch (error) {
    console.error("Error processing webhook:", error.message);
    res.status(500).json({ error: "Failed to process webhook" });
  }
});

// Sending qualified leadds to the frontend
app.get("/leads/qualified", (req, res) => {
  try {
    const data = fs.readFileSync("qualified_leads.json", "utf-8");
    res.json(JSON.parse(data));
  } catch (err) {
    res.status(500).json({ error: "Failed to read qualified leads" });
  }
});

// Sending unqualified leads to the frontend
app.get("/leads/unqualified", (req, res) => {
  try {
    const data = fs.readFileSync("unqualified_leads.json", "utf-8");
    res.json(JSON.parse(data));
  } catch (err) {
    res.status(500).json({ error: "Failed to read unqualified leads" });
  }
});

// Start the server
app.listen(3000, () => {
  console.log("Server running on port 3000")
});