// Updated version with modal-style upload popup
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
  FaUpload,
  FaCheck,
  FaTimes
} from "react-icons/fa";

const LeadsDashboard = () => {
  const [qualified, setQualified] = useState([]);
  const [unqualified, setUnqualified] = useState([]);
  const [excelFile, setExcelFile] = useState(null);
  const [uploadMessage, setUploadMessage] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showModal, setShowModal] = useState(false);
  // Single call form state
  const [showSingleCall, setShowSingleCall] = useState(false);
  const [singleCallName, setSingleCallName] = useState("");
  const [singleCallPurpose, setSingleCallPurpose] = useState("");
  const [singleCallNumber, setSingleCallNumber] = useState("");
  const [singleCallStatus, setSingleCallStatus] = useState("");
  const [singleCallLoading, setSingleCallLoading] = useState(false);

  const fetchLeads = async () => {
    try {
      const [qualifiedRes, unqualifiedRes] = await Promise.all([
        axios.get("https://venessa-project-2.onrender.com/leads/qualified"),
        axios.get("https://venessa-project-2.onrender.com/leads/unqualified"),
      ]);
      setQualified(qualifiedRes.data);
      setUnqualified(unqualifiedRes.data);
    } catch (err) {
      console.error("Failed to fetch leads:", err.message);
    }
  };

  useEffect(() => {
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
       const res = await axios.post("https://venessa-project-2.onrender.com/upload-excel", formData, {
        onUploadProgress: (progressEvent) => {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percent);
        },
      });
      setUploadMessage(<span><FaCheck style={{color:'#28a745'}} /> Started calls to {res.data.numbers.length} numbers.</span>);
      fetchLeads();
      setShowModal(false);
    } catch (err) {
      console.error("Upload failed:", err.message);
      setUploadMessage(<span><FaTimes style={{color:'#dc3545'}} /> Failed to upload/process the file.</span>);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div style={{ fontFamily: "sans-serif", padding: "2rem", background: "#f9f9f9", minHeight: "100vh" }}>
      <h1 style={{ textAlign: "center", marginBottom: "2rem", color: "#222" }}>
        <span style={{ color: "#007bff" }}>Vanessa AI</span> – Lead Dashboard
      </h1>

      {/* Disclaimer Banner */}
      <div style={{
        background: "linear-gradient(90deg, #ffecd2 0%, #fcb69f 100%)",
        color: "#222",
        borderRadius: "8px",
        padding: "1rem 2rem",
        margin: "0 auto 2rem auto",
        maxWidth: "600px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.07)",
        fontSize: "1.05rem",
        textAlign: "center",
        border: "1px solid #fcb69f"
      }}>
        <strong>Disclaimer:</strong> The features of this project were tested and verified while OpenAI API credits were available.<br />
        <span style={{ color: '#c0392b', fontWeight: 'bold' }}>Due to exhaustion of free OpenAI credits, some functionalities (Excel upload, AI-powered phone number extraction) cannot be tested further at this time.</span>
      </div>

      {/* Upload Excel & Single Call Tabs */}
      <div style={{ textAlign: "center", marginBottom: "2rem", display: "flex", justifyContent: "center", gap: "1rem" }}>
        <button
          onClick={() => { setShowModal(true); setShowSingleCall(false); }}
          style={{
            padding: "0.75rem 1.5rem",
            backgroundColor: showModal ? "#0056b3" : "#007bff",
            color: "#fff",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
            fontSize: "1rem",
            fontWeight: showModal ? "bold" : "normal"
          }}
        >
          Upload Excel File
        </button>
        <button
          onClick={() => { setShowSingleCall(true); setShowModal(false); }}
          style={{
            padding: "0.75rem 1.5rem",
            backgroundColor: showSingleCall ? "#0056b3" : "#007bff",
            color: "#fff",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
            fontSize: "1rem",
            fontWeight: showSingleCall ? "bold" : "normal"
          }}
        >
          Place Single Call
        </button>
      </div>
      {/* Single Call Modal */}
      {showSingleCall && (
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
            <h2 style={{ marginBottom: "1rem", textAlign: "center" }}>Place Single Call</h2>
            <form onSubmit={async (e) => {
              e.preventDefault();
              setSingleCallStatus("");
              setSingleCallLoading(true);
              try {
                const res = await axios.post("https://venessa-project-2.onrender.com/single-call", {
                  name: singleCallName,
                  purpose: singleCallPurpose,
                  number: singleCallNumber
                });
                setSingleCallStatus(<span><FaCheck style={{color:'#28a745'}} /> Call placed for {singleCallName} ({singleCallNumber})</span>);
                setSingleCallName("");
                setSingleCallPurpose("");
                setSingleCallNumber("");
              } catch (err) {
                setSingleCallStatus(<span><FaTimes style={{color:'#dc3545'}} /> Failed to place call.</span>);
              } finally {
                setSingleCallLoading(false);
              }
            }}>
              <div style={{ marginBottom: "1rem" }}>
                <label>Name:</label><br />
                <input type="text" value={singleCallName} onChange={e => setSingleCallName(e.target.value)} required style={{ width: "100%", padding: "0.5rem" }} />
              </div>
              <div style={{ marginBottom: "1rem" }}>
                <label>Purpose of Visit:</label><br />
                <input type="text" value={singleCallPurpose} onChange={e => setSingleCallPurpose(e.target.value)} required style={{ width: "100%", padding: "0.5rem" }} />
              </div>
              <div style={{ marginBottom: "1rem" }}>
                <label>Phone Number:</label><br />
                <input type="tel" value={singleCallNumber} onChange={e => setSingleCallNumber(e.target.value)} required style={{ width: "100%", padding: "0.5rem" }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <button type="submit" disabled={singleCallLoading} style={{
                  padding: "0.5rem 1rem",
                  backgroundColor: "#007bff",
                  color: "#fff",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}>Place Call</button>
                <button type="button" onClick={() => setShowSingleCall(false)} style={{
                  padding: "0.5rem 1rem",
                  backgroundColor: "#ccc",
                  color: "#000",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}>Cancel</button>
              </div>
              {singleCallStatus && (
                <p style={{ marginTop: "1rem" }}>{singleCallStatus}</p>
              )}
            </form>
          </div>
        </div>
      )}

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
              <p style={{ marginTop: "1rem" }}>
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
                  <th style={thStyle}><FaPhone color="#007bff" /> Phone</th>
                  <th style={thStyle}><FaMoneyBillWave color="#28a745" /> Price</th>
                  <th style={thStyle}><FaClock color="#ffc107" /> Timeline</th>
                  <th style={thStyle}><FaHome color="#17a2b8" /> Condition</th>
                </tr>
              </thead>
              <tbody>
                {qualified.map((lead, index) => (
                  <tr key={index} style={index % 2 === 0 ? rowEven : rowOdd}>
                    <td style={tdStyle}>{lead.number}</td>
                    <td style={{ ...tdStyle, color: "#28a745" }}>{lead.priceRange || "—"}</td>
                    <td style={{ ...tdStyle, color: "#555" }}>{lead.timeline || "—"}</td>
                    <td style={{ ...tdStyle, color: "#17a2b8" }}>{lead.condition || "N/A"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

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
                  <th style={thStyle}><FaPhone color="#007bff" /> Phone</th>
                  <th style={thStyle}><FaStickyNote color="#dc3545" /> Notes</th>
                </tr>
              </thead>
              <tbody>
                {unqualified.map((lead, index) => (
                  <tr key={index} style={index % 2 === 0 ? rowEven : rowOdd}>
                    <td style={tdStyle}>{lead.number}</td>
                    <td style={{ ...tdStyle, color: "#dc3545" }}>{lead.notes || "—"}</td>
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

const cardStyle = {
  flex: 1,
  minWidth: "320px",
  background: "#fff",
  borderRadius: "8px",
  padding: "1.5rem",
  boxShadow: "0 4px 8px rgba(0,0,0,0.05)"
};

const headingStyle = {
  display: "flex",
  alignItems: "center",
  gap: "0.5rem",
  marginBottom: "1rem",
  borderBottom: "1px solid #e0e0e0",
  paddingBottom: "0.5rem"
};

const tableStyle = {
  width: "100%",
  marginTop: "1rem",
  borderCollapse: "collapse"
};

const thStyle = {
  padding: "10px",
  borderBottom: "2px solid #ccc",
  textAlign: "left",
  fontWeight: "bold",
  fontSize: "0.95rem"
};

const tdStyle = {
  padding: "10px",
  borderBottom: "1px solid #eee",
  fontSize: "0.95rem"
};

const rowEven = { backgroundColor: "#fafafa" };
const rowOdd = { backgroundColor: "#ffffff" };

export default LeadsDashboard;
