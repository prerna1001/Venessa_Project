const axios = require('axios');
const fs = require('fs');
const XLSX = require('xlsx');
const { callVapiWithRetry, runPool } = require('../utils/vapiUtils');
const CALL_CONCURRENCY = 5
// In-memory call status
const callStatus = {};

exports.singleCall = async (req, res) => {
  const { name, purpose, number } = req.body;
  if (!name || !purpose || !number) {
    return res.status(400).json({ error: 'Missing name, purpose, or number' });
  }
  try {
    callStatus[number] = { status: 'Calling', name, purpose };
    const callId = await callVapiWithRetry(number);
    callStatus[number] = { status: 'In Progress', callId, name, purpose };
    res.json({ message: `Call placed for ${name}`, callId, number });
  } catch (err) {
    callStatus[number] = { status: 'Failed', error: err.message, name, purpose };
    res.status(500).json({ error: 'Failed to place call', details: err.message });
  }
};

exports.uploadExcel = async (req, res) => {
  if (!fs.existsSync('uploads')) fs.mkdirSync('uploads');
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
    // Use Claude (Anthropic) API instead of OpenAI
    const claudeResp = await axios.post(
      "https://api.anthropic.com/v1/messages",
      {
        model: "claude-3-opus-20240229",
        max_tokens: 1024,
        temperature: 0.2,
        messages: [
          { role: "user", content: prompt }
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

    // Log the full Claude response for debugging
    console.log("$ [uploadExcel] Claude API response:", JSON.stringify(claudeResp.data));

    const content = claudeResp.data.content[0].text.trim();
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
    if (err.response && err.response.data) {
      console.error("$ [uploadExcel] Claude error response:", JSON.stringify(err.response.data));
    }
    console.error("Claude error:", err.message);
    res.status(500).json({ error: "Failed to extract numbers", err: err.message, details: err.response && err.response.data });
  }
};

exports.callStatus = callStatus;