import React, { useState, useEffect } from "react";
import SkeletonRow from "../components/SkeletonRow";
import Pagination from "../components/Pagination";
import "../styles/Reports.css";
import "../styles/Dashboard.css";

const API_BASE = import.meta.env.VITE_API_URL;

const Reports = () => {
  const [items, setItems] = useState([]);
  const [requests, setRequests] = useState([]);
  const [reportMode, setReportMode] = useState("released");
  const [filteredData, setFilteredData] = useState([]);
  const [loading, setLoading] = useState(true);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5);

  const [filter, setFilter] = useState({
    branch: "All",
    status: "All",
    startDate: "",
    endDate: "",
  });

  // ... (branches array remains the same as your original code)
  const branches = [
    "Audit & Inspection Service",
    "Business Development & Marketing Department",
    "Corporate Planning & Research Service",
    "Claim - OD",
    "Claim - TP",
    "Claim - TP recovery",
    "Engineering Service",
    "Ethics Monitoring Section",
    "Finance Department",
    "HR & Property Admin Department",
    "IT Service",
    "Legal Service",
    "Life Insurance Project Department",
    "Reinsurance Service",
    "Risk Management & Compliance Service",
    "Underwriting Department",
    "Main Branch",
    "Stadium Branch",
    "T/haimanot Branch",
    "Genet Branch",
    "Gofa Branch",
    "Gerji Branch",
    "Kality Branch",
    "Raguel Branch",
    "Olympia Branch",
    "Cathedral Branch",
    "Autobus Tera Branch",
    "Lideta Branch",
    "Gurdshola Branch",
    "Bole-Medhanealem Branch",
    "Kazanchis Branch",
    "Arat Kilo Branch",
    "Adama Branch",
    "Hawassa Branch",
    "Mekelle Branch",
    "Gondar Branch",
    "Bahir Dar Branch",
    "Shire Branch",
    "Dessie Branch",
    "Jimma Branch",
    "Dire Dawa Branch",
    "Northern Regional Branch",
    "Mekelle Alula Aba Nega Branch",
    "Arba Minch Branch",
    "Adigrat Branch",
    "Humera Branch",
    "Debre Birhan Branch",
    "Bishoftu Branch",
    "Debre Marikos Branch",
    "Lebu Branch",
    "Haya Hulet Branch",
    "Adwa Branch",
    "Logia Branch",
    "Shashemene Branch",
    "Wolaita Branch",
    "CMC Branch",
    "Addisu Gebeya Branch",
    "Lancha Branch",
    "Meskel Flower Branch",
    "Mekhoni Branch",
    "Adi Haki Branch",
    "Betel Branch",
    "Bole Michael Branch",
    "Akaki Alem Bank Branch",
  ];

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [reqRes, itemRes] = await Promise.all([
          fetch(`${API_BASE}/requests`, { credentials: "include" }),
          fetch(`${API_BASE}/items`, { credentials: "include" }),
        ]);

        if (reqRes.status === 401 || itemRes.status === 401) return;

        const requestsData = await reqRes.json();
        const itemsData = await itemRes.json();

        setRequests(Array.isArray(requestsData) ? requestsData : []);
        setItems(Array.isArray(itemsData) ? itemsData : []);
      } catch (err) {
        console.error("Failed to fetch report data:", err);
      } finally {
        setTimeout(() => setLoading(false), 600);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    let result = reportMode === "registered" ? [...items] : [...requests];

    if (reportMode === "released") {
      if (filter.branch !== "All")
        result = result.filter((r) => r.branch === filter.branch);
      if (filter.status !== "All") {
        result = result.filter(
          (r) => r.status?.toLowerCase() === filter.status.toLowerCase(),
        );
      }
    }

    if (filter.startDate) {
      const start = new Date(filter.startDate);
      start.setHours(0, 0, 0, 0);
      result = result.filter((r) => new Date(r.created_at) >= start);
    }

    if (filter.endDate) {
      const end = new Date(filter.endDate);
      end.setHours(23, 59, 59, 999);
      result = result.filter((r) => new Date(r.created_at) <= end);
    }

    setFilteredData(result);
    setCurrentPage(1);
  }, [reportMode, filter, requests, items]);

  // 🔑 NEW: Export to Excel (CSV) Logic
  const exportToExcel = () => {
    let csvContent = "data:text/csv;charset=utf-8,";

    // Define Headers based on mode
    const headers =
      reportMode === "registered"
        ? [
            "Registration Date",
            "Item Name",
            "Category",
            "Stock Level",
            "Total Value (ETB)",
          ]
        : [
            "Request Date",
            "Requester",
            "Item",
            "Branch",
            "Item Price",
            "Status",
          ];

    csvContent += headers.join(",") + "\r\n";

    // Add Data Rows
    filteredData.forEach((row) => {
      const date = new Date(row.created_at).toLocaleDateString("en-GB");
      let rowData = [];

      if (reportMode === "registered") {
        rowData = [
          date,
          `"${row.name}"`, // Wrap in quotes to handle commas in names
          `"${row.category || "General"}"`,
          row.quantity,
          (row.quantity * row.price).toFixed(2),
        ];
      } else {
        rowData = [
          date,
          `"${row.username}"`,
          `"${row.item_name}"`,
          `"${row.branch}"`,
          row.item_price,
          `"${row.status || "N/A"}"`,
        ];
      }
      csvContent += rowData.join(",") + "\r\n";
    });

    // Create Download Link
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    const fileName = `LIC_${reportMode}_Report_${new Date().toISOString().split("T")[0]}.csv`;
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentData = filteredData.slice(indexOfFirstItem, indexOfLastItem);

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

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "ETB",
    }).format(amount || 0);
  };

  return (
    <div className="dashboard-content-wrapper">
      <section className="table-section-card">
        <header className="table-header">
          <div
            className="um-header-flex"
            style={{
              width: "100%",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <h2 className="table-header">System Reports</h2>
              <p className="sub-text">
                {reportMode === "registered"
                  ? "Master Inventory & Stock Levels"
                  : "Transaction & Request History"}
              </p>
            </div>
            {/* 🔑 Updated Button */}
            <button
              onClick={exportToExcel}
              className="add-item-btn"
              style={{ background: "#16a34a" }}
            >
              Export to Excel
            </button>
          </div>
        </header>

        {/* ... (Rest of the JSX remains the same) */}
        <div className="um-action-bar">
          <div className="report-toggle-bar">
            <button
              className={reportMode === "registered" ? "active" : ""}
              onClick={() => setReportMode("registered")}
            >
              Stock Report
            </button>
            <button
              className={reportMode === "released" ? "active" : ""}
              onClick={() => setReportMode("released")}
            >
              Request History
            </button>
          </div>
        </div>

        <div className="filter-bar">
          {reportMode === "released" && (
            <>
              <div className="um-input-wrapper">
                <label>Branch</label>
                <select
                  value={filter.branch}
                  onChange={(e) =>
                    setFilter({ ...filter, branch: e.target.value })
                  }
                >
                  <option value="All">All Branches and Departments</option>
                  {branches.map((b, i) => (
                    <option key={i} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>
              <div className="um-input-wrapper">
                <label>Status</label>
                <select
                  value={filter.status}
                  onChange={(e) =>
                    setFilter({ ...filter, status: e.target.value })
                  }
                >
                  <option value="All">All Statuses</option>
                  <option value="Pending">Pending</option>
                  <option value="Approved">Approved</option>
                  <option value="Released">Released</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>
            </>
          )}

          <div className="um-input-wrapper">
            <label>From Date</label>
            <input
              type="date"
              value={filter.startDate}
              onChange={(e) =>
                setFilter({ ...filter, startDate: e.target.value })
              }
            />
          </div>
          <div className="um-input-wrapper">
            <label>To Date</label>
            <input
              type="date"
              value={filter.endDate}
              onChange={(e) =>
                setFilter({ ...filter, endDate: e.target.value })
              }
            />
          </div>
          <button
            className="um-btn-danger"
            onClick={() =>
              setFilter({
                branch: "All",
                status: "All",
                startDate: "",
                endDate: "",
              })
            }
          >
            Reset
          </button>
        </div>

        <div className="table-responsive-container">
          <table className="custom-dashboard-table">
            <thead>
              {reportMode === "registered" ? (
                <tr>
                  <th>Reg. Date</th>
                  <th>Item Name</th>
                  <th>Category</th>
                  <th>Current Stock</th>
                  <th>Total Value</th>
                </tr>
              ) : (
                <tr>
                  <th>Request Date</th>
                  <th>Requester</th>
                  <th>Item</th>
                  <th>Branch</th>
                  <th>Total Value</th>
                  <th>Status</th>
                </tr>
              )}
            </thead>
            <tbody>
              {loading ? (
                [...Array(10)].map((_, index) => (
                  <SkeletonRow key={index} isReportsPage={true} />
                ))
              ) : currentData.length > 0 ? (
                currentData.map((row) => {
                  const displayDate = formatDateDisplay(row.created_at);

                  return (
                    <tr key={row.id}>
                      <td className="registration-time-cell">
                        <div>
                          <span className="date-main">{displayDate.date}</span>
                          <span className="time-sub">{displayDate.time}</span>
                        </div>
                      </td>
                      {reportMode === "registered" ? (
                        <>
                          <td>
                            <strong>{row.name}</strong>
                          </td>
                          <td>
                            <span className="item-category-pill">
                              {row.category || "General"}
                            </span>
                          </td>
                          <td>
                            <span
                              className={row.quantity <= 5 ? "text-danger" : ""}
                            >
                              {row.quantity} units
                            </span>
                          </td>
                          <td>
                            <strong className="stock-high">
                              {formatCurrency(row.quantity * row.price)}
                            </strong>
                          </td>
                        </>
                      ) : (
                        <>
                          <td>{row.username}</td>
                          <td>
                            <strong>{row.item_name}</strong>
                          </td>
                          <td className="item-category-pill cent">
                            {row.branch}
                          </td>
                          <td>
                            <strong className="stock-low">
                              {row.item_price}
                            </strong>
                          </td>
                          <td>
                            <span
                              className={`status-pill pill-${row.status?.toLowerCase() || "pending"}`}
                            >
                              {row.status || "N/A"}
                            </span>
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan="6"
                    style={{
                      textAlign: "center",
                      padding: "40px",
                      color: "#64748b",
                    }}
                  >
                    No matching records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {!loading && filteredData.length > 0 && (
            <Pagination
              currentPage={currentPage}
              totalItems={filteredData.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
            />
          )}
        </div>
      </section>
    </div>
  );
};

export default Reports;
