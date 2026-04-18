import React, { useState, useEffect } from "react";
import SkeletonRow from "../components/SkeletonRow";
import Pagination from "../components/Pagination";
import "../styles/StockHistory.css";

const API_BASE = import.meta.env.VITE_API_URL;

const StockHistory = () => {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  useEffect(() => {
    const fetchEntries = async () => {
      try {
        const res = await fetch(`${API_BASE}/items/stock-history`, {
          credentials: "include",
        });
        const data = await res.json();

        if (res.ok) {
          setEntries(Array.isArray(data) ? data : []);
        } else {
          console.error("Server error:", data.error);
          setEntries([]);
        }
      } catch (err) {
        console.error("Error fetching entry history:", err);
        setEntries([]);
      } finally {
        setLoading(false);
      }
    };
    fetchEntries();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const filteredEntries = entries.filter(
    (entry) =>
      (entry.item_name?.toLowerCase() || "").includes(
        searchTerm.toLowerCase(),
      ) ||
      (entry.grv_number?.toString().toLowerCase() || "").includes(
        searchTerm.toLowerCase(),
      ) ||
      (entry.siv_no?.toString().toLowerCase() || "").includes(
        searchTerm.toLowerCase(),
      ),
  );

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentEntries = filteredEntries.slice(
    indexOfFirstItem,
    indexOfLastItem,
  );

  return (
    <div className="dashboard-content-wrapper">
      <section className="table-section-card">
        <div className="table-header">
          <div>
            <h2 className="table-header">Inventory Ledger</h2>
            <p className="sub-text">
              Detailed record of arrivals, issues, and stock top-ups.
            </p>
          </div>
          <input
            type="text"
            placeholder="Search by Item, GRV, or SIV..."
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
                <th>Type</th>
                <th>Item Name</th>
                <th>Quantity</th>
                <th>Unit Price</th>
                <th>Total Value</th>
                <th>GRV Ref</th>
                <th>SIV Ref</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(8)].map((_, i) => <SkeletonRow key={i} columns={8} />)
              ) : currentEntries.length > 0 ? (
                currentEntries.map((entry) => {
                  const isPositive = entry.entry_type !== "STOCK_ISSUE";
                  const displayQty = Math.abs(entry.qty_added);
                  const unitPrice = Number(entry.unit_price) || 0;
                  const totalValue = displayQty * unitPrice;

                  return (
                    <tr key={entry.id}>
                      <td className="date-cell">
                        <div className="date-main">
                          {new Date(entry.created_at).toLocaleDateString(
                            "en-GB",
                            {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            },
                          )}
                        </div>
                        <div className="time-sub">
                          {new Date(entry.created_at).toLocaleTimeString(
                            "en-GB",
                            {
                              hour: "2-digit",
                              minute: "2-digit",
                            },
                          )}
                        </div>
                      </td>
                      <td>
                        <span
                          className={`type-badge ${
                            entry.entry_type === "NEW_REGISTRATION"
                              ? "type-new"
                              : entry.entry_type === "STOCK_ISSUE"
                                ? "type-issue"
                                : "type-restock"
                          }`}
                        >
                          {entry.entry_type === "NEW_REGISTRATION"
                            ? "Initial"
                            : entry.entry_type === "STOCK_ISSUE"
                              ? "Issue"
                              : "Top-up"}
                        </span>
                      </td>
                      <td>
                        <strong>{entry.item_name}</strong>
                      </td>
                      <td>
                        <span
                          className={`qty-added-badge ${isPositive ? "qty-pos" : "qty-neg"}`}
                        >
                          {isPositive ? "+" : "-"} {displayQty}
                        </span>
                      </td>
                      <td>{unitPrice.toLocaleString()} ETB</td>
                      <td className="total-value-text">
                        <strong>{totalValue.toLocaleString()} ETB</strong>
                      </td>
                      <td>
                        <code className="grv-pill">
                          {entry.grv_number || "—"}
                        </code>
                      </td>
                      <td>
                        <code className="siv-pill">{entry.siv_no || "—"}</code>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="8" className="no-results-text">
                    {searchTerm
                      ? `No records match "${searchTerm}"`
                      : "No history records found."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {!loading && filteredEntries.length > 0 && (
            <Pagination
              currentPage={currentPage}
              totalItems={filteredEntries.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
            />
          )}
        </div>
      </section>
    </div>
  );
};

export default StockHistory;
