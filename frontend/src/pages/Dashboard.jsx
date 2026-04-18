import React, { useState, useEffect } from "react";
import "../styles/Dashboard.css";

const API_BASE = import.meta.env.VITE_API_URL;

const Dashboard = ({ role }) => {
  const [stats, setStats] = useState({
    totalItems: 0,
    lowStock: 0,
    totalRequests: 0,
    pendingRequests: 0,
  });

  const username = localStorage.getItem("username") || "User";

  useEffect(() => {
    let isMounted = true;

    const fetchStats = async () => {
      try {
        const adminRoles = ["admin", "store", "hr_available", "hr_purchase"];
        const userRole = role?.toLowerCase() || "";
        const canViewAll = adminRoles.includes(userRole);

        const requestsUrl = canViewAll
          ? `${API_BASE}/requests`
          : `${API_BASE}/requests/user/${username}`;

        const [itemsRes, reqRes] = await Promise.all([
          fetch(`${API_BASE}/items`, { credentials: "include" }),
          fetch(requestsUrl, { credentials: "include" }),
        ]);

        if (itemsRes.status === 401 || reqRes.status === 401) {
          console.error("Unauthorized: Session may have expired.");
          return;
        }

        const itemsData = await itemsRes.json();
        const requestsData = await reqRes.json();

        if (isMounted) {
          const items = Array.isArray(itemsData) ? itemsData : [];
          const requests = Array.isArray(requestsData) ? requestsData : [];

          setStats({
            totalItems: items.length,
            lowStock: items.filter((i) => i.quantity < 5).length,
            totalRequests: requests.length,
            pendingRequests: requests.filter((r) => r.status === "Pending")
              .length,
          });
        }
      } catch (err) {
        console.error("Error fetching dashboard stats:", err);
      }
    };

    fetchStats();
    return () => {
      isMounted = false;
    };
  }, [role, username]);

  return (
    <div className="dashboard-content-wrapper">
      <header className="dashboard-header-row">
        <div className="greeting-text">
          <h1>Hello {username} 👋,</h1>
          <p className="sub-text">Welcome to your inventory overview.</p>
        </div>
      </header>

      <main className="stats-container-card">
        <div className="stat-item">
          <div className="stat-icon-circle bg-green-light">📦</div>
          <div className="stat-info">
            <h2>Total Items</h2>
            <p className="stat-number">{stats.totalItems}</p>
            <span className="stat-trend trend-up">Active Catalog</span>
          </div>
        </div>

        <div className="stat-item">
          <div className="stat-icon-circle bg-blue-light">🛒</div>
          <div className="stat-info">
            <h2>Total Requests</h2>
            <p className="stat-number">{stats.totalRequests}</p>
            <span className="stat-trend trend-up">
              {["admin", "store", "hr_available", "hr_purchase"].includes(
                role?.toLowerCase(),
              )
                ? "Global Requests"
                : "My Requests"}
            </span>
          </div>
        </div>

        <div className="stat-item">
          <div className="stat-icon-circle bg-orange-light">⏳</div>
          <div className="stat-info">
            <h2>Pending Action</h2>
            <p className="stat-number">{stats.pendingRequests}</p>
            <span
              className={`stat-trend ${stats.pendingRequests > 0 ? "trend-down" : "trend-up"}`}
            >
              {stats.pendingRequests} need review
            </span>
          </div>
        </div>

        <div className="stat-item">
          <div className="stat-icon-circle bg-red-light">⚠️</div>
          <div className="stat-info">
            <h2>Low Stock</h2>
            <p className="stat-number">{stats.lowStock}</p>
            <span className="stat-trend trend-down">Below 5 units</span>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
