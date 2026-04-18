import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Notification from "../components/Notification";
import Actions from "../components/Actions";
import SkeletonRow from "../components/SkeletonRow";
import Pagination from "../components/Pagination";
import "../styles/UserManagement.css";
import ActiveUsersWidget from "../components/ActiveUsersWidget";

const API_BASE = import.meta.env.VITE_API_URL;

const UserManagement = ({ role, socket }) => {
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(2);

  const [formData, setFormData] = useState({
    username: "",
    password: "",
    role: "user",
    branch: "Main",
  });
  const [notify, setNotify] = useState({ message: "", type: "" });
  const [isUpdating, setIsUpdating] = useState(null);
  const [pendingRoles, setPendingRoles] = useState({});
  const [pendingBranches, setPendingBranches] = useState({});
  const [resetData, setResetData] = useState({});

  const ADMIN_API = `${API_BASE}/admin`;
  const navigate = useNavigate();

  const currentRole = role
    ? role.toLowerCase()
    : localStorage.getItem("userRole");

  const roles = [
    "admin",
    "office_admin",
    "hr_available",
    "hr_purchase",
    "user",
    "store",
  ];

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
    if (currentRole !== "admin") navigate("/");
  }, [currentRole, navigate]);

  const fetchUsers = async () => {
    try {
      const res = await fetch(`${ADMIN_API}/users`, {
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      if (res.status === 401) return console.error("Not authorized");
      const data = await res.json();
      setUsers(data);
    } catch (err) {
      console.error("Error fetching users:", err);
    } finally {
      setTimeout(() => setLoading(false), 500);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const handleUsernameChange = (e) => {
    const value = e.target.value;
    const capitalizedValue = value.charAt(0).toUpperCase() + value.slice(1);
    setFormData({ ...formData, username: capitalizedValue });
  };

  const handleSearchChange = (e) => {
    const value = e.target.value;
    const capitalizedSearch = value.charAt(0).toUpperCase() + value.slice(1);
    setSearchTerm(capitalizedSearch);
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (formData.password.length < 6) {
      setNotify({
        message: "Password must be at least 6 characters",
        type: "error",
      });
      return;
    }
    setIsUpdating("creating");
    try {
      const res = await fetch(`${ADMIN_API}/create-user`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (res.ok) {
        setNotify({ message: "User created successfully!", type: "success" });
        setFormData({
          username: "",
          password: "",
          role: "user",
          branch: "Main",
        });
        fetchUsers();
      } else {
        setNotify({
          message: data.error || "Failed to create user",
          type: "error",
        });
      }
    } catch (err) {
      setNotify({ message: "Network error", type: "error" });
    } finally {
      setIsUpdating(null);
    }
  };

  const handleUpdateRole = async (id, username) => {
    const newRole = pendingRoles[id];
    setIsUpdating(id);
    try {
      const res = await fetch(`${ADMIN_API}/update-role/${id}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      if (res.ok) {
        setNotify({
          message: `Updated ${username} to ${newRole}`,
          type: "success",
        });
        setPendingRoles((prev) => {
          const n = { ...prev };
          delete n[id];
          return n;
        });
        fetchUsers();
      }
    } finally {
      setIsUpdating(null);
    }
  };

  const handleUpdateBranch = async (id, username) => {
    const newBranch = pendingBranches[id];
    if (!newBranch) return;
    setIsUpdating(id);
    try {
      const res = await fetch(`${ADMIN_API}/update-branch/${id}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ branch: newBranch }),
      });
      if (res.ok) {
        setNotify({
          message: `${username} moved to ${newBranch}`,
          type: "success",
        });
        setPendingBranches((prev) => {
          const updated = { ...prev };
          delete updated[id];
          return updated;
        });
        fetchUsers();
      }
    } finally {
      setIsUpdating(null);
    }
  };

  const handleResetPassword = async (id, username) => {
    const { password, confirm } = resetData[id] || {};
    if (!password || password.length < 6 || password !== confirm) return;
    setIsUpdating(id);
    try {
      const res = await fetch(`${ADMIN_API}/reset-password/${id}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword: password }),
      });
      if (res.ok) {
        setNotify({
          message: `Password reset for ${username}`,
          type: "success",
        });
        setResetData((prev) => {
          const n = { ...prev };
          delete n[id];
          return n;
        });
      }
    } finally {
      setIsUpdating(null);
    }
  };

  const handleDeleteUser = async (id, username) => {
    setIsUpdating(id);
    try {
      const res = await fetch(`${ADMIN_API}/delete-user/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        setNotify({ message: `${username} removed`, type: "success" });
        fetchUsers();
      }
    } finally {
      setIsUpdating(null);
    }
  };

  const filteredUsers =
    searchTerm.trim() !== ""
      ? users.filter((u) =>
          u.username.toLowerCase().includes(searchTerm.toLowerCase()),
        )
      : [];

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentUsers = filteredUsers.slice(indexOfFirstItem, indexOfLastItem);

  return (
    <div className="dashboard-content-wrapper">
      <Notification
        message={notify.message}
        type={notify.type}
        onClose={() => setNotify({ message: "", type: "" })}
      />

      <section className="table-section-card" style={{ marginBottom: "2rem" }}>
        <div className="table-header">
          <div>
            <h2 className="table-header">User Registration</h2>
            <p className="sub-text">
              Create new administrative or standard user accounts
            </p>
          </div>
        </div>
        <div className="um-action-bar">
          <form onSubmit={handleCreateUser} className="um-creation-form">
            <div className="um-input-wrapper">
              <label>Username</label>
              <input
                type="text"
                value={formData.username}
                onChange={handleUsernameChange}
                placeholder="username..."
                required
              />
            </div>
            <div className="um-input-wrapper">
              <label>Initial Password</label>
              <input
                type="password"
                value={formData.password}
                placeholder="password..."
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                required
              />
            </div>
            <div className="um-input-wrapper">
              <label>Role</label>
              <select
                value={formData.role}
                onChange={(e) =>
                  setFormData({ ...formData, role: e.target.value })
                }
              >
                {roles.map((r) => (
                  <option key={r} value={r}>
                    {r.toUpperCase().replace("_", " ")}
                  </option>
                ))}
              </select>
            </div>
            <div className="um-input-wrapper">
              <label>Branch</label>
              <select
                value={formData.branch}
                onChange={(e) =>
                  setFormData({ ...formData, branch: e.target.value })
                }
              >
                {branches.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              className="um-submit-btn"
              disabled={isUpdating === "creating"}
            >
              {isUpdating === "creating" ? "..." : "Register"}
            </button>
          </form>
        </div>
      </section>

      <ActiveUsersWidget socket={socket} setNotify={setNotify} />

      <section className="table-section-card">
        <div className="table-header">
          <div>
            <h2 className="table-header">User Directory</h2>
            <p className="sub-text">
              Search and manage existing user permissions and security
            </p>
          </div>
          <div className="table-controls">
            <input
              type="text"
              className="table-search"
              placeholder="Search users..."
              value={searchTerm}
              onChange={handleSearchChange}
            />
          </div>
        </div>
        <div className="um-table-wrapper">
          <table className="custom-dashboard-table">
            <thead>
              <tr>
                <th>System User</th>
                <th>Status & Location</th>
                <th>Modify Access</th>
                <th>Security & Management</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(5)].map((_, index) => <SkeletonRow key={index} />)
              ) : searchTerm.trim() === "" ? (
                <tr>
                  <td colSpan="4" className="um-no-results">
                    Please search for a user to manage.
                  </td>
                </tr>
              ) : currentUsers.length > 0 ? (
                currentUsers.map((user) => {
                  const userId = user.id || user._id;
                  const roleChanged =
                    pendingRoles[userId] && pendingRoles[userId] !== user.role;
                  const branchChanged =
                    pendingBranches[userId] &&
                    pendingBranches[userId] !== user.branch;
                  const pass = resetData[userId]?.password || "";
                  const conf = resetData[userId]?.confirm || "";
                  const canReset = pass.length >= 6 && pass === conf;

                  return (
                    <tr
                      key={userId}
                      className={isUpdating === userId ? "row-pending" : ""}
                    >
                      <td className="um-user-cell">
                        <div className="um-avatar">
                          {user.username.charAt(0)}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600 }}>{user.username}</div>
                          <div style={{ fontSize: "0.7rem", color: "#64748b" }}>
                            ID: {userId}
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`um-pill ${user.role}`}>
                          {user.role.replace("_", " ")}
                        </span>
                        <div className="sub-text" style={{ marginTop: "4px" }}>
                          📍 {user.branch || "Main"}
                        </div>
                      </td>
                      <td>
                        <div className="um-role-action-group">
                          <select
                            className="um-select-inline"
                            value={pendingRoles[userId] || user.role}
                            onChange={(e) =>
                              setPendingRoles({
                                ...pendingRoles,
                                [userId]: e.target.value,
                              })
                            }
                          >
                            {roles.map((r) => (
                              <option key={r} value={r}>
                                {r.toUpperCase().replace("_", " ")}
                              </option>
                            ))}
                          </select>
                          {roleChanged && (
                            <Actions
                              label="Update"
                              className="um-btn-update"
                              message={`Update role to ${pendingRoles[userId]}?`}
                              onConfirm={() =>
                                handleUpdateRole(userId, user.username)
                              }
                            />
                          )}
                        </div>
                        <div
                          className="um-role-action-group"
                          style={{ marginTop: "8px" }}
                        >
                          <select
                            className="um-select-inline"
                            value={
                              pendingBranches[userId] || user.branch || "Main"
                            }
                            onChange={(e) =>
                              setPendingBranches({
                                ...pendingBranches,
                                [userId]: e.target.value,
                              })
                            }
                          >
                            {branches.map((b) => (
                              <option key={b} value={b}>
                                {b}
                              </option>
                            ))}
                          </select>
                          {branchChanged && (
                            <Actions
                              label="Move"
                              className="um-btn-update"
                              message={`Move ${user.username} to ${pendingBranches[userId]} branch?`}
                              onConfirm={() =>
                                handleUpdateBranch(userId, user.username)
                              }
                            />
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="um-security-column">
                          <div
                            className={`um-password-form ${
                              pass !== conf && conf !== ""
                                ? "pass-mismatch"
                                : ""
                            }`}
                          >
                            <div className="um-pass-inputs">
                              <input
                                type="password"
                                placeholder="New"
                                className="um-password-input"
                                value={pass}
                                onChange={(e) =>
                                  setResetData({
                                    ...resetData,
                                    [userId]: {
                                      ...resetData[userId],
                                      password: e.target.value,
                                    },
                                  })
                                }
                              />
                              <input
                                type="password"
                                placeholder="Conf"
                                className="um-password-input"
                                value={conf}
                                onChange={(e) =>
                                  setResetData({
                                    ...resetData,
                                    [userId]: {
                                      ...resetData[userId],
                                      confirm: e.target.value,
                                    },
                                  })
                                }
                              />
                            </div>
                            {canReset && (
                              <Actions
                                label="Save"
                                className="um-btn-secondary"
                                message={`Reset password for ${user.username}?`}
                                onConfirm={() =>
                                  handleResetPassword(userId, user.username)
                                }
                              />
                            )}
                          </div>
                          <div className="um-danger-actions">
                            <Actions
                              label="Terminate"
                              className="um-btn-danger"
                              message={`Permanently delete ${user.username}?`}
                              onConfirm={() =>
                                handleDeleteUser(userId, user.username)
                              }
                            />
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="4" className="um-no-results">
                    No matches for "{searchTerm}"
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {!loading && filteredUsers.length > itemsPerPage && (
            <div style={{ marginTop: "1.5rem" }}>
              <Pagination
                currentPage={currentPage}
                totalItems={filteredUsers.length}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default UserManagement;
