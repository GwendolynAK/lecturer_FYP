import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import catalogRoutes from "./routes/catalog.js";
import healthRoutes from "./routes/health.js";
import lecturerRouter from './routes/lecturer.js';
import authRouter from './routes/auth.js';
import studentsRouter from './routes/students.js';
import studentAuthRouter from './routes/studentAuth.js';
import coursesRouter from './routes/courses.js';
import attendanceRouter from './routes/attendance.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;
const NODE_ENV = process.env.NODE_ENV || "development";

// CORS configuration for production
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.replace(/\s+/g, '').split(",").map(origin => origin.trim()).filter(origin => origin.length > 0)
  : ["http://localhost:3000", "http://localhost:3001"];

console.log("🔧 CORS Configuration:");
console.log("📡 Raw ALLOWED_ORIGINS:", process.env.ALLOWED_ORIGINS);
console.log("📡 Processed allowed origins:", allowedOrigins);

app.use(
  cors({
    origin: function (origin, callback) {
      try {
        // Allow requests with no origin (like mobile apps or Postman)
        if (!origin) {
          console.log("✅ Allowing request with no origin");
          return callback(null, true);
        }
        
        console.log("🔍 Checking origin:", origin);
        console.log("📋 Allowed origins:", allowedOrigins);
        
        // Check if origin is in allowed list
        if (allowedOrigins.includes(origin)) {
          console.log("✅ Origin allowed:", origin);
          callback(null, true);
        } else {
          console.log("❌ Origin blocked:", origin);
          callback(new Error("Not allowed by CORS"));
        }
      } catch (error) {
        console.error("❌ CORS Error:", error);
        callback(new Error("CORS processing error"));
      }
    },
    credentials: true,
  })
);

app.use(express.json());

// In-memory storage for admin location and admin socket
let adminLocation = null;
let adminSocketId = null;
let adminSettings = { range: 50, venue: "" }; // Default values
let isAdminSet = false; // Track if admin has been assigned

// Create HTTP server and attach socket.io
const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  },
  transports: ["websocket", "polling"],
  allowEIO3: true,
  pingTimeout: parseInt(process.env.WS_HEARTBEAT_TIMEOUT) || 5000,
  pingInterval: parseInt(process.env.WS_HEARTBEAT_INTERVAL) || 25000,
});

// Socket.io connection handling
io.on("connection", (socket) => {
  console.log(`Client connected: ${socket.id} (${NODE_ENV})`);

  // Check if this is a web app connection (has admin capabilities)
  // Web apps typically connect from browsers, React Native from mobile
  const isWebApp =
    socket.handshake.headers.origin &&
    (socket.handshake.headers.origin.includes("localhost") ||
      socket.handshake.headers.origin.includes("http"));

  // Web app gets admin role, mobile app gets student role
  if (isWebApp && !isAdminSet) {
    adminSocketId = socket.id;
    isAdminSet = true;
    socket.emit("roleAssigned", { role: "admin", socketId: socket.id });
    console.log(`Web app ${socket.id} assigned as admin`);
  } else if (isWebApp && isAdminSet) {
    // If web app connects and admin already exists, replace the admin
    const previousAdminId = adminSocketId;
    adminSocketId = socket.id;
    socket.emit("roleAssigned", { role: "admin", socketId: socket.id });
    console.log(
      `Web app ${socket.id} replaced previous admin ${previousAdminId}`
    );

    // Notify previous admin they're now a student
    if (previousAdminId) {
      io.to(previousAdminId).emit("roleAssigned", {
        role: "student",
        socketId: previousAdminId,
      });
    }
  } else {
    // Mobile app connections are always students
    socket.emit("roleAssigned", { role: "student", socketId: socket.id });
    console.log(`Mobile app ${socket.id} assigned as student`);
  }

  // Send current admin location to new clients
  if (adminLocation) {
    socket.emit("adminLocation", adminLocation);
  }

  // Send current admin settings to new clients
  socket.emit("adminSettings", adminSettings);

  // Listen for adminLocation events from anyone (whoever clicks START MARKING)
  socket.on("adminLocation", (data) => {
    // Anyone can set location when they click START MARKING
    adminLocation = {
      latitude: data.latitude,
      longitude: data.longitude,
      timestamp: Date.now(),
    };

    // Store range and venue if provided
    if (data.range !== undefined) {
      adminSettings.range = data.range;
    }
    if (data.venue !== undefined) {
      adminSettings.venue = data.venue;
    }

    // Broadcast location and settings to all clients
    io.emit("adminLocation", adminLocation);
    io.emit("adminSettings", adminSettings);

    console.log(
      `Location set by ${socket.id}: ${JSON.stringify(adminLocation)}`
    );
    console.log(
      `Settings updated: range=${adminSettings.range}m, venue=${adminSettings.venue}`
    );
  });

  // Listen for adminSettings events from the admin only
  socket.on("adminSettings", (data) => {
    // Only the admin can change settings (range, venue)
    if (socket.id === adminSocketId) {
      if (data.range !== undefined) {
        adminSettings.range = data.range;
      }
      if (data.venue !== undefined) {
        adminSettings.venue = data.venue;
      }

      // Broadcast settings to all clients
      io.emit("adminSettings", adminSettings);

      console.log(
        `Admin ${socket.id} updated settings: range=${adminSettings.range}m, venue=${adminSettings.venue}`
      );
    } else {
      console.log(`Non-admin ${socket.id} attempted to set settings`);
      socket.emit("error", { message: "Only admin can set settings" });
    }
  });

  // Listen for clearAdminLocation events (when admin stops marking)
  socket.on("clearAdminLocation", (data) => {
    // Only the admin can clear location
    if (socket.id === adminSocketId) {
      adminLocation = null; // Clear admin location

      // Broadcast to all clients that admin location is cleared
      io.emit("adminLocationCleared", { timestamp: Date.now() });

      console.log(`Admin ${socket.id} cleared location`);
    } else {
      console.log(`Non-admin ${socket.id} attempted to clear location`);
      socket.emit("error", { message: "Only admin can clear location" });
    }
  });

  // Listen for sessionStarted events from admin
  socket.on("sessionStarted", (data) => {
    // Only the admin can start sessions
    if (socket.id === adminSocketId) {
      // Broadcast session data to all connected students
      io.emit("sessionStarted", data);
      console.log(`📡 Admin ${socket.id} started session: ${data.sessionId}`);
      console.log(`📡 Broadcasting to all students:`, data);
    } else {
      console.log(`Non-admin ${socket.id} attempted to start session`);
      socket.emit("error", { message: "Only admin can start sessions" });
    }
  });

  // Listen for sessionEnded events from admin
  socket.on("sessionEnded", (data) => {
    // Only the admin can end sessions
    if (socket.id === adminSocketId) {
      // Broadcast session end to all connected students
      io.emit("sessionEnded", data);
      console.log(`📡 Admin ${socket.id} ended session: ${data.sessionId}`);
      console.log(`📡 Broadcasting session end to all students`);
    } else {
      console.log(`Non-admin ${socket.id} attempted to end session`);
      socket.emit("error", { message: "Only admin can end sessions" });
    }
  });

  socket.on("disconnect", () => {
    console.log(`Client disconnected: ${socket.id}`);

    // If admin disconnects, keep admin role but clear location
    if (socket.id === adminSocketId) {
      adminLocation = null; // Clear admin location when admin leaves
      console.log(
        `Admin ${socket.id} disconnected, location cleared but admin role preserved`
      );

      // Notify all clients that admin has disconnected
      io.emit("adminDisconnected", { adminId: socket.id });
    }
  });
});

