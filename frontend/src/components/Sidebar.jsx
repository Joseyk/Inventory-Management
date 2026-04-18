import React from "react";
import { NavLink, useLocation } from "react-router-dom";
import Actions from "./Actions";

const Sidebar = ({ role }) => {
  const location = useLocation();

  const storedRole = localStorage.getItem("userRole") || "";
  const currentRole = (role || storedRole).toLowerCase().trim();

  const isAdmin = currentRole === "admin";
  const isAdminOrStore = currentRole === "admin" || currentRole === "store";

  const getDynamicTitle = (path) => {
    const titles = {
      "/requests": "Requests",
      "/inventory": "Add Stock",
      "/manage-inventory": "Management",
      "/items": "Catalog",
      "/dashboard": "Dashboard",
      "/audit-log": "Audit Trail",
      "/user-management": "Manage Users",
      "/reports": "Reports",
      "/stock-history": "Stock History",
      "/request-stock": "Stock Request",
      "/settings": "Settings",
    };
    return titles[path] || "System";
  };

  return (
    <aside className="dashboard-nav-panel">
      <div className="sidebar-header">
        <div className="logo-icon">⚙️</div>
        <h2>
          {getDynamicTitle(location.pathname)} <small>v.01</small>
        </h2>
      </div>

      <nav
        className="quick-nav-links"
        style={{ flex: 1, display: "flex", flexDirection: "column" }}
      >
        <NavLink
          to="/dashboard"
          className={({ isActive }) =>
            isActive ? "nav-link active-nav" : "nav-link"
          }
        >
          <span className="link-content">🏠 Dashboard</span>
        </NavLink>

        <NavLink
          to="/items"
          className={({ isActive }) =>
            isActive ? "nav-link active-nav" : "nav-link"
          }
        >
          <span className="link-content">📦 Items Catalog</span>
        </NavLink>

        <NavLink
          to="/requests"
          className={({ isActive }) =>
            isActive ? "nav-link active-nav" : "nav-link"
          }
        >
          <span className="link-content">📋 Requests</span>
        </NavLink>

        {isAdmin && (
          <NavLink
            to="/audit-log"
            className={({ isActive }) =>
              isActive ? "nav-link active-nav" : "nav-link"
            }
          >
            <span className="link-content">📃 Audit Log</span>
          </NavLink>
        )}

        {isAdminOrStore && (
          <>
            <div
              className="nav-divider"
              style={{ borderTop: "1px solid #eee", margin: "10px 0" }}
            ></div>
            <NavLink
              to="/inventory"
              className={({ isActive }) =>
                isActive ? "nav-link active-nav" : "nav-link"
              }
            >
              <span className="link-content">➕ Add New Item</span>
            </NavLink>
            <NavLink
              to="/manage-inventory"
              className={({ isActive }) =>
                isActive ? "nav-link active-nav" : "nav-link"
              }
            >
              <span className="link-content">🔧 Manage Registry</span>
            </NavLink>
          </>
        )}

        {isAdminOrStore && (
          <NavLink
            to="/reports"
            className={({ isActive }) =>
              isActive ? "nav-link active-nav" : "nav-link"
            }
          >
            <span className="link-content">📊 Reports</span>
          </NavLink>
        )}

        {isAdminOrStore && (
          <NavLink
            to="/stock-history"
            className={({ isActive }) =>
              isActive ? "nav-link active-nav" : "nav-link"
            }
          >
            <span className="link-content">📜 Storck History</span>
          </NavLink>
        )}
        {(isAdminOrStore ||
          role === "hr_available" ||
          role === "hr_purchase") && (
          <NavLink
            to="/request-stock"
            className={({ isActive }) =>
              isActive ? "nav-link active-nav" : "nav-link"
            }
          >
            <span className="link-content">📈Stock Request</span>
          </NavLink>
        )}

        {isAdmin && (
          <NavLink
            to="/user-management"
            className={({ isActive }) =>
              isActive ? "nav-link active-nav" : "nav-link"
            }
          >
            <span className="link-content">⚙️ Manage User</span>
          </NavLink>
        )}
        {!isAdmin && (
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              isActive ? "nav-link active-nav" : "nav-link"
            }
          >
            <span className="link-content">⚙️ Settings</span>
          </NavLink>
        )}

        <Actions
          label={<span className="link-content">🚪 Logout</span>}
          className="nav-link logout-btn-sidebar"
          message="Are you sure you want to log out?"
          onConfirm={() => {
            localStorage.clear();
            window.location.href = "/login";
          }}
        />
      </nav>
    </aside>
  );
};

export default Sidebar;
