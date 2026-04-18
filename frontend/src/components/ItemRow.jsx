import React, { useState, useEffect } from "react";
import Actions from "./Actions";
import Notification from "./Notification";

const ItemRow = ({ item, onDelete, onUpdate, onRequest, isManagePage }) => {
  if (!item) return null;

  const [requestQty, setRequestQty] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [notification, setNotification] = useState({ message: "", type: "" });
  const [newBatchTotal, setNewBatchTotal] = useState(0);
  const [finalTotalValue, setFinalTotalValue] = useState(0);

  const [formData, setFormData] = useState({
    addQty: 0,
    price: item.price || 0,
    grv_number: "",
  });

  useEffect(() => {
    const incomingQty = parseInt(formData.addQty, 10) || 0;
    const incomingUnitPrice = parseFloat(formData.price) || 0;

    const currentBatchValue = incomingQty * incomingUnitPrice;
    setNewBatchTotal(currentBatchValue);

    const existingStockValue =
      (Number(item.quantity) || 0) * (Number(item.price) || 0);

    setFinalTotalValue(existingStockValue + currentBatchValue);
  }, [formData.addQty, formData.price, item.quantity, item.price]);

  const handleOpenModal = () => {
    setFormData({
      addQty: 0,
      price: item.price || 0,
      grv_number: "",
    });
    setShowModal(true);
  };

  const handleConfirmUpdate = async () => {
    const addedQty = parseInt(formData.addQty, 10);
    const newUnitPrice = parseFloat(formData.price);

    if (isNaN(addedQty) || addedQty <= 0) {
      setNotification({ message: "Enter a valid quantity", type: "error" });
      return;
    }

    if (!formData.grv_number) {
      setNotification({ message: "GRV number is required", type: "error" });
      return;
    }

    setIsUpdating(true);
    try {
      await onUpdate(item, {
        qtyDifference: addedQty,
        newPrice: newUnitPrice,
        newGrv: formData.grv_number,
        totalValue: finalTotalValue, // This is the sum of (Old Total + New Total)
      });

      setShowModal(false);
      setTimeout(() => {
        setNotification({
          message: `Stock updated. Total Value is now ${formatCurrency(finalTotalValue)}`,
          type: "success",
        });
      }, 300);
    } catch (err) {
      setNotification({ message: "Update failed.", type: "error" });
    } finally {
      setIsUpdating(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "ETB",
    }).format(amount || 0);
  };

  return (
    <>
      {notification.message && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification({ message: "", type: "" })}
        />
      )}

      <tr>
        <td>
          <div className="item-info-cell">
            <strong>{item.name}</strong>
            <div className="item-specs">
              {item.brand && <span>{item.brand}</span>}
              {item.model && <span> • {item.model}</span>}
            </div>
          </div>
        </td>

        {isManagePage && (
          <td className="registration-time-cell">
            <div>
              <span className="date-main">
                {item.formatted_date?.split(" ")[0] || "—"}
              </span>
              <span className="time-sub">
                {item.formatted_date?.split(" ")[1] || ""}
              </span>
            </div>
          </td>
        )}

        <td>
          <span className="item-category-pill">
            {item.category || "General"}
          </span>
        </td>

        {isManagePage && (
          <>
            <td className="supplier-cell">{item.supplier || "—"}</td>
            <td>
              <code className="serial-pill">{item.serial_number || "—"}</code>
            </td>
          </>
        )}

        <td>
          <span
            className={`stock-status ${item.quantity > 5 ? "stock-high" : "stock-low"}`}
          >
            {item.quantity} units
          </span>
        </td>

        {isManagePage && (
          <>
            <td>{item.grv_number || "—"}</td>
            <td>
              <strong>{formatCurrency(item.quantity * item.price)}</strong>
            </td>
          </>
        )}

        <td>
          <div className="qty-controls">
            {isManagePage ? (
              <div style={{ display: "flex", gap: "8px" }}>
                <button className="edit-action-btn" onClick={handleOpenModal}>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                  Add
                </button>
                <Actions
                  label="Delete"
                  className="req-reject"
                  message={`Permanently delete ${item.name}?`}
                  onConfirm={() => onDelete(item.id)}
                />
              </div>
            ) : (
              <div style={{ display: "flex", gap: "5px" }}>
                <input
                  type="number"
                  className="request-qty-input"
                  value={requestQty}
                  onChange={(e) =>
                    setRequestQty(Math.max(1, parseInt(e.target.value) || 1))
                  }
                  min="1"
                />
                <button
                  className={`action-btn ${item.quantity <= 0 ? "req-purchase" : "req-item"}`}
                  onClick={() =>
                    onRequest(
                      item,
                      item.quantity <= 0 ? "Purchase Request" : "Item Request",
                      requestQty,
                    )
                  }
                >
                  {item.quantity <= 0 ? "Request Purchase" : "Add to Request"}
                </button>
              </div>
            )}
          </div>
        </td>
      </tr>

      {showModal && (
        <div className="fixed-modal-overlay">
          <div className="confirmation-modal-card">
            <div className="modal-header">
              <h3>Confirm Stock Arrival</h3>
              <p>
                Adding to existing stock for: <strong>{item.name}</strong>
              </p>
            </div>
            <div className="modal-body-grid">
              <div className="modal-field">
                <label>Arrival Quantity</label>
                <input
                  type="number"
                  value={formData.addQty}
                  onChange={(e) =>
                    setFormData({ ...formData, addQty: e.target.value })
                  }
                  autoFocus
                  disabled={isUpdating}
                />
              </div>
              <div className="modal-field">
                <label>Unit Price of This Batch (ETB)</label>
                <input
                  type="number"
                  value={formData.price}
                  onChange={(e) =>
                    setFormData({ ...formData, price: e.target.value })
                  }
                  disabled={isUpdating}
                />
              </div>

              <div className="modal-field">
                <label>Batch Subtotal (Qty × Price)</label>
                <p>{formatCurrency(newBatchTotal)}</p>
              </div>

              <div
                className="modal-field"
                style={{ borderTop: "2px solid #eee", paddingTop: "10px" }}
              >
                <label>New Total Value (Previous + Batch)</label>
                <input
                  type="text"
                  readOnly
                  className="total-price"
                  value={formatCurrency(finalTotalValue)}
                />
              </div>

              <div className="modal-field">
                <label>GRV Number</label>
                <input
                  type="text"
                  placeholder="e.g. GRV-2024-001"
                  value={formData.grv_number}
                  onChange={(e) =>
                    setFormData({ ...formData, grv_number: e.target.value })
                  }
                  disabled={isUpdating}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn-secondary"
                disabled={isUpdating}
                onClick={() => setShowModal(false)}
              >
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={handleConfirmUpdate}
                disabled={isUpdating}
              >
                {isUpdating ? "Updating..." : "Confirm Update"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ItemRow;
