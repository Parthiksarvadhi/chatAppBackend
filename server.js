require("dotenv").config();
const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const path = require("path");

const { runMigrations } = require("./src/config/migrations");

const authRoutes = require("./src/routes/authRoutes");
const groupRoutes = require("./src/routes/groupRoutes");
const messageRoutes = require("./src/routes/messageRoutes");
const userRoutes = require("./src/routes/userRoutes");

const userService = require("./src/services/userService");

const app = express();

/* -------------------- Express -------------------- */

app.use(cors({ origin: true }));
app.use(express.json());

app.use(
  "/uploads",
  express.static(path.join(__dirname, process.env.UPLOAD_DIR || "./uploads"))
);

app.use("/api/auth", authRoutes);
app.use("/api/groups", groupRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/users", userRoutes);

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Test endpoint for debugging
app.post("/api/test-upload", (req, res) => {
  console.log('🧪 Test upload endpoint called');
  console.log('Headers:', req.headers);
  console.log('Body:', req.body);
  res.json({ 
    message: "Test endpoint working",
    timestamp: new Date().toISOString(),
    headers: req.headers
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Unhandled error:', err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

/* -------------------- HTTP + Socket -------------------- */

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: true,
    methods: ["GET", "POST"],
  },
});

/* -------------------- Presence Memory -------------------- */

const userSockets = new Map(); // userId → socketId
const userPresence = new Map(); // userId → online/offline

/* -------------------- Socket Logic -------------------- */

io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  // Authenticate socket
  socket.on("authenticate", async (token) => {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      socket.userId = decoded.userId;

      userSockets.set(decoded.userId, socket.id);
      userPresence.set(decoded.userId, "online");

      await userService.updateUserPresence(decoded.userId, "online");

      socket.emit("authenticated", { success: true });

      io.emit("presence_update", {
        userId: decoded.userId,
        status: "online",
      });

      console.log("Authenticated user:", decoded.userId);
    } catch (err) {
      socket.emit("authenticated", { success: false });
    }
  });

  // Save push token
  socket.on('send_push_token', async (data) => {
    console.log('📱 Received push token event:', data);
    if (socket.userId && data.pushToken) {
      console.log('💾 Saving push token for user:', socket.userId);
      await userService.savePushToken(socket.userId, data.pushToken.data);
      console.log('✅ Push token saved for user:', socket.userId);
    } else {
      console.log('❌ Missing userId or pushToken:', { userId: socket.userId, hasToken: !!data.pushToken });
    }
  });

  // Join classroom
  socket.on("join_group", (groupId) => {
    console.log('👥 join_group event:', { userId: socket.userId, groupId });
    
    if (!socket.userId) {
      console.log('❌ join_group: No userId');
      return;
    }

    socket.join(`group_${groupId}`);
    console.log(`✅ User ${socket.userId} joined group ${groupId}`);
    console.log(`📍 Socket rooms:`, socket.rooms);
  });

  // Send realtime message (DB saved via REST first)
  socket.on("send_message", ({ groupId, message }) => {
    if (!socket.userId) {
      console.log('❌ send_message: No userId');
      return;
    }

    console.log('📨 send_message event received:', { groupId, message });
    console.log('📨 Message file_url:', message.file_url);
    
    if (!message) {
      console.log('❌ send_message: No message data');
      return;
    }

    console.log(`📤 Broadcasting message to group_${groupId}`);
    console.log('📤 Broadcasting with file_url:', message.file_url);
    io.to(`group_${groupId}`).emit("new_message", message);
    console.log('✅ Message broadcasted');
  });

  // Typing
  socket.on("typing", ({ groupId }) => {
    socket.to(`group_${groupId}`).emit("user_typing", {
      userId: socket.userId,
    });
  });

  socket.on("stop_typing", ({ groupId }) => {
    socket.to(`group_${groupId}`).emit("user_stop_typing", {
      userId: socket.userId,
    });
  });

  // Read receipt
  socket.on("message_read", ({ groupId, messageId }) => {
    io.to(`group_${groupId}`).emit("message_read_receipt", {
      messageId,
      userId: socket.userId,
      readAt: new Date(),
    });
  });

  // Message reaction
  socket.on("message_reaction", ({ groupId, messageId, reactionType, action }) => {
    console.log('😊 Reaction event:', { groupId, messageId, reactionType, action, userId: socket.userId });
    
    io.to(`group_${groupId}`).emit("reaction_update", {
      messageId,
      reactionType,
      action, // 'add' or 'remove'
      userId: socket.userId,
      timestamp: new Date(),
    });
  });

  // Disconnect
  socket.on("disconnect", async () => {
    if (socket.userId) {
      userPresence.set(socket.userId, "offline");
      userSockets.delete(socket.userId);

      await userService.updateUserPresence(socket.userId, "offline");

      io.emit("presence_update", {
        userId: socket.userId,
        status: "offline",
      });
    }

    console.log("Socket disconnected:", socket.id);
  });
});

/* -------------------- Start Server -------------------- */

async function startServer() {
  try {
    console.log("Running migrations...");
    await runMigrations();
    console.log("Migrations complete");

    const PORT = process.env.PORT || 5000;

    server.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://0.0.0.0:${PORT}`);
      console.log(`Mobile access: http://192.168.2.28:${PORT}`);
    });
  } catch (err) {
    console.error("Startup failed:", err);
    process.exit(1);
  }
}

startServer();

module.exports = { app, io };
