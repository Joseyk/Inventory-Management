import React, { useState } from "react";
import ItemForm from "./ItemForm";
import Notification from "./Notification";

const API_BASE = import.meta.env.VITE_API_URL;

const Inventory = ({ role }) => {
  const [notify, setNotify] = useState({ message: "", type: "" });

  const handleAdd = async (newItem) => {
    try {
      const res = await fetch(`${API_BASE}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(newItem),
      });

      if (res.ok) {
        setNotify({ message: "Item registered!", type: "success" });
        return true;
      } else {
        const errorData = await res.json();
        const errorMsg =
          res.status === 401
            ? "Session expired. Please log in again."
            : errorData.error || "Failed to register item.";

        setNotify({ message: errorMsg, type: "error" });
        return false;
      }
    } catch (err) {
      console.error("Submission error:", err);
      setNotify({ message: "Network error. Please try again.", type: "error" });
      return false;
    }
  };

  const normalizedRole = role?.toLowerCase() || "";
  const canManageStock =
    normalizedRole === "store" || normalizedRole === "admin";

  return (
    <div className="dashboard-content-wrapper">
      <Notification
        message={notify.message}
        type={notify.type}
        onClose={() => setNotify({ message: "", type: "" })}
      />

      <section className="table-section-card">
        <div className="table-header">
          <div>
            <h2 className="table-header">Inventory Entry</h2>
            <p className="sub-text">
              Register new Item into the central system
            </p>
          </div>
        </div>

        {canManageStock ? (
          <div style={{ padding: "1rem 0" }}>
            <ItemForm
              onAdd={handleAdd}
              onWarning={(msg) => setNotify({ message: msg, type: "error" })}
            />
          </div>
        ) : (
          <div className="permission-denied">
            <p>You do not have permission to add items.</p>
          </div>
        )}
      </section>
    </div>
  );
};

export default Inventory;
