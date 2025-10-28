
=======
- 
VANESSA - Voice AI Acquisitions Assistant
A Real-Time, Outbound Voice Calling Agent with Lead Qualification

Overview
Vanessa is a full-stack AI-powered voice acquisitions assistant designed to automate outbound calls to property owners and determine seller intent. This prototype integrates Vapi.ai for real-time calling, OpenAI GPT-4 for call summarization and field extraction, and a custom Node.js + React dashboard to manage and review qualified/unqualified leads.

Key Features
- Automated outbound calls to homeowners using Vapi.ai
- Determines seller interest by asking:
  - Are you interested in selling?
  - What’s your price range?
  - What’s your timeline?
  - What’s the property condition?
- Uses OpenAI to summarize calls and extract structured lead fields
- Categorizes leads as qualified or unqualified based on intent
- Logs and displays results in a real-time dashboard
- Accepts Excel file uploads to trigger multiple calls in sequence
- Dynamically tracks call status (Calling, In Progress, Completed)

File Upload and Calling Flow
Vanessa supports bulk calls through Excel upload:

1. User uploads an `.xlsx` file containing phone numbers in the format `xxx-xxx-xxxx`
2. The backend:
   - Parses the spreadsheet
   - Uses GPT-4 to normalize numbers into E.164 format (e.g., `+13159523471`)
   - Initiates sequential outbound calls via the Vapi API
3. Each call is summarized and categorized
4. Results are saved to `.json` files and shown on the frontend dashboard

Tech Stack
Layer         | Technologies Used
--------------|------------------------
Frontend      | React, TailwindCSS
Backend       | Node.js, Express
AI/NLP        | OpenAI GPT-4o
Telephony     | Vapi.ai
File Parsing  | XLSX, Multer
Storage       | JSON (for prototype)
Hosting       | Ngrok (for webhook testing)

Frontend Dashboard
- Qualified Leads: phone, price, timeline, condition, notes
- Unqualified Leads: phone, disinterest reason

Setup Instructions

1. Backend Setup:
   git clone <repo>
   cd VANESSA-BACKEND
   npm install
   node index.js

   Your .env file should include:
   OPENAI_API_KEY=your_openai_key
   VAPI_API_KEY=your_vapi_key
   AGENT_ID=your_vapi_agent_id
   PHONE_NUMBER_ID=your_verified_number_id

2. Frontend Setup:
   cd dashboard-frontend
   npm install
   npm start

   Make sure your Vapi assistant's webhook URL is set to the local tunnel (e.g., via Ngrok) that points to /webhook.


Call Flow Logic
1. /upload-excel receives an Excel file
2. Backend converts to CSV and uses GPT-4 to extract numbers in E.164 format
3. Outbound calls are triggered sequentially
4. /webhook receives end-of-call summaries
5. OpenAI extracts structured fields: intent, priceRange, timeline, condition, notes
6. Leads are saved into:
   - qualified_leads.json if intent is true
   - unqualified_leads.json otherwise

Summary
Vanessa demonstrates:

- End-to-end integration of AI, telephony, and real-time dashboards
- Real-world use of OpenAI for natural language analysis
- Strong full-stack architecture
- Seamless data flow from voice to dashboard

