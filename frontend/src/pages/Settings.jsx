import React, { useState } from "react";
import Notification from "../components/Notification";
import "../styles/Settings.css";

const API_BASE = import.meta.env.VITE_API_URL;

const Settings = () => {
  const [notify, setNotify] = useState({ message: "", type: "" });
  const [isUpdating, setIsUpdating] = useState(false);
  const [passwords, setPasswords] = useState({
    current: "",
    new: "",
    confirm: "",
  });

  const [notifsEnabled, setNotifsEnabled] = useState(
    JSON.parse(localStorage.getItem("notifications_enabled") ?? "true"),
  );

  const handleToggleNotifs = () => {
    const newState = !notifsEnabled;
    setNotifsEnabled(newState);
    localStorage.setItem("notifications_enabled", JSON.stringify(newState));
    setNotify({
      message: `Notifications ${newState ? "Enabled" : "Disabled"}`,
      type: "success",
    });
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();

    // 1. Client-side Validation
    if (passwords.new.length < 6) {
      return setNotify({
        message: "New password must be at least 6 characters.",
        type: "error",
      });
    }

    if (passwords.new !== passwords.confirm) {
      return setNotify({
        message: "New passwords do not match",
        type: "error",
      });
    }

    setIsUpdating(true);

    try {
      const res = await fetch(`${API_BASE}/auth/change-password`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          currentPassword: passwords.current,
          newPassword: passwords.new,
        }),
        credentials: "include",
      });

      const data = await res.json();

      if (res.ok) {
        setNotify({
          message: "Password updated successfully!",
          type: "success",
        });
        setPasswords({ current: "", new: "", confirm: "" });
      } else {
        setNotify({
          message: data.error || "Failed to update password",
          type: "error",
        });
      }
    } catch (err) {
      setNotify({
        message: "Network error. Please check your connection.",
        type: "error",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="dashboard-content-wrapper">
      <Notification
        message={notify.message}
        type={notify.type}
        onClose={() => setNotify({ message: "", type: "" })}
      />

      <div className="table-section-card">
        <div className="table-header">
          <div>
            <h2 className="table-header">Account Settings</h2>
            <p className="sub-text">
              Modify your profile security and app preferences.
            </p>
          </div>
        </div>

        <div className="settings-content-body">
          <div className="settings-flat-row">
            <div className="settings-meta">
              <span className="date-main">System Notifications</span>
              <p className="time-sub">
                Get real-time updates on your item requests.
              </p>
            </div>
            <div className="settings-action">
              <label className="switch">
                <input
                  type="checkbox"
                  checked={notifsEnabled}
                  onChange={handleToggleNotifs}
                />
                <span className="slider round"></span>
              </label>
              <span
                className={`type-badge ${notifsEnabled ? "type-new" : "type-issue"}`}
                style={{ marginLeft: "12px" }}
              >
                {notifsEnabled ? "Enabled" : "Disabled"}
              </span>
            </div>
          </div>

          <div className="settings-flat-row no-border">
            <div className="settings-meta" style={{ marginBottom: "20px" }}>
              <span className="date-main">Security & Password</span>
              <p className="time-sub">
                Manage your account access and credentials.
              </p>
            </div>

            <form
              className="settings-integrated-form"
              onSubmit={handleChangePassword}
            >
              <div className="field-group">
                <label className="time-sub">Current Password</label>
                <input
                  type="password"
                  className="table-search"
                  required
                  value={passwords.current}
                  onChange={(e) =>
                    setPasswords({ ...passwords, current: e.target.value })
                  }
                />
              </div>

              <div className="field-grid">
                <div className="field-group">
                  <label className="time-sub">New Password</label>
                  <input
                    type="password"
                    className="table-search"
                    required
                    value={passwords.new}
                    onChange={(e) =>
                      setPasswords({ ...passwords, new: e.target.value })
                    }
                  />
                </div>
                <div className="field-group">
                  <label className="time-sub">Confirm Password</label>
                  <input
                    type="password"
                    className="table-search"
                    required
                    value={passwords.confirm}
                    onChange={(e) =>
                      setPasswords({ ...passwords, confirm: e.target.value })
                    }
                  />
                </div>
              </div>

              <button
                type="submit"
                className={`siv-pill btn-update ${isUpdating ? "loading" : ""}`}
                disabled={isUpdating}
              >
                {isUpdating ? "Updating..." : "Save Password Changes"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
