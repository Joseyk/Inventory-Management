import React from "react";
import "../styles/SkeletonRow.css";

const SkeletonRow = ({ isManagePage }) => {
  return (
    <tr className="skeleton-row">
      <td>
        <div className="skeleton-text skeleton-title"></div>
        <div className="skeleton-text skeleton-subtitle"></div>
      </td>
      {isManagePage && (
        <td>
          <div className="skeleton-text"></div>
        </td>
      )}
      <td>
        <div className="skeleton-pill"></div>
      </td>
      {isManagePage && (
        <>
          <td>
            <div className="skeleton-text"></div>
          </td>
          <td>
            <div className="skeleton-pill"></div>
          </td>
        </>
      )}
      <td>
        <div className="skeleton-text small"></div>
      </td>
      {isManagePage && (
        <>
          <td>
            <div className="skeleton-text"></div>
          </td>
          <td>
            <div className="skeleton-text"></div>
          </td>
        </>
      )}
      <td>
        <div className="skeleton-btn"></div>
      </td>
    </tr>
  );
};

export default SkeletonRow;
