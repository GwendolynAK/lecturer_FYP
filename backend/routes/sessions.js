import express from 'express';
import AttendanceSession from '../models/AttendanceSession.js';
import { io } from '../server.js';

const router = express.Router();

// Start a new attendance session
router.post('/start', async (req, res) => {
  try {
    const {
      lecturerId,
      lecturerName,
      courseCode,
      courseTitle,
      program,
      level,
      venue,
      location,
      attendanceMethod = 'qr'
    } = req.body;

    // Validate required fields
    if (!lecturerId || !courseCode || !program || !level) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }

    // Check for any active session for this course
    const activeSession = await AttendanceSession.findOne({
      courseCode,
      program,
      level,
      status: 'active'
    });

    if (activeSession) {
      return res.status(409).json({
        success: false,
        error: 'An active session already exists for this course'
      });
    }

    // Create new session
    const sessionData = {
      lecturerId,
      lecturerName,
      courseCode,
      courseTitle,
      program,
      level,
      venue,
      location,
      attendanceMethod,
      status: 'active',
      startTime: new Date(),
      qrCode: {
        data: `${courseCode}_${Date.now()}`, // Simple QR data for now
        expiresAt: new Date(Date.now() + 30 * 60 * 1000) // 30 minutes expiry
      }
    };

    const session = await AttendanceSession.createSession(sessionData);

    // Broadcast session to students in this program/level
    const roomName = `${program.replace(/\s+/g, '_')}_${level.replace(/\s+/g, '_')}`;
    io.to(roomName).emit('sessionStarted', {
      sessionId: session.sessionId,
      courseCode: session.courseCode,
      courseTitle: session.courseTitle,
      program: session.program,
      level: session.level,
      qrCode: session.qrCode.data,
      venue: session.venue,
      location: session.location,
      startTime: session.startTime
    });

    console.log(`📢 Broadcasting session ${session.sessionId} to room ${roomName}`);

    res.json({
      success: true,
      message: 'Attendance session started successfully',
      data: session
    });

  } catch (error) {
    console.error('Error starting attendance session:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// End an attendance session
router.post('/end', async (req, res) => {
  try {
    const { sessionId, lecturerId } = req.body;

    if (!sessionId || !lecturerId) {
      return res.status(400).json({
        success: false,
        error: 'Session ID and lecturer ID are required'
      });
    }

    const result = await AttendanceSession.endSession(sessionId, lecturerId);

    if (result.modifiedCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'No active session found with the given ID'
      });
    }

    // Get the session details to broadcast end event
    const session = await AttendanceSession.findOne({ sessionId });
    if (session) {
      const roomName = `${session.program.replace(/\s+/g, '_')}_${session.level.replace(/\s+/g, '_')}`;
      io.to(roomName).emit('sessionEnded', {
        sessionId: session.sessionId,
        courseCode: session.courseCode,
        endTime: new Date()
      });
    }

    res.json({
      success: true,
      message: 'Attendance session ended successfully'
    });

  } catch (error) {
    console.error('Error ending attendance session:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Get active sessions for a lecturer
router.get('/active/:lecturerId', async (req, res) => {
  try {
    const { lecturerId } = req.params;
    const sessions = await AttendanceSession.getActiveSessions(lecturerId);

    res.json({
      success: true,
      data: sessions
    });

  } catch (error) {
    console.error('Error fetching active sessions:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Get session details
router.get('/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = await AttendanceSession.findOne({ sessionId });

    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    res.json({
      success: true,
      data: session
    });

  } catch (error) {
    console.error('Error fetching session details:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

export default router;
