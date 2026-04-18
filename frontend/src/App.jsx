import { useState, useEffect, useRef } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useNavigate,
} from "react-router-dom";
import { io } from "socket.io-client";
import Login from "./pages/Login";
import Inventory from "./components/Inventory";
import Requests from "./pages/Requests";
import Items from "./pages/Items";
import Dashboard from "./pages/Dashboard";
import ManageInventory from "./pages/ManageInventory";
import Sidebar from "./components/Sidebar";
import AuditLog from "./components/AuditLog";
import UserManagement from "./pages/UserManagement";
import Reports from "./pages/Reports";
import ToastNotification from "./components/ToastNotification";

import "./styles/Inventory.css";
import "./styles/Notification.css";
import "./styles/ItemRow.css";
import "./styles/ItemForm.css";
import "./styles/Dashboard.css";
import "./styles/Sidebar.css";
import StockHistory from "./pages/StockHistory";
import RequestStock from "./pages/RequestStock";
import Settings from "./pages/Settings";

// 🔑 Dynamic URL Initialization for Render & Local Dev
const SOCKET_URL = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.split("/api")[0]
  : "http://localhost:5000";

const socket = io(SOCKET_URL, {
  withCredentials: true,
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 2000,
  transports: ["websocket", "polling"],
});

function AppContent() {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(
    localStorage.getItem("isLoggedIn") === "true",
  );
  const [role, setRole] = useState(localStorage.getItem("userRole") || "User");
  const [username, setUsername] = useState(
    localStorage.getItem("username") || "",
  );
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ message: "", type: "", path: "" });

  const audioRef = useRef(null);

  useEffect(() => {
    const verifySession = async () => {
      try {
        const res = await fetch(`${SOCKET_URL}/api/auth/verify`, {
          credentials: "include",
        });

        if (res.ok) {
          const data = await res.json();
          setIsAuthenticated(true);
          setRole(data.role);
          setUsername(data.username);
          localStorage.setItem("username", data.username);
          localStorage.setItem("userRole", data.role);
          localStorage.setItem("isLoggedIn", "true");
        } else {
          handleLogout();
        }
      } catch (err) {
        console.error("Auth verification failed:", err);
      } finally {
        setLoading(false);
      }
    };

    if (localStorage.getItem("isLoggedIn") === "true") {
      verifySession();
    } else {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !username) return;

    // Room Join Logic
    const syncRooms = () => {
      socket.emit("join_room", username);
      const adminRoles = ["admin", "store", "hr_available", "hr_purchase"];
      if (adminRoles.includes(role.toLowerCase())) {
        socket.emit("join_room", "admin_room");
      }
    };

    socket.on("connect", syncRooms);
    if (socket.connected) syncRooms();

    if ("Notification" in window) {
      window.Notification.requestPermission();
    }

    // Force Logout Listener
    socket.on("force_logout", (data) => {
      alert(data.message);
      handleLogout();
    });

    const showNativeNotification = (title, body) => {
      if (
        "Notification" in window &&
        window.Notification.permission === "granted"
      ) {
        new window.Notification(title, { body: body, icon: "/favicon.ico" });
      }
    };

    const getTargetPath = (requestType) => {
      return requestType === "Stock Request" ? "/request-stock" : "/requests";
    };

    const handleRequestSent = (data) => {
      const isEnabled = JSON.parse(
        localStorage.getItem("notifications_enabled") ?? "true",
      );
      const authorizedRoles = ["admin", "store", "hr_available", "hr_purchase"];
      const isMe = data.username?.toLowerCase() === username?.toLowerCase();

      if (authorizedRoles.includes(role.toLowerCase()) && !isMe) {
        if (isEnabled) {
          if (audioRef.current)
            audioRef.current.play().catch((e) => console.log(e));

          const targetPath = getTargetPath(data.request_type);

          setToast({
            message: `New ${data.request_type || "Request"}: ${data.item_name} from ${data.branch}`,
            type: "info",
            path: targetPath,
          });

          showNativeNotification(
            "New Request",
            `${data.item_name} - ${data.request_type}`,
          );
        }
      }
    };

    const handleStatusUpdated = (data) => {
      const isEnabled = JSON.parse(
        localStorage.getItem("notifications_enabled") ?? "true",
      );
      const isOriginalRequester = data.username === username;
      const adminRoles = ["admin", "store", "hr_available", "hr_purchase"];
      const isAuthorizedRole = adminRoles.includes(role.toLowerCase());

      if (isOriginalRequester || isAuthorizedRole) {
        if (isEnabled) {
          if (audioRef.current)
            audioRef.current.play().catch((e) => console.log(e));

          const targetPath = getTargetPath(data.request_type);

          setToast({
            message: `Request for ${data.item_name} by ${data.username} was ${data.status.toLowerCase()}.`,
            type: data.status === "Approved" ? "success" : "error",
            path: targetPath,
          });

          showNativeNotification(
            "Request Status Update",
            `${data.item_name} is now ${data.status}`,
          );
        }
      }
    };

    const handleStockRequestUpdated = (data) => {
      const authorizedRoles = ["admin", "hr_available", "hr_purchase"];
      const isOriginalRequester = data.username === username;
      const isAuthorizedRole = authorizedRoles.includes(role);

      if (isOriginalRequester || isAuthorizedRole) {
        if (audioRef.current)
          audioRef.current.play().catch((e) => console.log(e));

        const targetPath = getTargetPath(data.request_type);

        setToast({
          message: `Stock request for ${data.item_name} was ${data.status.toLowerCase()}d.`,
          type: data.status === "Approved" ? "success" : "error",
          path: targetPath,
        });
        showNativeNotification(
          "Stock Request Update",
          `Status: ${data.status}`,
        );
      }
    };

    socket.on("request_sent", handleRequestSent);
    socket.on("request_status_updated", handleStatusUpdated);
    socket.on("stock_request_updated", handleStockRequestUpdated);

    return () => {
      socket.off("connect", syncRooms);
      socket.off("request_sent", handleRequestSent);
      socket.off("request_status_updated", handleStatusUpdated);
      socket.off("stock_request_updated", handleStockRequestUpdated);
      socket.off("force_logout");
    };
  }, [isAuthenticated, username, role]);

  const handleLogin = (newToken, newRole, newUsername) => {
    localStorage.setItem("isLoggedIn", "true");
    localStorage.setItem("userRole", newRole);
    localStorage.setItem("username", newUsername);

    setIsAuthenticated(true);
    setRole(newRole);
    setUsername(newUsername);
    navigate("/dashboard");
  };

  const handleLogout = async () => {
    try {
      await fetch(`${SOCKET_URL}/api/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch (err) {
      console.error("Logout failed:", err);
    } finally {
      localStorage.removeItem("isLoggedIn");
      localStorage.removeItem("userRole");
      localStorage.removeItem("username");
      setIsAuthenticated(false);
      setRole("User");
      setUsername("");
    }
  };

  const lowerRole = role.toLowerCase();
  const isAdminOrStore = lowerRole === "admin" || lowerRole === "store";

  if (loading) {
    return (
      <div className="global-loader-container">
        <div className="main-pulse-loader"></div>
        <p className="loading-text">Synchronizing...</p>
      </div>
    );
  }

  return (
    <div
      className={isAuthenticated ? "dashboard-layout-wrapper" : "auth-wrapper"}
    >
      <audio ref={audioRef} src="/notification.wav" />

      {toast.message && (
        <ToastNotification
          message={toast.message}
          type={toast.type}
          onClose={() => setToast({ message: "", type: "", path: "" })}
          onClick={() => {
            if (toast.path) navigate(toast.path);
            setToast({ message: "", type: "", path: "" });
          }}
        />
      )}

      {isAuthenticated && <Sidebar role={role} onLogout={handleLogout} />}

      <div className={isAuthenticated ? "dashboard-main-area" : "full-page"}>
        <Routes>
          <Route
            path="/"
            element={
              <Navigate
                to={isAuthenticated ? "/dashboard" : "/login"}
                replace
              />
            }
          />
          <Route
            path="/login"
            element={
              !isAuthenticated ? (
                <Login onLoginSuccess={handleLogin} />
              ) : (
                <Navigate to="/dashboard" replace />
              )
            }
          />
          <Route
            path="/dashboard"
            element={
              isAuthenticated ? (
                <Dashboard role={role} />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route
            path="/items"
            element={
              isAuthenticated ? (
                <Items role={role} username={username} />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route
            path="/requests"
            element={
              isAuthenticated ? (
                <Requests role={role} />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route
            path="/settings"
            element={
              isAuthenticated ? (
                <Settings role={role} />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />

          <Route
            path="/inventory"
            element={
              isAuthenticated && isAdminOrStore ? (
                <Inventory role={role} />
              ) : (
                <Navigate to="/items" replace />
              )
            }
          />
          <Route
            path="/reports"
            element={
              isAuthenticated && isAdminOrStore ? (
                <Reports role={role} />
              ) : (
                <Navigate to="/dashboard" replace />
              )
            }
          />
          <Route
            path="/audit-log"
            element={
              isAuthenticated && lowerRole === "admin" ? (
                <AuditLog role={role} />
              ) : (
                <Navigate to="/dashboard" replace />
              )
            }
          />
          <Route
            path="/stock-history"
            element={
              isAuthenticated && isAdminOrStore ? (
                <StockHistory role={role} />
              ) : (
                <Navigate to="/dashboard" replace />
              )
            }
          />
          <Route
            path="/manage-inventory"
            element={
              isAuthenticated && isAdminOrStore ? (
                <ManageInventory role={role} />
              ) : (
                <Navigate to="/items" replace />
              )
            }
          />
          <Route
            path="/user-management"
            element={
              isAuthenticated && lowerRole === "admin" ? (
                <UserManagement role={role} socket={socket} />
              ) : (
                <Navigate to="/dashboard" replace />
              )
            }
          />

          <Route
            path="/request-stock"
            element={
              (isAuthenticated && isAdminOrStore) ||
              lowerRole === "hr_available" ||
              lowerRole === "hr_purchase" ? (
                <RequestStock role={role} />
              ) : (
                <Navigate to="/dashboard" replace />
              )
            }
          />

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </div>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
