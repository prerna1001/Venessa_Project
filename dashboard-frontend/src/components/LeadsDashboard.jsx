import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  FaPhone,
  FaMoneyBillWave,
  FaClock,
  FaStickyNote,
  FaCheckCircle,
  FaTimesCircle,
  FaHome,
} from "react-icons/fa";

//Main dashboard component to display leads received from backend (Venessa AI)
const LeadsDashboard = () => {

  //State hooks for both qualified and unqualified leads
  const [qualified, setQualified] = useState([]);
  const [unqualified, setUnqualified] = useState([]);

  //Fetch leads from backend APIs
  const fetchLeads = async () => {
    try {
      //Fetching both qualified and unqualified leads concurrently
      const [qualifiedRes, unqualifiedRes] = await Promise.all([
        axios.get("http://localhost:3000/leads/qualified"),
        axios.get("http://localhost:3000/leads/unqualified"),
      ]);
      //Updating state with fetched data
      setQualified(qualifiedRes.data);
      setUnqualified(unqualifiedRes.data);
    } catch (err) {
      console.error("Failed to fetch leads:", err.message);
    }
  };

  useEffect(() => {
    fetchLeads(); // Fetch data once on initial load
  }, []);

  return (
    <div
      style={{
        fontFamily: "sans-serif",
        padding: "2rem",
        background: "#f9f9f9",
        minHeight: "100vh",
      }}
    >
      <h1
        style={{
          textAlign: "center",
          marginBottom: "2rem",
          color: "#222",
        }}
      >
        <span style={{ color: "#007bff" }}>Vanessa AI</span> – Lead Dashboard
      </h1>

      <div
        style={{
          display: "flex",
          justifyContent: "space-around",
          flexWrap: "wrap",
          gap: "2rem",
        }}
      >
        {/* Qualified Leads */}
        <div style={cardStyle}>
          <h2 style={{ ...headingStyle, color: "#28a745" }}>
            <FaCheckCircle color="#28a745" /> Qualified Leads
          </h2>
          {qualified.length === 0 ? (
            <p>No qualified leads yet.</p>
          ) : (
            <table style={tableStyle}>
              <thead>
                <tr style={{ backgroundColor: "#e9f7ef" }}>
                  <th style={thStyle}>
                    <FaPhone color="#007bff" /> Phone
                  </th>
                  <th style={thStyle}>
                    <FaMoneyBillWave color="#28a745" /> Price
                  </th>
                  <th style={thStyle}>
                    <FaClock color="#ffc107" /> Timeline
                  </th>
                  <th style={thStyle}>
                    <FaHome color="#17a2b8" /> Condition
                  </th>
                </tr>
              </thead>
              <tbody>
                {qualified.map((lead, index) => (
                  <tr key={index} style={index % 2 === 0 ? rowEven : rowOdd}>
                    <td style={tdStyle}>{lead.number}</td>
                    <td style={{ ...tdStyle, color: "#28a745" }}>
                      {lead.priceRange || "—"}
                    </td>
                    <td style={{ ...tdStyle, color: "#555" }}>
                      {lead.timeline || "—"}
                    </td>
                    <td style={{ ...tdStyle, color: "#17a2b8" }}>
                      {lead.condition || "N/A"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Unqualified Leads */}
        <div style={cardStyle}>
          <h2 style={{ ...headingStyle, color: "#dc3545" }}>
            <FaTimesCircle color="#dc3545" /> Unqualified Leads
          </h2>
          {unqualified.length === 0 ? (
            <p>No unqualified leads yet.</p>
          ) : (
            <table style={tableStyle}>
              <thead>
                <tr style={{ backgroundColor: "#fcebea" }}>
                  <th style={thStyle}>
                    <FaPhone color="#007bff" /> Phone
                  </th>
                  <th style={thStyle}>
                    <FaStickyNote color="#dc3545" /> Notes
                  </th>
                </tr>
              </thead>
              <tbody>
                {unqualified.map((lead, index) => (
                  <tr key={index} style={index % 2 === 0 ? rowEven : rowOdd}>
                    <td style={tdStyle}>{lead.number}</td>
                    <td style={{ ...tdStyle, color: "#dc3545" }}>
                      {lead.notes || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

// Reusable styling objects

//Card container (for both lead types)
const cardStyle = {
  flex: 1,
  minWidth: "320px",
  background: "#fff",
  borderRadius: "8px",
  padding: "1.5rem",
  boxShadow: "0 4px 8px rgba(0,0,0,0.05)",
};

//Section heading (icon + title)
const headingStyle = {
  display: "flex",
  alignItems: "center",
  gap: "0.5rem",
  marginBottom: "1rem",
  borderBottom: "1px solid #e0e0e0",
  paddingBottom: "0.5rem",
};

//Shared table styles
const tableStyle = {
  width: "100%",
  marginTop: "1rem",
  borderCollapse: "collapse",
};

//Table header cell styles
const thStyle = {
  padding: "10px",
  borderBottom: "2px solid #ccc",
  textAlign: "left",
  fontWeight: "bold",
  fontSize: "0.95rem",
};

//Table data cell styles
const tdStyle = {
  padding: "10px",
  borderBottom: "1px solid #eee",
  fontSize: "0.95rem",
};

//Alternating row colors for better readability
const rowEven = {
  backgroundColor: "#fafafa",
};

const rowOdd = {
  backgroundColor: "#ffffff",
};

export default LeadsDashboard;
