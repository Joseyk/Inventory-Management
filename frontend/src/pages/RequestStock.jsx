import React, { useState, useEffect, useCallback, useMemo } from "react";
import Notification from "../components/Notification";
import Actions from "../components/Actions";
import SkeletonRow from "../components/SkeletonRow";
import Pagination from "../components/Pagination";
import "../styles/RequestStock.css";
import "../styles/Requests.css";

const API_BASE = import.meta.env.VITE_API_URL;

const RequestStock = ({ role }) => {
  const [formData, setFormData] = useState({ item_name: "", quantity: "" });
  const [requests, setRequests] = useState([]);
  const [notify, setNotify] = useState({ message: "", type: "" });
  const [loading, setLoading] = useState(false);
  const [tableLoading, setTableLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  const currentRole = role ? role.toLowerCase().replace(/\s+/g, "_") : "";
  const currentUsername = localStorage.getItem("username") || "";
  const isAdminOrStore = currentRole === "admin" || currentRole === "store";

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

  const fetchRequests = useCallback(async () => {
    setTableLoading(true);
    try {
      const res = await fetch(`${API_BASE}/stock-requests`, {
        credentials: "include",
      });
      const data = await res.json();
      setRequests(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error fetching requests:", err);
      setRequests([]);
    } finally {
      setTableLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/stock-requests/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ...formData,
          branch: localStorage.getItem("branch") || "Global",
        }),
      });

      if (res.ok) {
        setNotify({
          message: "Stock request submitted successfully!",
          type: "success",
        });
        setFormData({ item_name: "", quantity: "" });
        fetchRequests();
      } else {
        const data = await res.json();
        setNotify({
          message: data.error || "Submission failed.",
          type: "error",
        });
      }
    } catch (err) {
      setNotify({ message: "Network error.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id, newStatus, itemName) => {
    setIsUpdating(id);
    try {
      const res = await fetch(`${API_BASE}/stock-requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          status: newStatus,
          action_by: currentUsername,
        }),
      });

      if (res.ok) {
        setNotify({
          message: `${itemName} request ${newStatus.toLowerCase()}d!`,
          type: "success",
        });
        fetchRequests();
      } else {
        const data = await res.json();
        setNotify({
          message: data.error || "Update failed.",
          type: "error",
        });
      }
    } catch (err) {
      setNotify({ message: "Network error.", type: "error" });
    } finally {
      setIsUpdating(null);
    }
  };

  const filteredRequests = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return requests.filter(
      (req) =>
        (req.item_name?.toLowerCase() || "").includes(term) ||
        (req.username?.toLowerCase() || "").includes(term),
    );
  }, [requests, searchTerm]);

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentRequests = filteredRequests.slice(
    indexOfFirstItem,
    indexOfLastItem,
  );

  return (
    <div className="dashboard-content-wrapper">
      <Notification
        message={notify.message}
        type={notify.type}
        onClose={() => setNotify({ message: "", type: "" })}
      />

      {isAdminOrStore && (
        <section className="table-section-card">
          <div className="table-header">
            <div>
              <h2>Request Stock Item</h2>
              <p className="sub-text">
                Enter details to request new stock for your branch.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="item-form">
            <input
              type="text"
              placeholder="Item Name (e.g. A4 Paper)"
              value={formData.item_name}
              onChange={(e) =>
                setFormData({ ...formData, item_name: e.target.value })
              }
              required
            />
            <input
              type="number"
              placeholder="Quantity"
              value={formData.quantity}
              onChange={(e) =>
                setFormData({ ...formData, quantity: e.target.value })
              }
              required
              min="1"
            />
            <button type="submit" className="add-btn" disabled={loading}>
              {loading ? "Processing..." : "Submit Request"}
            </button>
          </form>
        </section>
      )}

      <section className="table-section-card">
        <div className="table-header">
          <div>
            <h2>Stock Request Workflow</h2>
            <p className="sub-text">
              Monitor and manage stock requests based on your role.
            </p>
          </div>
          <input
            type="text"
            placeholder="Search by Item or User..."
            className="table-search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="table-responsive-container">
          <table className="custom-dashboard-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Requested By</th>
                <th>Item Name</th>
                <th>Quantity</th>
                <th>Status</th>
                <th>Approved By</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tableLoading ? (
                [...Array(5)].map((_, i) => <SkeletonRow key={i} />)
              ) : currentRequests.length > 0 ? (
                currentRequests.map((req) => {
                  const status = req.status;
                  const isPending = status === "Pending";
                  const canApprove =
                    currentRole === "admin" ||
                    currentRole === "hr_available" ||
                    currentRole === "hr_purchase";

                  const displayDate = formatDateDisplay(req.created_at);

                  return (
                    <tr
                      key={req.id}
                      className={isUpdating === req.id ? "row-loading" : ""}
                    >
                      <td className="registration-time-cell">
                        <div>
                          <span className="date-main">{displayDate.date}</span>
                          <span className="time-sub">{displayDate.time}</span>
                        </div>
                      </td>
                      <td>
                        <strong>{req.username}</strong>
                      </td>
                      <td>{req.item_name}</td>
                      <td>
                        <span className="qty-added-badge qty-pos">
                          {req.quantity}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`status-pill pill-${status.toLowerCase()}`}
                        >
                          {status}
                        </span>
                      </td>
                      <td className="approved-by-cell">
                        {req.action_by || "—"}
                      </td>
                      <td className="action-cell">
                        <div className="qty-controls">
                          {isPending && canApprove && (
                            <>
                              <Actions
                                label="Approve"
                                className="req-purchase"
                                message={`Approve ${req.quantity} x ${req.item_name}?`}
                                onConfirm={() =>
                                  updateStatus(
                                    req.id,
                                    "Approved",
                                    req.item_name,
                                  )
                                }
                              />
                              <Actions
                                label="Reject"
                                className="req-reject"
                                message={`Reject ${req.quantity} x ${req.item_name}?`}
                                onConfirm={() =>
                                  updateStatus(
                                    req.id,
                                    "Rejected",
                                    req.item_name,
                                  )
                                }
                              />
                            </>
                          )}
                          {(status === "Approved" || status === "Rejected") && (
                            <span className="completed-label">Closed</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="7" className="no-results-text">
                    No request records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {!tableLoading && filteredRequests.length > 0 && (
            <Pagination
              currentPage={currentPage}
              totalItems={filteredRequests.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
            />
          )}
        </div>
      </section>
    </div>
  );
};

export default RequestStock;
