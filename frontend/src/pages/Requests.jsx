import React, { useState, useEffect } from "react";
import Notification from "../components/Notification";
import Actions from "../components/Actions";
import SkeletonRow from "../components/SkeletonRow";
import Pagination from "../components/Pagination";
import "../styles/Requests.css";

const API_BASE = import.meta.env.VITE_API_URL;

const Requests = ({ role }) => {
  const [requests, setRequests] = useState([]);
  const [notify, setNotify] = useState({ message: "", type: "" });
  const [isUpdating, setIsUpdating] = useState(null);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");
  const [showSivModal, setShowSivModal] = useState(false);
  const [sivData, setSivData] = useState({
    id: null,
    siv_no: "",
    item_id: null,
    request_type: "",
    item_name: "",
    quantity: null,
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5);

  const REQUESTS_API = `${API_BASE}/requests`;

  const currentRole = role ? role.toLowerCase().replace(/\s+/g, "_") : "";
  const currentUsername = localStorage.getItem("username") || "";
  const userBranch = localStorage.getItem("branch") || "";

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const authorizedRoles = [
        "admin",
        "store",
        "hr_available",
        "hr_purchase",
        "office_admin",
      ];
      const canSeeAll = authorizedRoles.includes(currentRole);

      const fetchUrl = canSeeAll
        ? `${API_BASE}/requests`
        : `${API_BASE}/requests/user/${currentUsername}`;

      const res = await fetch(fetchUrl, { credentials: "include" });
      const data = await res.json();

      if (res.ok && Array.isArray(data)) {
        if (currentRole === "office_admin") {
          const branchRequests = data.filter(
            (req) => req.branch?.toLowerCase() === userBranch.toLowerCase(),
          );
          setRequests(branchRequests);
        } else {
          setRequests(data);
        }
      } else {
        setRequests([]);
        if (res.status === 401) {
          setNotify({
            message: "Session expired. Redirecting...",
            type: "error",
          });
          setTimeout(() => {
            window.location.href = "/login";
          }, 2000);
        }
      }
    } catch (err) {
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [role, userBranch]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const handleSivSubmit = (e) => {
    e.preventDefault();
    if (!sivData.siv_no.trim()) {
      setNotify({ message: "SIV number is required.", type: "error" });
      return;
    }
    setShowSivModal(false);
    updateStatus(
      sivData.id,
      "Released",
      sivData.item_id,
      sivData.request_type,
      sivData.item_name,
      sivData.quantity,
      sivData.siv_no,
    );
  };

  const updateStatus = async (
    id,
    newStatus,
    item_id,
    request_type,
    item_name,
    quantity,
    siv_no = null,
  ) => {
    setIsUpdating(id);
    const timestamp = new Date().toLocaleString("en-GB", {
      dateStyle: "short",
      timeStyle: "short",
    });

    const updateData = {
      status: newStatus,
      item_id: item_id,
      action_by: currentUsername,
      siv_no: siv_no,
      request_type: request_type,
      quantity_requested: quantity,
    };

    if (newStatus === "Released") {
      updateData.released_at = timestamp;
      updateData.item_name = item_name;
      updateData.released_by = currentUsername;
    }
    if (newStatus === "Accepted") {
      updateData.accepted_at = timestamp;
      updateData.accepted_by = currentUsername;
    }
    if (newStatus === "Approved") {
      updateData.approved_at = timestamp;
      updateData.approved_by = currentUsername;
    }
    if (newStatus === "Rejected") {
      updateData.rejected_at = timestamp;
      updateData.rejected_by = currentUsername;
    }
    if (newStatus === "Canceled") {
      updateData.canceled = timestamp;
    }

    try {
      const url =
        newStatus === "Released"
          ? `${REQUESTS_API}/release/${id}`
          : `${REQUESTS_API}/${id}`;

      const res = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(updateData),
      });

      if (res.ok) {
        setNotify({
          message: `Request successfully ${newStatus}`,
          type: "success",
        });
        await fetchRequests();
      } else {
        const errData = await res.json();
        setNotify({
          message: errData.error || "Update failed.",
          type: "error",
        });
      }
    } catch (err) {
      setNotify({ message: "Network error.", type: "error" });
    } finally {
      setIsUpdating(null);
    }
  };

  const handleCancel = async (id) => {
    const targetRequest = requests.find((r) => r.id === id);
    if (targetRequest && targetRequest.status !== "Pending") {
      setNotify({
        message: `Cannot cancel. Already ${targetRequest.status.toLowerCase()}.`,
        type: "error",
      });
      return;
    }
    setIsUpdating(id);
    const timestamp = new Date().toLocaleString("en-GB", {
      dateStyle: "short",
      timeStyle: "short",
    });
    try {
      const res = await fetch(`${REQUESTS_API}/cancel/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          rejected_at: timestamp,
          rejected_by: currentUsername,
        }),
      });
      if (res.ok) {
        setNotify({ message: "Request Canceled.", type: "success" });
        await fetchRequests();
      }
    } catch (err) {
      setNotify({ message: "Error during Cancellation", type: "error" });
    } finally {
      setIsUpdating(null);
    }
  };

  const filteredRequests = requests.filter((req) => {
    const term = searchTerm.toLowerCase();
    return (
      req.item_name?.toLowerCase().includes(term) ||
      req.username?.toLowerCase().includes(term) ||
      req.siv_no?.toLowerCase().includes(term) ||
      req.branch?.toLowerCase().includes(term)
    );
  });

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredRequests.slice(
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

      <section className="table-section-card">
        <div className="table-header">
          <h2>
            {currentRole === "office_admin"
              ? `Branch/Dept: ${userBranch}`
              : "Inventory Workflow"}
          </h2>
          <div className="table-controls">
            <input
              type="text"
              placeholder="Search requests..."
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
                <th>Request Date</th>
                <th>Branch / Dept</th>
                <th>Requested by</th>
                <th>Item Details</th>
                <th>Qty</th>
                <th>SIV No.</th>
                <th>Status</th>
                <th>Action By</th>
                <th>Workflow Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <>
                  <SkeletonRow columns={10} />
                  <SkeletonRow columns={10} />
                  <SkeletonRow columns={10} />
                  <SkeletonRow columns={10} />
                  <SkeletonRow columns={10} />
                </>
              ) : filteredRequests.length === 0 ? (
                <tr>
                  <td
                    colSpan="10"
                    style={{
                      textAlign: "center",
                      padding: "3rem",
                      color: "#888",
                    }}
                  >
                    No requests found.
                  </td>
                </tr>
              ) : (
                currentItems.map((req) => {
                  const status = req.status;
                  const isPurchase = req.request_type === "Purchase Request";
                  const isOwner =
                    req.username?.toLowerCase().trim() ===
                    currentUsername?.toLowerCase().trim();

                  const itemExists =
                    req.current_stock !== null &&
                    req.current_stock !== undefined;

                  const dateParts = req.created_at
                    ? new Date(req.created_at)
                        .toLocaleString("en-GB")
                        .split(", ")
                    : ["—", ""];

                  let displayUser = "Not Approved Yet";
                  if (status === "Canceled") displayUser = req.username;
                  else if (req.rejected_by) displayUser = req.rejected_by;
                  else if (req.released_by) displayUser = req.released_by;
                  else if (req.approved_by) displayUser = req.approved_by;
                  else if (req.accepted_by) displayUser = req.accepted_by;

                  return (
                    <tr
                      key={req.id}
                      className={isUpdating === req.id ? "row-loading" : ""}
                    >
                      <td className="registration-time-cell">
                        <div>
                          <span className="date-main">{dateParts[0]}</span>
                          <span className="time-sub">{dateParts[1]}</span>
                        </div>
                      </td>
                      <td>
                        <span className="item-category-pill">
                          {req.branch || "Global"}
                        </span>
                      </td>
                      <td>
                        <strong>{req.username}</strong>
                      </td>
                      <td>
                        <div className="item-info-cell">
                          <strong>{req.item_name}</strong>
                          <div className="item-specs">
                            {!itemExists ? (
                              <span
                                className="status-pill pill-rejected"
                                style={{ fontSize: "10px" }}
                              >
                                ITEM NOT AVAILABLE
                              </span>
                            ) : (
                              <span
                                className={`type-tag ${isPurchase ? "tag-buy" : "tag-stock"}`}
                              >
                                {req.request_type}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td>
                        <span
                          className={`stock-status ${itemExists && req.quantity > 5 ? "stock-high" : "stock-low"}`}
                        >
                          {req.quantity} units
                        </span>
                      </td>
                      <td>
                        <code className="serial-pill">{req.siv_no || "—"}</code>
                      </td>
                      <td>
                        <span
                          className={`status-pill pill-${status.toLowerCase()}`}
                        >
                          {status}
                        </span>
                      </td>
                      <td>
                        <span className="approver-text">
                          <strong>{displayUser}</strong>
                        </span>
                      </td>
                      <td>
                        <div className="timestamp-history">
                          <div
                            className={`step ${req.accepted_at ? "done" : req.rejected_at && !req.accepted_at ? "failed" : ""}`}
                          >
                            <small>OA: {req.accepted_by || "..."}</small>
                          </div>
                          <div
                            className={`step ${req.approved_at ? "done" : req.rejected_at && req.accepted_at && !req.approved_at ? "failed" : ""}`}
                          >
                            <small>HR: {req.approved_by || "..."}</small>
                          </div>
                          <div
                            className={`step ${req.released_at ? "done" : req.rejected_at && req.approved_at ? "failed" : ""}`}
                          >
                            <small>STR: {req.released_by || "..."}</small>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="qty-controls">
                          {!itemExists &&
                          !["Released", "Rejected", "Canceled"].includes(
                            status,
                          ) ? (
                            <span
                              className="completed-label"
                              style={{ color: "#d9534f" }}
                            >
                              Unavailable
                            </span>
                          ) : (
                            <>
                              {status === "Pending" &&
                                (currentRole === "office_admin" ||
                                  currentRole === "store") && (
                                  <>
                                    <Actions
                                      label="Accept"
                                      message={`Are you sure you want to accept the request for ${req.quantity}x ${req.item_name}?`}
                                      className="req-item"
                                      onConfirm={() =>
                                        updateStatus(
                                          req.id,
                                          "Accepted",
                                          req.item_id,
                                          req.request_type,
                                          req.item_name,
                                          req.quantity,
                                        )
                                      }
                                    />
                                    {!isOwner && (
                                      <Actions
                                        label="Reject"
                                        message={`Reject this request for ${req.item_name}? This action cannot be undone.`}
                                        className="req-reject"
                                        onConfirm={() =>
                                          updateStatus(
                                            req.id,
                                            "Rejected",
                                            req.item_id,
                                            req.request_type,
                                            req.item_name,
                                            req.quantity,
                                          )
                                        }
                                      />
                                    )}
                                  </>
                                )}

                              {status === "Accepted" && !isOwner && (
                                <>
                                  {!isPurchase &&
                                    currentRole === "hr_available" && (
                                      <>
                                        <Actions
                                          label="Approve"
                                          message={`Proceed with HR approval for ${req.item_name}?`}
                                          className="req-item"
                                          onConfirm={() =>
                                            updateStatus(
                                              req.id,
                                              "Approved",
                                              req.item_id,
                                              req.request_type,
                                              req.item_name,
                                              req.quantity,
                                            )
                                          }
                                        />
                                        <Actions
                                          label="Reject"
                                          message={`Reject HR approval for ${req.item_name}?`}
                                          className="req-reject"
                                          onConfirm={() =>
                                            updateStatus(
                                              req.id,
                                              "Rejected",
                                              req.item_id,
                                              req.request_type,
                                              req.item_name,
                                              req.quantity,
                                            )
                                          }
                                        />
                                      </>
                                    )}
                                  {isPurchase &&
                                    currentRole === "hr_purchase" && (
                                      <>
                                        <Actions
                                          label="Approve"
                                          message={`Approve purchase for ${req.quantity} unit(s) of ${req.item_name}?`}
                                          className="req-purchase"
                                          onConfirm={() =>
                                            updateStatus(
                                              req.id,
                                              "Approved",
                                              req.item_id,
                                              req.request_type,
                                              req.item_name,
                                              req.quantity,
                                            )
                                          }
                                        />
                                        <Actions
                                          label="Reject"
                                          message={`Reject purchase request for ${req.item_name}?`}
                                          className="req-reject"
                                          onConfirm={() =>
                                            updateStatus(
                                              req.id,
                                              "Rejected",
                                              req.item_id,
                                              req.request_type,
                                              req.item_name,
                                              req.quantity,
                                            )
                                          }
                                        />
                                      </>
                                    )}
                                </>
                              )}

                              {status === "Approved" &&
                                currentRole === "store" && (
                                  <>
                                    {req.current_stock >= req.quantity ? (
                                      <button
                                        className="req-item"
                                        onClick={() => {
                                          setSivData({
                                            id: req.id,
                                            siv_no: "",
                                            item_id: req.item_id,
                                            request_type: req.request_type,
                                            item_name: req.item_name,
                                            quantity: req.quantity,
                                          });
                                          setShowSivModal(true);
                                        }}
                                      >
                                        Release
                                      </button>
                                    ) : (
                                      <button
                                        className="req-item disabled-btn"
                                        disabled
                                        title="Insufficient stock"
                                      >
                                        out of Stock
                                      </button>
                                    )}
                                    {!isOwner && (
                                      <Actions
                                        label="Reject"
                                        message="Reject this approved request? Note: The item will not be released."
                                        className="req-reject"
                                        onConfirm={() =>
                                          updateStatus(
                                            req.id,
                                            "Rejected",
                                            req.item_id,
                                            req.request_type,
                                            req.item_name,
                                            req.quantity,
                                          )
                                        }
                                      />
                                    )}
                                  </>
                                )}
                            </>
                          )}

                          {status === "Pending" && isOwner && (
                            <Actions
                              label="Cancel"
                              message="Are you sure you want to cancel your request? This will remove it from the workflow."
                              className="req-reject"
                              onConfirm={() => handleCancel(req.id)}
                            />
                          )}

                          {(status === "Released" ||
                            status === "Rejected" ||
                            status === "Canceled") && (
                            <span className="completed-label">Closed</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
          {!loading && filteredRequests.length > 0 && (
            <Pagination
              currentPage={currentPage}
              totalItems={filteredRequests.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
            />
          )}
        </div>
      </section>

      {showSivModal && (
        <div className="fixed-modal-overlay">
          <div className="confirmation-modal-card">
            <div className="modal-header">
              <h3>Confirm Item Issuance</h3>
              <p>
                You are about to release <strong>{sivData.quantity}</strong>{" "}
                unit(s) of <strong>{sivData.item_name}</strong>. Please provide
                the Store Issue Voucher (SIV) number to proceed.
              </p>
            </div>
            <form onSubmit={handleSivSubmit}>
              <div className="modal-body-grid">
                <div className="modal-field">
                  <label>SIV Number</label>
                  <input
                    type="text"
                    placeholder="e.g. SIV-1002"
                    value={sivData.siv_no}
                    onChange={(e) =>
                      setSivData({ ...sivData, siv_no: e.target.value })
                    }
                    autoFocus
                    required
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowSivModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Verify & Release Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Requests;
