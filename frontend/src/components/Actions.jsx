import React, { useState } from "react";
import "../styles/Actions.css";

const Actions = ({ label, onConfirm, message, className, disabled }) => {
  const [showModal, setShowModal] = useState(false);

  const handleConfirm = () => {
    onConfirm();
    setShowModal(false);
  };

  return (
    <>
      <button
        className={`action-btn ${className}`}
        onClick={() => setShowModal(true)}
        disabled={disabled}
      >
        {label}
      </button>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Confirm Action</h3>
            <p>{message}</p>
            <div className="modal-actions">
              <button
                className="cancel-btn"
                onClick={() => setShowModal(false)}
              >
                Cancel
              </button>
              <button className="confirm-btn" onClick={handleConfirm}>
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Actions;
