require("dotenv").config();
const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const cookieParser = require("cookie-parser");
const http = require("http");
const { Server } = require("socket.io");
const pool = require("./lib/db");
const fs = require("fs");
const path = require("path");

const itemRoutes = require("./routes/itemRoutes");
const requestRoutes = require("./routes/requestRoutes");
const auditRoutes = require("./routes/auditRoutes");
const stockRequestRoutes = require("./routes/stockRequestRoutes");

const authenticateToken = require("./middleware/auth");

if (typeof authenticateToken !== "function") {
  console.error(
    "FATAL: authenticateToken is not a function. Check your exports in auth.js",
  );
}

const app = express();
const server = http.createServer(app);

// Socket.io Setup
const io = new Server(server, {
  cors: {
    origin: [
      process.env.FRONTEND_URL,
      "http://localhost:5173",
      "https://172.16.104.223:5009",
    ].filter(Boolean),
    credentials: true,
  },
});

app.set("io", io);

const userSockets = {};

io.on("connection", (socket) => {
  socket.on("join_room", async (roomOrName) => {
    const isSpecialRoom = ["admin_room", "store_room"].includes(roomOrName);
    socket.join(roomOrName);

    if (!isSpecialRoom) {
      const lowerName = roomOrName.toLowerCase();
      socket.username = lowerName;
      userSockets[lowerName] = socket.id;

      try {
        await pool.query(
          "UPDATE users SET last_seen = CURRENT_TIMESTAMP WHERE LOWER(username) = LOWER($1)",
          [roomOrName],
        );
        io.emit("active_users_update", Object.keys(userSockets));
      } catch (err) {
        console.error(err);
      }
    } else {
      socket.emit("active_users_update", Object.keys(userSockets));
    }
  });

  socket.on("request_active_users", () => {
    socket.emit("active_users_update", Object.keys(userSockets));
  });

  socket.on("disconnect", () => {
    if (socket.username) {
      delete userSockets[socket.username];
      io.emit("active_users_update", Object.keys(userSockets));
    }
  });
});

const allowedOrigins = [
  process.env.FRONTEND_URL,
  "https://inventory-management-1-ss7i.onrender.com",
  "http://localhost:5173",
  "https://172.16.104.223:5009",
].filter(Boolean);

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  }),
);

app.use(cookieParser());
app.use(express.json());

app.get("/api/auth/verify", (req, res) => {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ authenticated: false });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    res.json({
      authenticated: true,
      role: decoded.role,
      username: decoded.username,
    });
  } catch {
    res.status(401).json({ authenticated: false });
  }
});

app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;
  try {
    const userResult = await pool.query(
      "SELECT * FROM users WHERE LOWER(username) = LOWER($1)",
      [username.trim()],
    );
    if (userResult.rows.length === 0)
      return res.status(401).json({ error: "Invalid credentials" });

    const user = userResult.rows[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ error: "Invalid credentials" });

    const token = jwt.sign(
      { id: user.id, role: user.role, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: "24h" },
    );

    res.cookie("token", token, {
      httpOnly: true,
      secure: true,
      sameSite: "None",
      maxAge: 24 * 60 * 60 * 1000,
    });

    res.json({
      user: { username: user.username, role: user.role, branch: user.branch },
    });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/api/logout", (req, res) => {
  res.clearCookie("token", { httpOnly: true, secure: true, sameSite: "None" });
  res.json({ message: "Logged out" });
});

app.patch("/api/auth/change-password", authenticateToken, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  try {
    const userResult = await pool.query(
      "SELECT password FROM users WHERE id = $1",
      [req.user.id],
    );
    if (userResult.rows.length === 0)
      return res.status(404).json({ error: "User not found" });

    const isMatch = await bcrypt.compare(
      currentPassword,
      userResult.rows[0].password,
    );
    if (!isMatch)
      return res.status(400).json({ error: "Incorrect current password" });

    const salt = await bcrypt.hash(newPassword, 10);
    await pool.query("UPDATE users SET password = $1 WHERE id = $2", [
      salt,
      req.user.id,
    ]);
    res.json({ message: "Password updated successfully" });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/api/admin/users", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, username, role, branch FROM users ORDER BY username ASC",
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

app.post("/api/admin/create-user", authenticateToken, async (req, res) => {
  const { username, password, role, branch } = req.body;
  if (req.user.role !== "admin")
    return res.status(403).json({ error: "Admin only" });
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await pool.query(
      "INSERT INTO users (username, password, role, branch) VALUES ($1, $2, $3, $4) RETURNING id, username, role, branch",
      [username, hashedPassword, role, branch],
    );
    res.status(201).json(newUser.rows[0]);
  } catch (err) {
    if (err.code === "23505")
      return res.status(400).json({ error: "Username exists" });
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/admin/update-role/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;
  try {
    const result = await pool.query(
      "UPDATE users SET role = $1 WHERE id = $2 RETURNING id, username, role",
      [role, id],
    );
    res.json({ message: "Role updated", user: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: "Update failed" });
  }
});

app.put("/api/admin/update-branch/:id", authenticateToken, async (req, res) => {
  try {
    await pool.query("UPDATE users SET branch = $1 WHERE id = $2", [
      req.body.branch,
      req.params.id,
    ]);
    res.json({ message: "Branch updated" });
  } catch (err) {
    res.status(500).json({ error: "Branch update failed" });
  }
});

app.put(
  "/api/admin/reset-password/:id",
  authenticateToken,
  async (req, res) => {
    try {
      const hashedPassword = await bcrypt.hash(req.body.newPassword, 10);
      await pool.query("UPDATE users SET password = $1 WHERE id = $2", [
        hashedPassword,
        req.params.id,
      ]);
      res.json({ message: "Reset successful" });
    } catch (err) {
      res.status(500).json({ error: "Password reset failed" });
    }
  },
);

app.delete(
  "/api/admin/delete-user/:id",
  authenticateToken,
  async (req, res) => {
    try {
      await pool.query("DELETE FROM users WHERE id = $1", [req.params.id]);
      res.json({ message: "User deleted" });
    } catch (err) {
      res.status(500).json({ error: "Deletion failed" });
    }
  },
);

app.post("/api/admin/kill-session", authenticateToken, async (req, res) => {
  const { targetUsername } = req.body;
  const lowerName = targetUsername.toLowerCase();
  const socketId = userSockets[lowerName];
  if (socketId) {
    io.to(socketId).emit("force_logout", { message: "Terminated by Admin" });
    io.sockets.sockets.get(socketId)?.disconnect();
    delete userSockets[lowerName];
    io.emit("active_users_update", Object.keys(userSockets));
    return res.json({ message: `Session killed` });
  }
  res.status(400).json({ error: "User offline" });
});

app.use("/api/items", itemRoutes);
app.use("/api/requests", requestRoutes);
app.use("/api/stock-requests", stockRequestRoutes);
app.use("/api/logs", auditRoutes);

const buildPath = path.join(process.cwd(), "frontend", "dist");
const indexPath = path.join(buildPath, "index.html");

app.use(express.static(buildPath));

app.get(/^(?!\/api).+/, (req, res) => {
  if (
    req.path.startsWith("/assets/") ||
    (req.path.includes(".") && !req.path.endsWith(".html"))
  ) {
    return res.status(404).send("Asset not found");
  }

  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    console.error("Critical: Frontend build missing at", indexPath);
    res.status(404).send("Frontend missing");
  }
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
