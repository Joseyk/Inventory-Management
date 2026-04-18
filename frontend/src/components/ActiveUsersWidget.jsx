import React, { useEffect, useState } from "react";
import Pagination from "../components/Pagination";
import "../styles/ActiveUsersWidget.css";

const API_BASE = import.meta.env.VITE_API_URL;

const ActiveUsersWidget = ({ socket, setNotify }) => {
  const [activeUsers, setActiveUsers] = useState([]);
  const [isKilling, setIsKilling] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  useEffect(() => {
    if (!socket) return;

    const handleUpdate = (users) => {
      setActiveUsers(users);

      const totalPages = Math.ceil(users.length / itemsPerPage);
      if (currentPage > totalPages && totalPages > 0) {
        setCurrentPage(totalPages);
      }
    };

    socket.on("active_users_update", handleUpdate);
    socket.emit("request_active_users");

    return () => socket.off("active_users_update", handleUpdate);
  }, [socket, currentPage, itemsPerPage]);

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentUsers = activeUsers.slice(indexOfFirstItem, indexOfLastItem);

  const handleKillSession = async (targetUsername) => {
    setIsKilling(targetUsername);
    try {
      const res = await fetch(`${API_BASE}/admin/kill-session`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUsername }),
      });

      const data = await res.json();
      if (res.ok) {
        setNotify({
          message: `Successfully terminated ${targetUsername}'s session.`,
          type: "success",
        });
      } else {
        setNotify({
          message: data.error || "Failed to kill session",
          type: "error",
        });
      }
    } catch (err) {
      setNotify({ message: "Network error: Connection failed", type: "error" });
    } finally {
      setIsKilling(null);
    }
  };

  if (!socket) return null;

  return (
    <section className="table-section-card" style={{ marginBottom: "1.5rem" }}>
      <div className="active-users-panel">
        <h4 className="active-header">
          <span className="live-badge">LIVE</span>
          Online Users ({activeUsers.length})
        </h4>
        <div className="active-list">
          {activeUsers.length === 0 ? (
            <p className="no-users">No other users online</p>
          ) : (
            <>
              {currentUsers.map((user) => (
                <div key={user} className="active-user-item">
                  <div className="user-info-left">
                    <span className="status-indicator online"></span>
                    <span className="user-name-text">{user}</span>
                  </div>
                  <button
                    className="widget-kill-btn"
                    onClick={() => handleKillSession(user)}
                    disabled={isKilling !== null}
                  >
                    {isKilling === user ? "..." : "Terminate"}
                  </button>
                </div>
              ))}
            </>
          )}
        </div>

        {activeUsers.length > itemsPerPage && (
          <div className="widget-pagination-wrapper">
            <Pagination
              currentPage={currentPage}
              totalItems={activeUsers.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>
    </section>
  );
};

export default ActiveUsersWidget;
