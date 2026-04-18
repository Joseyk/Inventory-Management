import React, { useState, useEffect } from "react";
import "../styles/ItemForm.css";

const ItemForm = ({ onAdd, onWarning }) => {
  const [formData, setFormData] = useState({
    name: "",
    quantity: "",
    category: "",
    brand: "",
    model: "",
    serial_number: "",
    supplier: "",
    grv_number: "",
    price: "",
  });

  const [totalPrice, setTotalPrice] = useState(0);

  const categories = [
    "Furniture",
    "Electronics",
    "Computers",
    "Stationery",
    "Computer Accessories",
    "Office Supplies",
    "Cleaning Materials",
    "Office Machines",
    "Printed Items",
    "Vehicles",
    "Spare Parts",
    "Other",
  ];

  const capitalize = (str) =>
    str ? str.charAt(0).toUpperCase() + str.slice(1) : "";

  useEffect(() => {
    const qty = parseInt(formData.quantity, 10) || 0;
    const unitPrice = parseFloat(formData.price) || 0;
    setTotalPrice(qty * unitPrice);
  }, [formData.quantity, formData.price]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const isFormIncomplete = Object.values(formData).some(
      (value) => !value.toString().trim(),
    );

    if (isFormIncomplete) {
      onWarning("All fields are mandatory. Please fill in every field.");
      return;
    }

    const itemData = {
      ...formData,
      quantity: parseInt(formData.quantity, 10),
      grv_number: parseInt(formData.grv_number, 10),
      price: parseFloat(formData.price),
    };

    const success = await onAdd(itemData);

    if (success) {
      setFormData({
        name: "",
        quantity: "",
        category: "",
        brand: "",
        model: "",
        serial_number: "",
        supplier: "",
        grv_number: "",
        price: "",
      });
    }
  };

  return (
    <form className="item-form" onSubmit={handleSubmit}>
      <div className="form-grid">
        <input
          type="text"
          placeholder="Item Name"
          required
          value={formData.name}
          onChange={(e) =>
            setFormData({ ...formData, name: capitalize(e.target.value) })
          }
        />

        <input
          type="number"
          placeholder="Quantity"
          required
          min="1"
          value={formData.quantity}
          onChange={(e) =>
            setFormData({ ...formData, quantity: e.target.value })
          }
        />

        <input
          type="number"
          step="0.01"
          placeholder="Unit Price (ETB)"
          required
          value={formData.price}
          onChange={(e) => setFormData({ ...formData, price: e.target.value })}
        />

        <input
          type="text"
          placeholder="Total Value"
          readOnly
          value={
            totalPrice > 0
              ? `Total: ${totalPrice.toLocaleString()} ETB`
              : "Total: 0 ETB"
          }
          className="total-price"
        />

        <select
          required
          value={formData.category}
          onChange={(e) =>
            setFormData({ ...formData, category: e.target.value })
          }
        >
          <option value="" disabled>
            Select Category
          </option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>

        <input
          type="text"
          placeholder="Brand"
          required
          value={formData.brand}
          onChange={(e) =>
            setFormData({ ...formData, brand: capitalize(e.target.value) })
          }
        />

        <input
          type="text"
          placeholder="Model"
          required
          value={formData.model}
          onChange={(e) => setFormData({ ...formData, model: e.target.value })}
        />

        <input
          type="text"
          placeholder="Serial Number"
          required
          value={formData.serial_number}
          onChange={(e) =>
            setFormData({
              ...formData,
              serial_number: e.target.value.toUpperCase(),
            })
          }
        />

        <input
          type="text"
          placeholder="Supplier"
          required
          value={formData.supplier}
          onChange={(e) =>
            setFormData({ ...formData, supplier: capitalize(e.target.value) })
          }
        />

        <input
          type="number"
          placeholder="GRV Number"
          required
          value={formData.grv_number}
          onChange={(e) =>
            setFormData({ ...formData, grv_number: e.target.value })
          }
        />
      </div>
      <button type="submit" className="add-btn">
        Register Item
      </button>
    </form>
  );
};

export default ItemForm;
