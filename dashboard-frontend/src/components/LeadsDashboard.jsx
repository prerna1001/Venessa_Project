<<<<<<< HEAD
=======
// Updated version with modal-style upload popup
>>>>>>> e0bd3ca (Initial commit - Vanessa Voice AI prototype)
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
<<<<<<< HEAD
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
=======
  FaUpload,
} from "react-icons/fa";

const LeadsDashboard = () => {
  const [qualified, setQualified] = useState([]);
  const [unqualified, setUnqualified] = useState([]);
  const [excelFile, setExcelFile] = useState(null);
  const [uploadMessage, setUploadMessage] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showModal, setShowModal] = useState(false);

  const fetchLeads = async () => {
    try {
>>>>>>> e0bd3ca (Initial commit - Vanessa Voice AI prototype)
      const [qualifiedRes, unqualifiedRes] = await Promise.all([
        axios.get("http://localhost:3000/leads/qualified"),
        axios.get("http://localhost:3000/leads/unqualified"),
      ]);
<<<<<<< HEAD
      //Updating state with fetched data
=======
>>>>>>> e0bd3ca (Initial commit - Vanessa Voice AI prototype)
      setQualified(qualifiedRes.data);
      setUnqualified(unqualifiedRes.data);
    } catch (err) {
      console.error("Failed to fetch leads:", err.message);
    }
  };

  useEffect(() => {
<<<<<<< HEAD
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
=======
    fetchLeads();
  }, []);

  const handleFileChange = (e) => {
    setExcelFile(e.target.files[0]);
    setUploadMessage("");
    setUploadProgress(0);
  };

  const handleStartCalling = async () => {
    if (!excelFile) {
      alert("Please upload a file first.");
      return;
    }

    const formData = new FormData();
    formData.append("file", excelFile);

    try {
      setIsUploading(true);
      setUploadMessage("Uploading and processing...");
      const res = await axios.post("http://localhost:3000/upload-excel", formData, {
        onUploadProgress: (progressEvent) => {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percent);
        },
      });
      setUploadMessage(`✅ Started calls to ${res.data.numbers.length} numbers.`);
      fetchLeads();
      setShowModal(false);
    } catch (err) {
      console.error("Upload failed:", err.message);
      setUploadMessage("❌ Failed to upload/process the file.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div style={{ fontFamily: "sans-serif", padding: "2rem", background: "#f9f9f9", minHeight: "100vh" }}>
      <h1 style={{ textAlign: "center", marginBottom: "2rem", color: "#222" }}>
        <span style={{ color: "#007bff" }}>Vanessa AI</span> – Lead Dashboard
      </h1>

      {/* Modal-style Upload Trigger */}
      <div style={{ textAlign: "center", marginBottom: "2rem" }}>
        <button
          onClick={() => setShowModal(true)}
          style={{
            padding: "0.75rem 1.5rem",
            backgroundColor: "#007bff",
            color: "#fff",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
            fontSize: "1rem",
          }}
        >
          Upload Excel File
        </button>
      </div>

      {showModal && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          backgroundColor: "rgba(0, 0, 0, 0.4)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 1000,
        }}>
          <div style={{ background: "#fff", padding: "2rem", borderRadius: "10px", width: "400px" }}>
            <h2 style={{ marginBottom: "1rem", textAlign: "center" }}>Add Excel File</h2>
            <div
              style={{
                border: "2px dashed #ccc",
                padding: "1.5rem",
                textAlign: "center",
                borderRadius: "8px",
                backgroundColor: "#fdfdfd",
                marginBottom: "1rem",
              }}
            >
              <input type="file" accept=".xlsx" onChange={handleFileChange} />
              <p style={{ fontSize: "0.85rem", color: "#666" }}>
                Drag and drop or browse. Only .xlsx accepted.
              </p>
            </div>

            {excelFile && <p><strong>Selected:</strong> {excelFile.name}</p>}

            {isUploading && (
              <div style={{ marginTop: "1rem" }}>
                <div style={{ height: "10px", background: "#eee", borderRadius: "4px", overflow: "hidden" }}>
                  <div style={{ width: `${uploadProgress}%`, background: "#007bff", height: "100%" }} />
                </div>
                <p style={{ fontSize: "0.85rem", color: "#555" }}>{uploadProgress}% uploaded</p>
              </div>
            )}

            {uploadMessage && (
              <p style={{ marginTop: "1rem", color: uploadMessage.includes("❌") ? "#dc3545" : "#28a745" }}>
                {uploadMessage}
              </p>
            )}

            <div style={{ marginTop: "1rem", display: "flex", justifyContent: "space-between" }}>
              <button
                onClick={handleStartCalling}
                disabled={!excelFile || isUploading}
                style={{
                  padding: "0.5rem 1rem",
                  backgroundColor: "#007bff",
                  color: "#fff",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                Upload & Start
              </button>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  padding: "0.5rem 1rem",
                  backgroundColor: "#ccc",
                  color: "#000",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rest of the dashboard: Qualified and Unqualified Leads */}
      <div style={{ display: "flex", justifyContent: "space-around", flexWrap: "wrap", gap: "2rem" }}>
>>>>>>> e0bd3ca (Initial commit - Vanessa Voice AI prototype)
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
<<<<<<< HEAD
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
=======
                  <th style={thStyle}><FaPhone color="#007bff" /> Phone</th>
                  <th style={thStyle}><FaMoneyBillWave color="#28a745" /> Price</th>
                  <th style={thStyle}><FaClock color="#ffc107" /> Timeline</th>
                  <th style={thStyle}><FaHome color="#17a2b8" /> Condition</th>
>>>>>>> e0bd3ca (Initial commit - Vanessa Voice AI prototype)
                </tr>
              </thead>
              <tbody>
                {qualified.map((lead, index) => (
                  <tr key={index} style={index % 2 === 0 ? rowEven : rowOdd}>
                    <td style={tdStyle}>{lead.number}</td>
<<<<<<< HEAD
                    <td style={{ ...tdStyle, color: "#28a745" }}>
                      {lead.priceRange || "—"}
                    </td>
                    <td style={{ ...tdStyle, color: "#555" }}>
                      {lead.timeline || "—"}
                    </td>
                    <td style={{ ...tdStyle, color: "#17a2b8" }}>
                      {lead.condition || "N/A"}
                    </td>
=======
                    <td style={{ ...tdStyle, color: "#28a745" }}>{lead.priceRange || "—"}</td>
                    <td style={{ ...tdStyle, color: "#555" }}>{lead.timeline || "—"}</td>
                    <td style={{ ...tdStyle, color: "#17a2b8" }}>{lead.condition || "N/A"}</td>
>>>>>>> e0bd3ca (Initial commit - Vanessa Voice AI prototype)
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

<<<<<<< HEAD
        {/* Unqualified Leads */}
=======
>>>>>>> e0bd3ca (Initial commit - Vanessa Voice AI prototype)
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
<<<<<<< HEAD
                  <th style={thStyle}>
                    <FaPhone color="#007bff" /> Phone
                  </th>
                  <th style={thStyle}>
                    <FaStickyNote color="#dc3545" /> Notes
                  </th>
=======
                  <th style={thStyle}><FaPhone color="#007bff" /> Phone</th>
                  <th style={thStyle}><FaStickyNote color="#dc3545" /> Notes</th>
>>>>>>> e0bd3ca (Initial commit - Vanessa Voice AI prototype)
                </tr>
              </thead>
              <tbody>
                {unqualified.map((lead, index) => (
                  <tr key={index} style={index % 2 === 0 ? rowEven : rowOdd}>
                    <td style={tdStyle}>{lead.number}</td>
<<<<<<< HEAD
                    <td style={{ ...tdStyle, color: "#dc3545" }}>
                      {lead.notes || "—"}
                    </td>
=======
                    <td style={{ ...tdStyle, color: "#dc3545" }}>{lead.notes || "—"}</td>
>>>>>>> e0bd3ca (Initial commit - Vanessa Voice AI prototype)
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

<<<<<<< HEAD
// Reusable styling objects

//Card container (for both lead types)
=======
>>>>>>> e0bd3ca (Initial commit - Vanessa Voice AI prototype)
const cardStyle = {
  flex: 1,
  minWidth: "320px",
  background: "#fff",
  borderRadius: "8px",
  padding: "1.5rem",
<<<<<<< HEAD
  boxShadow: "0 4px 8px rgba(0,0,0,0.05)",
};

//Section heading (icon + title)
=======
  boxShadow: "0 4px 8px rgba(0,0,0,0.05)"
};

>>>>>>> e0bd3ca (Initial commit - Vanessa Voice AI prototype)
const headingStyle = {
  display: "flex",
  alignItems: "center",
  gap: "0.5rem",
  marginBottom: "1rem",
  borderBottom: "1px solid #e0e0e0",
<<<<<<< HEAD
  paddingBottom: "0.5rem",
};

//Shared table styles
const tableStyle = {
  width: "100%",
  marginTop: "1rem",
  borderCollapse: "collapse",
};

//Table header cell styles
=======
  paddingBottom: "0.5rem"
};

const tableStyle = {
  width: "100%",
  marginTop: "1rem",
  borderCollapse: "collapse"
};

>>>>>>> e0bd3ca (Initial commit - Vanessa Voice AI prototype)
const thStyle = {
  padding: "10px",
  borderBottom: "2px solid #ccc",
  textAlign: "left",
  fontWeight: "bold",
<<<<<<< HEAD
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
=======
  fontSize: "0.95rem"
};

const tdStyle = {
  padding: "10px",
  borderBottom: "1px solid #eee",
  fontSize: "0.95rem"
};

const rowEven = { backgroundColor: "#fafafa" };
const rowOdd = { backgroundColor: "#ffffff" };
>>>>>>> e0bd3ca (Initial commit - Vanessa Voice AI prototype)

export default LeadsDashboard;
