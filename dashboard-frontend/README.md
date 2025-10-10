
VANESSA - VOICE AI ACQUISITIONS ASSISTANT (Demo Project)


**As, this is a prototype and not producation ready project, I have created a demo (Location (https://drive.google.com/file/d/1G_Nn2IXmPXkRTaXl5Rgdlq2xZu_9nxnN/view?usp=sharing)) for you to look at how it works start-to-end in my local system.**

**Please let me know if you need anything else from my side.**

ABOUT THIS PROJECT
------------------
This project is a working prototype of a Voice AI acquisitions agent (“Vanessa”) built using Vapi.ai and OpenAI. The purpose is to demonstrate a functional demo that:

- Connects to a dialer using Vapi.ai API 
- Makes automated outbound calls to property owners
   - Currently, I’m initiating the call manually using the /call endpoint, but to automatically reach multiple homeowners, we’ll provide Vanessa with a CSV file containing their phone numbers so the backend can loop through each entry and trigger outbound calls sequentially.
- Determines seller intent within ~90 seconds
- Asks questions related to price range, timeline, and property condition
- Logs all call summaries and extracted information to a dashboard
- Separates leads into "qualified" and "unqualified" based on interest

Vanessa’s role is to act as a friendly, confident, and professional acquisitions assistant. She builds quick rapport with single-family homeowners and politely asks if they’d consider selling. Her tone remains calm, natural, and non-robotic.

If someone isn't selling, wants to speak later, or asks to be removed, Vanessa ends the call gracefully and politely. All calls stay under 180 seconds unless transferred.

This is a functional prototype only and **not production-ready**.


 * SETUP INSTRUCTIONS


1. Clone the repository and install backend dependencies:
   > npm install

2. Start the backend server:
   > node index.js
   (Server runs at http://localhost:3000)


* TESTING AN OUTBOUND CALL

To trigger a test call, hit the /call endpoint.

IMPORTANT: Replace your phone number before testing.

In `index.js`, locate the following block and replace the number with your verified number from Vapi:

------------------------------------------------------------
customer: {
  number: "+13159523471"  // <-- Replace with your verified number
}
------------------------------------------------------------

Then run:
   > curl -X POST http://localhost:3000/call

*WEBHOOK HANDLING

Vanessa sends call summaries and transcripts to:
   POST /webhook

Each payload is analyzed using OpenAI and saved as:
   - qualified_leads.json (if intent = true)
   - unqualified_leads.json (if intent = false)

The webhook also saves the full raw data file to the /logs folder for debugging.

Example of extracted data from a call:
{
  "intent": true,
  "priceRange": "$300,000",
  "timeline": "next 3 months",
  "condition": "good",
  "notes": "Homeowner is planning to sell their rental property."
}

* FRONTEND DASHBOARD

1. Navigate to the frontend directory:
   > cd dashboard-frontend

2. Install frontend dependencies:
   > npm install

3. Start the dashboard:
   > npm start

Frontend runs at:
   http://localhost:3001

NOTE: Ensure your backend server is running on port 3000. Also confirm that your Vapi assistant's webhook URL is correctly pointing to your local or tunnel URL (e.g., via Ngrok).

If you're using Ngrok, remember to update the Vapi webhook URL every time you restart Ngrok.

* DASHBOARD OVERVIEW

The dashboard displays:

- Qualified Leads: phone, price, timeline, condition  
  -- Note: Owner status is not displayed here because Vanessa handles it live during the call. She continues only if the homeowner has sole ownership. If multiple owners exist, she politely asks if they own any other property solely. If not, she respectfully ends the call.

- Unqualified Leads: phone, notes (reason for disinterest or hesitancy)

* NOT PRODUCTION READY

This is a working demo of an AI voice assistant (“Vanessa”) that can call homeowners, ask relevant questions, detect seller interest, and log the call results to a dashboard. While it works end-to-end, it is not yet suitable for production use.

To make this project production-ready, the following improvements are needed:

1. Secure your API keys
Move all secret keys (OpenAI, Vapi, Twilio, etc.) out of .env files and manage them securely using services like AWS Secrets Manager, Vercel/Netlify secrets, or GitHub Actions secrets.

2. Add authentication
Right now, anyone can access the API and dashboard. Protect the backend routes (/call, /webhook, /leads/...) and the frontend dashboard with proper user login or API authentication.

3. Use a real database
Currently, leads are stored in local .json files. For production, switch to a real database like MongoDB, PostgreSQL, or Firebase for better performance and scalability.

4. Improve frontend UI
Make the dashboard mobile-responsive, add loading/error states, and allow filtering/sorting of leads.

5. Host everything online
Instead of using ngrok and running locally, host the backend on platforms like Railway, Render, or AWS. The frontend can be hosted on Vercel or Netlify. Update the webhook URL in Vapi to your live backend URL.

6. Add logging and monitoring
Log all errors and events to a file or logging service. Add basic monitoring or alerts if webhook processing fails.

7. Add tests
Write tests for key backend functions and routes to make sure the system behaves correctly and can be updated safely.

* THANK YOU NOTE

Thank you to the team for giving me the opportunity to build and showcase this project. It allowed me to apply both engineering and product thinking, and gave me the chance to demonstrate how I approach end-to-end prototyping, design decisions, and real-time data handling.

I hope this gives you a clear idea of my capabilities. 



