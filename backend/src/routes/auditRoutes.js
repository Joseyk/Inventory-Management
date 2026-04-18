const express = require("express");
const router = express.Router();
const db = require("../lib/db");
const authenticateToken = require("../middleware/auth");

router.get("/", authenticateToken, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT *, 
      TO_CHAR(created_at, 'DD/MM/YYYY HH24:MI:SS') as formatted_time 
      FROM inventory_logs 
      ORDER BY created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error("Audit Log Error:", err.message);
    res.status(500).json({ error: "Failed to fetch logs" });
  }
});

module.exports = router;
