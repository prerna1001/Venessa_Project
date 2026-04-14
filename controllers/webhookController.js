const fs = require('fs');
const path = require('path');
const callController = require('./callController');


// Extraction logic from original index.js
const axios = require('axios');
const callController = require('./callController');

async function extractFieldsFromSummary(summary, transcript = "") {
  // Step 1: Prepare prompt for Claude
  console.log("[extractFieldsFromSummary] Preparing prompt for Claude");
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

  // Step 2: Call Claude API
  console.log("[extractFieldsFromSummary] Sending request to Claude API");
  const response = await axios.post(
    "https://api.anthropic.com/v1/messages",
    {
      model: "claude-3-opus-20240229",
      max_tokens: 1024,
      temperature: 0.2,
      messages: [
        { "role": "user", "content": prompt }
      ]
    },
    {
      headers: {
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json"
      }
    }
  );

  // Step 3: Log and parse Claude response
  console.log("$ [extractFieldsFromSummary] Claude API response:", JSON.stringify(response.data));
  const raw = response.data.content[0].text.trim();
  try {
    const parsed = JSON.parse(raw);
    console.log("[extractFieldsFromSummary] Parsed structured output:", parsed);
    return parsed;
  } catch (e) {
    console.error("[extractFieldsFromSummary] JSON parse error from Claude:", raw);
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
  // Step 1: Log webhook received
  console.log("$ [handleWebhook] Full webhook payload:", JSON.stringify(req.body));
  if (req.body && req.body.message && req.body.message.analysis && req.body.message.analysis.summary) {
    console.log("$ [handleWebhook] Vapi summary:", req.body.message.analysis.summary);
  } else {
    console.log("$ [handleWebhook] No summary found in webhook payload.");
  }
  const msg = req.body.message;
  const filename = `vapi-webhook-${Date.now()}.json`;
  const logsDir = path.join(__dirname, '../logs');
  try {
    if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });
    fs.writeFileSync(path.join(logsDir, filename), JSON.stringify(req.body, null, 2));
    console.log(`[handleWebhook] Webhook payload written to logs/${filename}`);
  } catch (e) {
    console.error("[handleWebhook] Failed to write webhook log:", e.message);
  }

  // Step 2: Validate webhook type
  if (!msg || msg.type !== "end-of-call-report") {
    console.log("[handleWebhook] Ignored webhook: not end-of-call-report");
    return res.status(200).send("ignored");
  }

  // Step 3: Extract call details
  const callId = msg.call?.id;
  const customerNumber = msg.customer?.number || "N/A";
  const summary = msg.analysis?.summary || "No summary available";
  const transcript = msg.artifact?.transcript || "";
  console.log("[handleWebhook] Extracted callId:", callId, "customerNumber:", customerNumber);

  if (!summary || !callId) {
    console.error("[handleWebhook] Missing summary or callId");
    return res.status(400).json({ error: "Missing summary or callId" });
  }

  try {
    // Step 4: Extract fields using Claude
    console.log("[handleWebhook] Calling extractFieldsFromSummary");
    const extracted = await extractFieldsFromSummary(summary, transcript);
    console.log("[handleWebhook] Extracted fields:", extracted);

    // Step 5: Format priceRange if present
    if (extracted.priceRange) {
      const match = extracted.priceRange.match(/\d+/g);
      if (match) {
        const numberOnly = match.join("");
        const formatted = `$${Number(numberOnly).toLocaleString()}`;
        extracted.priceRange = formatted;
        console.log("[handleWebhook] Formatted priceRange:", formatted);
      }
    }

    // Step 6: Build lead object
    const lead = {
      id: callId,
      number: customerNumber,
      createdAt: new Date().toISOString(),
      ...extracted,
      rawSummary: summary
    };
    console.log("[handleWebhook] Lead object:", lead);

    // Step 7: Determine file to write
    const file = extracted.intent
      ? path.join(__dirname, '../qualified_leads.json')
      : path.join(__dirname, '../unqualified_leads.json');
    console.log("[handleWebhook] Writing to file:", file);

    // Step 8: Read existing leads
    let existingLeads = [];
    if (fs.existsSync(file)) {
      try {
        const rawData = fs.readFileSync(file, "utf-8");
        existingLeads = JSON.parse(rawData);
        console.log("[handleWebhook] Read existing leads, count:", existingLeads.length);
      } catch {
        existingLeads = [];
        console.error("[handleWebhook] Failed to parse existing leads, starting fresh");
      }
    }

    // Step 9: Write new lead
    existingLeads.push(lead);
    fs.writeFileSync(file, JSON.stringify(existingLeads, null, 2));
    console.log(`[handleWebhook] Logged to ${file}`);

    // Step 10: Update call status
    callController.callStatus[customerNumber] = {
      status: "Completed",
      summary,
      ...extracted
    };
    console.log("[handleWebhook] Updated call status for:", customerNumber);

    // Step 11: Respond to webhook
    res.json({ callId, summary, customerNumber, structured: extracted });
    console.log("[handleWebhook] Webhook processing complete");
  } catch (error) {
    console.error("[handleWebhook] Webhook error:", error.message);
    res.status(500).json({ error: "Failed to process webhook" });
  }
};
