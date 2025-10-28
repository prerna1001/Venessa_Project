# Vanessa – Voice AI Acquisitions Assistant  

**Live Demo**: [https://venessa-project-frontend.onrender.com]

Vanessa is a fully deployed voice AI system that automates outbound real estate lead qualification.

---

## Key Features  
- **Auto-calls homeowners** using the [Vapi.ai](https://www.vapi.ai/) voice assistant API  
- **Converses** with them to determine:
  - If they’re open to selling  
  - Expected price range  
  - Timeline to sell  
  - Property condition  
- **Summarizes call results** using OpenAI (GPT)  
- **Classifies** the lead as *Qualified* or *Unqualified*  
- **Displays** the results in a live dashboard (React)  
- Accepts **Excel uploads** of phone numbers for bulk calling

---

## End-to-End Flow

1. **Upload Excel Sheet**  
   - User uploads a file of phone numbers via the frontend  
   - Numbers are extracted using OpenAI and normalized into E.164 format

2. **Sequential Outbound Calls Begin**  
   - Backend (Node.js) loops through numbers  
   - For each number:
     - A Vapi call is triggered with the custom assistant
     - Vanessa asks a fixed set of qualifying questions

3. **Call Summary via Webhook**  
   - After each call ends, Vapi sends a webhook to the backend  
   - The summary + transcript are analyzed via OpenAI to extract:
     - Selling intent (true/false)
     - Price range, timeline, condition, and notes

4. **Lead Classification & Storage**  
   - Qualified leads are saved to `qualified_leads.json`  
   - Unqualified leads go into `unqualified_leads.json`  
   - Logs are also saved for debugging (`/logs` folder)

5. **Dashboard Visualization**  
   - Frontend fetches and displays both lead types  
   - Users can track call progress and results in real-time

---

## 🛠 Tech Stack

| Layer      | Tools & Libraries                     |
|------------|----------------------------------------|
| Frontend   | React, Axios, Tailwind, Render         |
| Backend    | Node.js, Express, Multer, XLSX, Axios  |
| AI         | Vapi.ai (voice assistant), OpenAI GPT  |
| Hosting    | Render (frontend + backend)            |
| Format     | JSON for lead storage, E.164 phone format |