import React, { useState, useEffect } from "react";
import Notification from "../components/Notification";
import ItemRow from "../components/ItemRow";
import SkeletonRow from "../components/SkeletonRow";
import Pagination from "../components/Pagination";
import "../styles/ManageInventory.css";

const API_BASE = import.meta.env.VITE_API_URL;

const ManageInventory = ({ role }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [notify, setNotify] = useState({ message: "", type: "" });

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  const API_URL = `${API_BASE}/items`;

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await fetch(API_URL, {
        credentials: "include",
      });
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Fetch error:", err);
      setNotify({
        message: "Error connecting to inventory server.",
        type: "error",
      });
    } finally {
      setTimeout(() => setLoading(false), 500);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const handleUpdate = async (item, updatePayload) => {
    const newTotalQuantity =
      Number(item.quantity) + Number(updatePayload.quantity);

    const newPrice = updatePayload.price
      ? Number(updatePayload.price)
      : Number(item.price);

    const payload = {
      ...updatePayload,
      quantity: newTotalQuantity,
      price: newPrice,
    };

    setItems((prevItems) =>
      prevItems.map((i) =>
        i.id === item.id
          ? { ...i, quantity: newTotalQuantity, price: newPrice }
          : i,
      ),
    );

    try {
      const res = await fetch(`${API_BASE}/items/add-stock/${item.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (res.status === 401) {
        console.error("Cookie missing or expired");
        fetchItems();
        return;
      }

      if (res.ok) {
        setNotify({ message: "Stock updated successfully", type: "success" });
        fetchItems();
      } else {
        throw new Error("Update failed");
      }
    } catch (err) {
      console.error(err);
      setNotify({ message: "Update failed.", type: "error" });
      fetchItems();
    }
  };

  const handleDelete = async (id) => {
    const itemToDelete = items.find((i) => i.id === id);
    const itemName = itemToDelete ? itemToDelete.name : "Unknown Item";

    try {
      const res = await fetch(`${API_URL}/${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (res.ok) {
        setNotify({
          message: `${itemName} removed from system`,
          type: "success",
        });
        fetchItems();
      }
    } catch (err) {
      setNotify({ message: "Delete failed.", type: "error" });
    }
  };

  const filteredItems = items.filter((i) => {
    const search = searchTerm.toLowerCase();
    return (
      i.name?.toLowerCase().includes(search) ||
      i.brand?.toLowerCase().includes(search) ||
      i.model?.toLowerCase().includes(search) ||
      i.serial_number?.toLowerCase().includes(search) ||
      String(i.grv_number || "").includes(search) ||
      i.formatted_date?.includes(search)
    );
  });

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredItems.slice(indexOfFirstItem, indexOfLastItem);

  return (
    <div className="dashboard-content-wrapper">
      <Notification
        message={notify.message}
        type={notify.type}
        onClose={() => setNotify({ message: "", type: "" })}
      />

      <section className="table-section-card">
        <div className="table-header">
          <div className="header-titles">
            <h2 className="table-header">Inventory Editor</h2>
            <p className="sub-text">
              Search, modify stock levels, or remove items
            </p>
          </div>
          <div className="table-controls">
            <input
              type="text"
              placeholder="Search by Name, Brand, SN, or GRV..."
              className="table-search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="table-responsive-container">
          <table className="custom-dashboard-table">
            <thead>
              <tr>
                <th>Item Details</th>
                <th>Date Added</th>
                <th>Category</th>
                <th>Supplier</th>
                <th>Serial No.</th>
                <th>Stock</th>
                <th>Current GRV No.</th>
                <th>Total Value</th>
                <th>Management Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading
                ? [...Array(8)].map((_, index) => (
                    <SkeletonRow key={index} isManagePage={true} />
                  ))
                : currentItems.length > 0
                  ? currentItems.map((item) => (
                      <ItemRow
                        key={item.id}
                        item={item}
                        role={role}
                        isManagePage={true}
                        onDelete={handleDelete}
                        onUpdate={handleUpdate}
                      />
                    ))
                  : null}
            </tbody>
          </table>

          {!loading && filteredItems.length > 0 && (
            <Pagination
              currentPage={currentPage}
              totalItems={filteredItems.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
            />
          )}
        </div>

        {!loading && filteredItems.length === 0 && (
          <div className="no-results-container">
            <p className="no-results-text">No items found in registry.</p>
          </div>
        )}
      </section>
    </div>
  );
};

export default ManageInventory;
