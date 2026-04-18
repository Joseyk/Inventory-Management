const express = require("express");
const router = express.Router();
const pool = require("../lib/db");
const authenticateToken = require("../middleware/auth");

console.log("Stock Request Routes Loaded");

router.get("/", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT sr.*, u.username 
      FROM stock_requests sr
      LEFT JOIN users u ON sr.user_id = u.id
      ORDER BY sr.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error("GET STOCK REQUESTS ERROR:", err.message);
    res.status(500).json({ error: `Database Error: ${err.message}` });
  }
});

router.post("/create", authenticateToken, async (req, res) => {
  const { item_name, quantity, branch } = req.body;
  const userId = req.user.id;
  const username = req.user.username;

  try {
    const result = await pool.query(
      `INSERT INTO stock_requests (item_name, quantity, branch, user_id, status) 
       VALUES ($1, $2, $3, $4, 'Pending') RETURNING *`,
      [item_name, quantity, branch, userId],
    );

    const newRequest = result.rows[0];
    const io = req.app.get("io");
    if (io) {
      io.to("admin_room").emit("request_sent", {
        ...newRequest,
        username: username,
        request_type: "Stock Request",
      });
    }

    res.status(201).json(newRequest);
  } catch (err) {
    console.error("Error creating stock request:", err);
    res.status(500).json({ error: "Failed to create request" });
  }
});

router.patch("/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { status, action_by } = req.body;

  try {
    const result = await pool.query(
      "UPDATE stock_requests SET status = $1, action_by = $2 WHERE id = $3 RETURNING *",
      [status, action_by, id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Request not found" });
    }

    const updatedRequest = result.rows[0];

    const userResult = await pool.query(
      "SELECT username FROM users WHERE id = $1",
      [updatedRequest.user_id],
    );
    const requestorUsername = userResult.rows[0].username;

    const io = req.app.get("io");
    if (io) {
      io.to("admin_room").emit("stock_request_updated", {
        item_name: updatedRequest.item_name,
        quantity: updatedRequest.quantity,
        branch: updatedRequest.branch,
        username: requestorUsername,
        status: updatedRequest.status,
        request_type: "Stock Request", // Explicitly set
      });

      io.to(requestorUsername).emit("request_status_updated", {
        item_name: updatedRequest.item_name,
        status: updatedRequest.status,
        username: requestorUsername,
        request_type: "Stock Request",
      });
    }

    res.json(updatedRequest);
  } catch (err) {
    console.error("Error updating stock request:", err);
    res.status(500).json({ error: "Database error" });
  }
});

module.exports = router;
