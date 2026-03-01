require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const callController = require('./controllers/callController');
const app = express();
app.use(express.json());
app.use(cors());

// Import routes
const callsRoutes = require('./routes/calls');
app.use('/', callsRoutes);

// ========== Single Call Endpoint ==========
// (If not already handled in routes/calls.js, remove this block)

app.post('/webhook', async (req, res) => {
  const webhookController = require('./controllers/webhookController');
  return webhookController.handleWebhook(req, res);
});

app.get('/leads/qualified', (req, res) => {
  try {
    const data = fs.readFileSync('qualified_leads.json', 'utf-8');
    res.json(JSON.parse(data));
  } catch {
    res.status(500).json({ error: 'Failed to read qualified leads' });
  }
});

app.get('/leads/unqualified', (req, res) => {
  try {
    const data = fs.readFileSync('unqualified_leads.json', 'utf-8');
    res.json(JSON.parse(data));
  } catch {
    res.status(500).json({ error: 'Failed to read unqualified leads' });
  }
});

app.get('/call-status', (req, res) => {
  res.json(callController.callStatus);
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
