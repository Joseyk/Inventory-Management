const express = require("express");
const router = express.Router();
const db = require("../lib/db");
const authenticateToken = require("../middleware/auth");

router.use(authenticateToken);

router.get("/", async (req, res) => {
  try {
    const result = await db.query(`
      SELECT *, 
      TO_CHAR(created_at, 'DD/MM/YYYY HH24:MI') as formatted_date 
      FROM items 
      ORDER BY id DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/stock-history", async (req, res) => {
  try {
    const result = await db.query(`
      SELECT * FROM stock_entries 
      ORDER BY created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/", async (req, res) => {
  const {
    name,
    quantity,
    category,
    brand,
    model,
    serial_number,
    supplier,
    grv_number,
    price,
  } = req.body;
  const changedBy = req.user.username || "Unknown User";

  try {
    const result = await db.query(
      `INSERT INTO items 
       (name, quantity, category, brand, model, serial_number, supplier, grv_number, price)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
       RETURNING *`,
      [
        name,
        quantity,
        category,
        brand,
        model,
        serial_number,
        supplier,
        grv_number,
        price,
      ],
    );

    const newItem = result.rows[0];

    await db.query(
      `INSERT INTO stock_entries (item_id, item_name, qty_added, unit_price, grv_number, entry_type) 
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [newItem.id, name, quantity, price, grv_number, "INITIAL_ENTRY"],
    );

    await db.query(
      `INSERT INTO inventory_logs (item_name, action_type, old_quantity, new_quantity, changed_by)
       VALUES ($1, 'CREATE', 0, $2, $3)`,
      [name, quantity, changedBy],
    );

    res.status(201).json(newItem);
  } catch (err) {
    console.error("Error creating item:", err.message);
    res.status(500).json({ error: err.message });
  }
});
router.post("/release-stock", async (req, res) => {
  const { item_id, quantity_to_release, siv_no, receiver } = req.body;
  const username = req.user.username;

  const client = await db.connect();
  try {
    await client.query("BEGIN");

    const itemCheck = await client.query(
      "SELECT name, quantity, price FROM items WHERE id = $1",
      [item_id],
    );

    if (itemCheck.rows.length === 0) throw new Error("Item not found");

    const item = itemCheck.rows[0];
    if (item.quantity < quantity_to_release) {
      throw new Error(`Insufficient stock. Available: ${item.quantity}`);
    }

    const newQty = Number(item.quantity) - Number(quantity_to_release);

    await client.query("UPDATE items SET quantity = $1 WHERE id = $2", [
      newQty,
      item_id,
    ]);

    await client.query(
      `INSERT INTO stock_entries (item_id, item_name, qty_added, unit_price, siv_no, entry_type) 
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        item_id,
        item.name,
        -quantity_to_release,
        item.price,
        siv_no,
        "STOCK_ISSUE",
      ],
    );

    await client.query(
      `INSERT INTO inventory_logs (item_name, action_type, old_quantity, new_quantity, changed_by)
       VALUES ($1, 'STOCK_ISSUE', $2, $3, $4)`,
      [item.name, item.quantity, newQty, username],
    );

    await client.query("COMMIT");
    res.json({ message: "Stock released successfully", newQuantity: newQty });
  } catch (err) {
    await client.query("ROLLBACK");
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

router.put("/add-stock/:id", async (req, res) => {
  const { id } = req.params;
  const { qtyDifference, newPrice, newGrv } = req.body;
  const username = req.user.username;

  const client = await db.connect();
  try {
    await client.query("BEGIN");

    const itemCheck = await client.query(
      "SELECT name, quantity, price FROM items WHERE id = $1",
      [id],
    );
    if (itemCheck.rows.length === 0) throw new Error("Item not found");

    const {
      name: itemName,
      quantity: currentQty,
      price: oldPrice,
    } = itemCheck.rows[0];

    const existingTotalValue = Number(currentQty) * Number(oldPrice);
    const newBatchValue = Number(qtyDifference) * Number(newPrice);
    const finalTotalValue = existingTotalValue + newBatchValue;
    const newTotalQty = Number(currentQty) + Number(qtyDifference);
    const adjustedUnitPrice = finalTotalValue / newTotalQty;

    const updateItem = await client.query(
      `UPDATE items SET quantity = $1, price = $2, grv_number = $3 WHERE id = $4 RETURNING *`,
      [newTotalQty, adjustedUnitPrice, newGrv, id],
    );

    await client.query(
      `INSERT INTO stock_entries (item_id, item_name, qty_added, unit_price, grv_number, entry_type) 
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [id, itemName, qtyDifference, newPrice, newGrv, "RESTOCK"],
    );

    await client.query(
      `INSERT INTO inventory_logs (item_name, action_type, old_quantity, new_quantity, changed_by)
       VALUES ($1, 'STOCK_ARRIVAL', $2, $3, $4)`,
      [itemName, currentQty, newTotalQty, username],
    );

    await client.query("COMMIT");
    res.json({ message: "Stock arrival recorded", item: updateItem.rows[0] });
  } catch (err) {
    await client.query("ROLLBACK");
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const {
    name,
    quantity,
    category,
    brand,
    model,
    serial_number,
    supplier,
    grv_number,
    price,
  } = req.body;
  const changedBy = req.user.username || "Unknown User";

  try {
    const oldItem = await db.query("SELECT quantity FROM items WHERE id = $1", [
      id,
    ]);
    if (oldItem.rows.length === 0)
      return res.status(404).json({ error: "Item not found" });

    const result = await db.query(
      `UPDATE items 
       SET name = $1, quantity = $2, category = $3, brand = $4, model = $5, 
           serial_number = $6, supplier = $7, grv_number = $8, price = $9
       WHERE id = $10 RETURNING *`,
      [
        name,
        quantity,
        category,
        brand,
        model,
        serial_number,
        supplier,
        grv_number,
        price,
        id,
      ],
    );

    await db.query(
      `INSERT INTO inventory_logs (item_name, action_type, old_quantity, new_quantity, changed_by)
       VALUES ($1, 'UPDATE', $2, $3, $4)`,
      [name, oldItem.rows[0].quantity, quantity, changedBy],
    );

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  const changedBy = req.user.username || "Unknown User";

  try {
    const result = await db.query(
      "DELETE FROM items WHERE id = $1 RETURNING *",
      [id],
    );
    if (result.rows.length === 0)
      return res.status(404).json({ error: "Item not found" });

    await db.query(
      `INSERT INTO inventory_logs (item_name, action_type, changed_by)
       VALUES ($1, 'DELETE', $2)`,
      [result.rows[0].name, changedBy],
    );

    res.json({ message: "Item deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
