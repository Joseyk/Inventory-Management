import React, { useState, useEffect, useRef } from "react";
// Removed ToastNotification import as it is now in App.jsx
import Notification from "../components/Notification";
import ItemRow from "../components/ItemRow";
import SkeletonRow from "../components/SkeletonRow";
import Pagination from "../components/Pagination";
import "../styles/Items.css";

const API_BASE = import.meta.env.VITE_API_URL;

const Items = ({ role, username }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [notify, setNotify] = useState({ message: "", type: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  const [cart, setCart] = useState(() => {
    const savedCart = localStorage.getItem("inventory_cart");
    return savedCart ? JSON.parse(savedCart) : [];
  });

  const ITEMS_API = `${API_BASE}/items`;
  const REQUESTS_API = `${API_BASE}/requests`;

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await fetch(ITEMS_API, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Fetch error:", err);
      setNotify({ message: "Failed to connect to server.", type: "error" });
    } finally {
      setTimeout(() => setLoading(false), 300);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  useEffect(() => {
    localStorage.setItem("inventory_cart", JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // --- 5. Handlers ---
  const addToCart = (item, type, qty) => {
    const exists = cart.find(
      (c) => c.id === item.id && c.request_type === type,
    );

    if (exists) {
      setNotify({
        message: `${item.name} (${type}) is already in your list.`,
        type: "error",
      });
      return;
    }

    const numericQty = parseInt(qty, 10) || 1;

    if (type === "Item Request" && numericQty > item.quantity) {
      setNotify({
        message: `Cannot request ${numericQty} ${item.name}. Only ${item.quantity} available.`,
        type: "error",
      });
      return;
    }

    const cartItem = {
      ...item,
      request_type: type,
      requested_quantity: numericQty,
      tempId: Date.now() + Math.random(),
    };

    setCart((prev) => [...prev, cartItem]);
    setNotify({
      message: `Added ${numericQty} ${item.name} to list.`,
      type: "success",
    });
  };

  const removeFromCart = (tempId) => {
    setCart((prev) => prev.filter((item) => item.tempId !== tempId));
  };

  const handleBulkSubmit = async () => {
    setIsSubmitting(true);
    const userBranch = localStorage.getItem("branch") || "Main";

    try {
      const promises = cart.map((item) => {
        return fetch(REQUESTS_API, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            item_id: item.id,
            item_name: item.name,
            request_type: item.request_type,
            quantity: item.requested_quantity,
            branch: userBranch,
          }),
        });
      });

      const responses = await Promise.all(promises);
      const failed = responses.filter((r) => !r.ok);

      if (failed.length === 0) {
        setNotify({
          message: `Successfully requested ${cart.length} items!`,
          type: "success",
        });
        setCart([]);
        setShowModal(false);
      } else {
        setNotify({
          message: `Warning: ${failed.length} requests failed. Stock might have changed.`,
          type: "error",
        });
        fetchItems();
      }
    } catch (err) {
      setNotify({ message: "Network error. Please try again.", type: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredItems = items.filter(
    (i) =>
      i.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.supplier?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.brand?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredItems.slice(indexOfFirstItem, indexOfLastItem);

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
            <h2 className="table-header">Items Catalog</h2>
            <p className="sub-text">Build your list and submit all at once</p>
          </div>
          <div className="table-controls">
            <input
              type="text"
              placeholder="Search items..."
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
                <th>Item Details</th>
                <th>Category</th>
                <th>Stock</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(6)].map((_, index) => (
                  <SkeletonRow key={index} isManagePage={false} />
                ))
              ) : currentItems.length > 0 ? (
                currentItems.map((item) => (
                  <ItemRow
                    key={item.id}
                    item={item}
                    onRequest={addToCart}
                    isManagePage={false}
                  />
                ))
              ) : (
                <tr>
                  <td colSpan="4" className="empty-state-cell no-results-text">
                    {searchTerm
                      ? `No results found for "${searchTerm}"`
                      : "No items available in the catalog."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {!loading && filteredItems.length > 0 && (
            <Pagination
              currentPage={currentPage}
              totalItems={filteredItems.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
            />
          )}
        </div>

        {cart.length > 0 && (
          <div className="cart-floating-bar">
            <div className="cart-info">
              <span className="cart-count">{cart.length}</span>
              <div className="cart-text">
                <strong>Pending Requests</strong>
                <p>Click "Review & Submit" to finalize.</p>
              </div>
            </div>
            <div className="cart-actions">
              <button className="clear-btn" onClick={() => setCart([])}>
                Clear All
              </button>
              <button
                className="submit-all-btn"
                onClick={() => setShowModal(true)}
              >
                Review & Submit
              </button>
            </div>
          </div>
        )}
      </section>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Review Your Requests</h3>
            <p className="sub-text">Confirm the items before sending.</p>
            <div className="modal-item-list">
              {cart.map((item) => (
                <div key={item.tempId} className="modal-item-row">
                  <div>
                    <strong>{item.name}</strong>
                    <div className="item-brand-sm">{item.brand}</div>
                  </div>
                  <div className="qty-highlight">
                    <strong>{item.requested_quantity}</strong> units
                  </div>
                  <div className="modal-row-right">
                    <span className="item-category-pill">
                      {item.request_type}
                    </span>
                    <button
                      className="remove-item-btn"
                      onClick={() => removeFromCart(item.tempId)}
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="modal-actions">
              <button
                className="clear-btn"
                onClick={() => setShowModal(false)}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                className="submit-all-btn"
                onClick={handleBulkSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Processing..." : "Confirm & Send"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Items;
