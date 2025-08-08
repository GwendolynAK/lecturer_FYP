import express from "express";
import mongoose from "mongoose";

const router = express.Router();

// Health check endpoint
router.get("/", async (req, res) => {
  try {
    const healthCheck = {
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || "development",
      database: {
        status: "unknown",
        connectionState: mongoose.connection.readyState,
        databaseName: mongoose.connection.name || "not connected"
      }
    };

    // Check database connection
    if (mongoose.connection.readyState === 1) {
      healthCheck.database.status = "connected";
      
      // Test a simple query
      try {
        const collections = await mongoose.connection.db.listCollections().toArray();
        healthCheck.database.collections = collections.map(c => c.name);
        healthCheck.database.collectionCount = collections.length;
      } catch (dbError) {
        healthCheck.database.status = "connected but query failed";
        healthCheck.database.error = dbError.message;
      }
    } else {
      healthCheck.database.status = "disconnected";
    }

    res.json(healthCheck);
  } catch (error) {
    res.status(500).json({
      status: "error",
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

export default router; 