// Admin sets their current location (HTTP endpoint for compatibility)
app.post("/api/admin/location", (req, res) => {
  const { latitude, longitude } = req.body;
  if (typeof latitude !== "number" || typeof longitude !== "number") {
    return res.status(400).json({ error: "Invalid latitude or longitude" });
  }
  adminLocation = { latitude, longitude, timestamp: Date.now() };

  // Broadcast to all connected clients via WebSocket
  io.emit("adminLocation", adminLocation);

  res.json({ status: "Location updated", location: adminLocation });
});

// Student fetches the latest admin location (HTTP endpoint for compatibility)
app.get("/api/admin/location", (req, res) => {
  if (!adminLocation) {
    return res.status(404).json({ error: "No admin location set yet" });
  }
  res.json(adminLocation);
});

// Get admin settings (range, venue) - for React Native apps
app.get("/api/admin/settings", (req, res) => {
  res.json(adminSettings);
});

// Get combined admin data (location + settings) - for React Native apps
app.get("/api/admin/data", (req, res) => {
  if (!adminLocation) {
    return res.status(404).json({ error: "No admin location set yet" });
  }
  res.json({
    location: adminLocation,
    settings: adminSettings,
  });
});

// Mount API routes
app.use('/api/lecturer', lecturerRouter);
app.use('/api/auth', authRouter);
app.use('/api/students', studentsRouter);
app.use('/api/student-auth', studentAuthRouter);
app.use('/api/courses', coursesRouter);
app.use('/api/attendance', attendanceRouter);
app.use("/api/catalog", catalogRoutes);
app.use("/api/health", healthRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Error:", err.message);
  res.status(500).json({ error: "Internal server error" });
});

// 404 handler (must be last)
app.use("*", (req, res) => {
  res.status(404).json({ error: "Route not found" });
});

httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌍 Environment: ${NODE_ENV}`);
  console.log(`🔌 WebSocket server ready for real-time updates`);
  console.log(`📡 Allowed origins: ${allowedOrigins.join(", ")}`);
});

// Database connection setup
import mongoose from "mongoose";

mongoose
  .connect(process.env.MONGO_URI, {
    dbName: process.env.DB_NAME,
  })
  .then(() => console.log("MongoDB connected!"))
  .catch((err) => console.error("MongoDB connection error:", err));
