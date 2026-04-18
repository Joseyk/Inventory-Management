const express = require("express");
const router = express.Router();
const pool = require("../lib/db");
const authenticateToken = require("../middleware/auth");

router.use(authenticateToken);

router.patch("/release/:id", async (req, res) => {
  const { id } = req.params;
  const { siv_no, released_at } = req.body;
  const currentUsername = req.user.username;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const requestCheck = await client.query(
      "SELECT item_id, quantity, item_name FROM requests WHERE id = $1",
      [id],
    );

    if (requestCheck.rows.length === 0)
      throw new Error("Request record not found.");

    const { item_id, quantity: qtyToDeduct, item_name } = requestCheck.rows[0];

    const itemResult = await client.query(
      "SELECT quantity, price FROM items WHERE id = $1",
      [item_id],
    );

    if (itemResult.rows.length === 0)
      throw new Error("Item not found in inventory.");

    const { quantity: currentStock, price: currentPrice } = itemResult.rows[0];

    if (currentStock < qtyToDeduct) {
      throw new Error(
        `Insufficient stock. Only ${currentStock} available, but ${qtyToDeduct} requested.`,
      );
    }

    await client.query(
      "UPDATE requests SET status = 'Released', released_at = $1, released_by = $2, siv_no = $3 WHERE id = $4",
      [released_at || new Date().toISOString(), currentUsername, siv_no, id],
    );

    await client.query(
      "UPDATE items SET quantity = quantity - $1 WHERE id = $2",
      [qtyToDeduct, item_id],
    );

    await client.query(
      `INSERT INTO stock_entries (item_id, item_name, qty_added, unit_price, siv_no, entry_type) 
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [item_id, item_name, -qtyToDeduct, currentPrice, siv_no, "STOCK_ISSUE"],
    );

    await client.query(
      "INSERT INTO inventory_logs (item_name, action_type, changed_by) VALUES ($1, 'RELEASE', $2)",
      [item_name, currentUsername],
    );

    await client.query("COMMIT");
    res.json({
      message: "Released successfully, stock updated, and ledger recorded.",
    });
  } catch (err) {
    await client.query("ROLLBACK");
    res.status(400).json({ error: err.message });
  } finally {
    client.release();
  }
});

router.patch("/cancel/:id", async (req, res) => {
  const { id } = req.params;
  const { rejected_at } = req.body;
  const currentUsername = req.user.username;

  try {
    const result = await pool.query(
      `UPDATE requests SET status = 'Canceled', rejected_at = $1, rejected_by = $2 WHERE id = $3 AND status = 'Pending' RETURNING *`,
      [rejected_at, currentUsername, id],
    );
    if (result.rowCount === 0)
      return res.status(400).json({
        error:
          "Action denied: Request is already being processed or is closed.",
      });

    await pool.query(
      "INSERT INTO inventory_logs (item_name, action_type, changed_by) VALUES ($1, 'CANCEL', $2)",
      [result.rows[0].item_name, currentUsername],
    );

    const io = req.app.get("io");
    if (io) {
      io.to(result.rows[0].username).emit("request_status_updated", {
        item_name: result.rows[0].item_name,
        status: "Canceled",
        username: result.rows[0].username,
        request_type: result.rows[0].request_type,
      });
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch("/:id", async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  const currentUsername = req.user.username;

  try {
    const requestData = await pool.query(
      "SELECT item_id, quantity, item_name, request_type FROM requests WHERE id = $1",
      [id],
    );

    if (requestData.rows.length === 0) {
      return res.status(404).json({ error: "Request not found." });
    }

    const { item_id, quantity, item_name, request_type } = requestData.rows[0];

    if (updates.status === "Approved" && request_type === "Item Request") {
      const stockCheck = await pool.query(
        `SELECT i.quantity - COALESCE(SUM(r.quantity), 0) as effective_available
         FROM items i
         LEFT JOIN requests r ON r.item_id = i.id AND r.status IN ('Accepted', 'Approved') AND r.id != $1
         WHERE i.id = $2 GROUP BY i.quantity`,
        [id, item_id],
      );

      if (
        stockCheck.rows.length > 0 &&
        stockCheck.rows[0].effective_available < quantity
      ) {
        return res.status(400).json({ error: "Insufficient available stock." });
      }
    }

    if (updates.status === "Accepted") updates.accepted_by = currentUsername;
    if (updates.status === "Approved") updates.approved_by = currentUsername;
    if (updates.status === "Rejected") updates.rejected_by = currentUsername;

    const allowedColumns = [
      "status",
      "accepted_at",
      "accepted_by",
      "approved_at",
      "approved_by",
      "rejected_at",
      "rejected_by",
      "released_at",
      "released_by",
      "canceled_at",
      "siv_no",
    ];

    const filteredKeys = Object.keys(updates).filter((key) =>
      allowedColumns.includes(key),
    );
    const values = filteredKeys.map((key) => updates[key]);

    if (filteredKeys.length === 0)
      return res.status(400).json({ error: "No valid fields" });

    const setClause = filteredKeys
      .map((key, index) => `${key} = $${index + 1}`)
      .join(", ");

    const result = await pool.query(
      `UPDATE requests SET ${setClause} WHERE id = $${filteredKeys.length + 1} RETURNING *`,
      [...values, id],
    );

    await pool.query(
      "INSERT INTO inventory_logs (item_name, action_type, changed_by) VALUES ($1, $2, $3)",
      [result.rows[0].item_name, updates.status.toUpperCase(), currentUsername],
    );

    const io = req.app.get("io");
    if (
      io &&
      (updates.status === "Approved" || updates.status === "Rejected")
    ) {
      io.to(result.rows[0].username).emit("request_status_updated", {
        item_name: result.rows[0].item_name,
        status: updates.status,
        username: result.rows[0].username,
        request_type: result.rows[0].request_type,
      });
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT r.*, i.quantity AS current_stock, i.price AS item_price, i.grv_number AS item_grv FROM requests r LEFT JOIN items i ON r.item_id = i.id ORDER BY r.created_at DESC`,
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/user/:username", async (req, res) => {
  const { username } = req.params;
  try {
    const result = await pool.query(
      `SELECT r.*, i.quantity AS current_stock, i.price AS item_price, i.grv_number AS item_grv FROM requests r LEFT JOIN items i ON r.item_id = i.id WHERE r.username = $1 ORDER BY r.created_at DESC`,
      [username],
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/", async (req, res) => {
  const { item_id, item_name, request_type, quantity } = req.body;

  if (!req.user) {
    return res
      .status(401)
      .json({ error: "No user found in request. Please log in again." });
  }

  const userId = req.user.id;
  const username = req.user.username;
  const reqQty = quantity || 1;

  try {
    let officialBranch = "Main Office"; // Default fallback

    if (userId) {
      const userLookup = await pool.query(
        "SELECT branch FROM users WHERE id = $1",
        [userId],
      );
      if (userLookup.rows.length > 0 && userLookup.rows[0].branch) {
        officialBranch = userLookup.rows[0].branch;
      }
    }

    const result = await pool.query(
      `INSERT INTO requests (item_id, username, item_name, request_type, branch, status, quantity) 
       VALUES ($1, $2, $3, $4, $5, 'Pending', $6) 
       RETURNING *`,
      [
        item_id,
        username || "Unknown User",
        item_name || "Unknown Item",
        request_type || "Item Request",
        officialBranch,
        reqQty,
      ],
    );

    const newRequest = result.rows[0];

    const io = req.app.get("io");
    if (io) {
      io.to("admin_room").emit("request_sent", newRequest);
    }

    res.status(201).json(newRequest);
  } catch (err) {
    console.error("CRITICAL POST ERROR:", err.message);
    res.status(500).json({ error: `Database Error: ${err.message}` });
  }
});

module.exports = router;
