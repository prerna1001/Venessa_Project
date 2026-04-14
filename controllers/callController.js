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
};

exports.callStatus = callStatus;