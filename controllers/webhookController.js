const fs = require('fs');
const path = require('path');
const callController = require('./callController');


// Extraction logic from original index.js
const axios = require('axios');
const callController = require('./callController');

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

exports.handleWebhook = async (req, res) => {
  const msg = req.body.message;
  const filename = `vapi-webhook-${Date.now()}.json`;
  const logsDir = path.join(__dirname, '../logs');
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
      ? path.join(__dirname, '../qualified_leads.json')
      : path.join(__dirname, '../unqualified_leads.json');

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
    callController.callStatus[customerNumber] = {
      status: "Completed",
      summary,
      ...extracted
    };

    res.json({ callId, summary, customerNumber, structured: extracted });
  } catch (error) {
    console.error("Webhook error:", error.message);
    res.status(500).json({ error: "Failed to process webhook" });
  }
};
