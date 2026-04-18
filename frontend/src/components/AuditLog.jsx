import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import SkeletonRow from "../components/SkeletonRow";
import Pagination from "../components/Pagination";
import "../styles/ManageInventory.css";
import "../styles/Dashboard.css";

const API_BASE = import.meta.env.VITE_API_URL;

const AuditLog = ({ role }) => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  const formatDateDisplay = (dateString) => {
    if (!dateString) return { date: "—", time: "" };
    const dateObj = new Date(dateString);
    if (isNaN(dateObj)) return { date: "—", time: "" };

    return {
      date: dateObj.toLocaleDateString("en-GB"),
      time: dateObj.toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };
  };

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await fetch(`${API_BASE}/logs`, {
          credentials: "include",
        });

        if (res.status === 401) {
          setError("Unauthorized: Admin access required.");
          setLoading(false);
          return;
        }

        if (!res.ok) throw new Error("Failed to fetch logs");

        setDataLoading(true);
        const data = await res.json();
        setLogs(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Fetch Error:", err);
        setError("Could not load logs. Please check your connection.");
      } finally {
        setLoading(false);
        setTimeout(() => setDataLoading(false), 500);
      }
    };

    fetchLogs();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const filteredLogs = logs.filter((log) => {
    const term = searchTerm.toLowerCase();
    return (
      log.item_name?.toLowerCase().includes(term) ||
      log.action_type?.toLowerCase().includes(term) ||
      log.siv_no?.toLowerCase().includes(term) ||
      log.changed_by?.toLowerCase().includes(term)
    );
  });

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentLogs = filteredLogs.slice(indexOfFirstItem, indexOfLastItem);

  if (loading && !dataLoading)
    return (
      <div className="loading-container">
        <h2>🔐 Verifying Administrator...</h2>
      </div>
    );

  if (error)
    return (
      <div className="error-container">
        <h2>Access Denied</h2>
        <p>{error}</p>
        <button onClick={() => (window.location.href = "/dashboard")}>
          Return to Dashboard
        </button>
      </div>
    );

  return (
    <div className="dashboard-content-wrapper">
      <section className="table-section-card">
        <div className="table-header">
          <div>
            <h2 className="table-header">System Audit Trail</h2>
            <p className="sub-text">History of all inventory movements</p>
          </div>
          <div className="table-controls">
            <input
              type="text"
              placeholder="Search by item, SIV, or user..."
              className="table-search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="table-responsive-container">
          <table className="custom-dashboard-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Action</th>
                <th>Item Name</th>
                <th>Stock Change</th>
                <th>SIV Ref</th>
                <th>Performed By</th>
              </tr>
            </thead>
            <tbody>
              {dataLoading ? (
                [...Array(10)].map((_, index) => (
                  <SkeletonRow key={index} isAuditPage={true} />
                ))
              ) : currentLogs.length > 0 ? (
                currentLogs.map((log) => {
                  const change = log.new_quantity - log.old_quantity;
                  const displayChange =
                    change > 0 ? `+${change}` : change < 0 ? `${change}` : "0";

                  const displayDate = formatDateDisplay(
                    log.created_at || log.timestamp,
                  );

                  return (
                    <tr key={log.id}>
                      <td className="registration-time-cell">
                        <div>
                          <span className="date-main">{displayDate.date}</span>
                          <span className="time-sub">{displayDate.time}</span>
                        </div>
                      </td>
                      <td>
                        <span
                          className={`action-pill ${log.action_type.toLowerCase()}`}
                        >
                          {log.action_type}
                        </span>
                      </td>
                      <td>
                        <strong>{log.item_name}</strong>
                      </td>
                      <td>
                        <span
                          className={`qty-change-badge ${
                            change > 0
                              ? "text-positive"
                              : change < 0
                                ? "text-negative"
                                : ""
                          }`}
                        >
                          {displayChange}
                        </span>
                      </td>
                      <td>
                        <code
                          className="siv-pill"
                          style={{
                            backgroundColor: "#e6fffa",
                            color: "#008080",
                            padding: "4px 8px",
                            borderRadius: "4px",
                          }}
                        >
                          {log.siv_no || "N/A"}
                        </code>
                      </td>
                      <td>{log.changed_by}</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="6" className="no-results-text">
                    {searchTerm
                      ? `No logs match "${searchTerm}"`
                      : "No logs recorded yet."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {!dataLoading && filteredLogs.length > 0 && (
            <Pagination
              currentPage={currentPage}
              totalItems={filteredLogs.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
            />
          )}
        </div>
      </section>
    </div>
  );
};

export default AuditLog;
