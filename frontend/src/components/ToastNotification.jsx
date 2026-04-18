import React, { useEffect } from "react";
import "../styles/ToastNotification.css";

const ToastNotification = ({
  message,
  type,
  onClose,
  onClick,
  duration = 5000,
}) => {
  useEffect(() => {
    if (!message) return;

    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [message, duration, onClose]);

  if (!message) return null;

  return (
    <div
      className={`toast-container ${type}`}
      onClick={onClick}
      style={{ cursor: "pointer" }}
    >
      <div className="toast-content">
        <span className="toast-message">{message}</span>
        <button
          className="toast-close"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
        >
          ×
        </button>
      </div>
    </div>
  );
};

export default ToastNotification;
