import mongoose from 'mongoose';

const AttendanceSessionSchema = new mongoose.Schema({
  // Session identification
  sessionId: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  
  // Lecturer information
  lecturerId: {
    type: String,
    required: true,
    trim: true
  },
  lecturerName: {
    type: String,
    required: true,
    trim: true
  },
  
  // Course information
  courseCode: {
    type: String,
    required: true,
    trim: true
  },
  courseTitle: {
    type: String,
    required: true,
    trim: true
  },
  program: {
    type: String,
    required: true,
    trim: true
  },
  level: {
    type: String,
    required: true,
    trim: true
  },
  
  // Academic period
  academicYear: {
    type: String,
    required: true,
    trim: true,
    index: true,
    default: '2024/2025'
  },
  semester: {
    type: Number,
    required: true,
    enum: [1, 2],
    index: true,
    default: 1
  },
  
  // Session details
  sessionDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  startTime: {
    type: Date,
    required: true,
    default: Date.now
  },
  endTime: {
    type: Date,
    required: false
  },
  
  // Location information
  location: {
    latitude: {
      type: Number,
      required: false
    },
    longitude: {
      type: Number,
      required: false
    },
    address: {
      type: String,
      required: false
    },
    accuracy: {
      type: Number,
      required: false
    },
    range: {
      type: Number,
      required: false,
      default: 50 // meters
    }
  },
  
  // Venue information
  venue: {
    type: String,
    required: false,
    trim: true
  },
  
  // Session status
  status: {
    type: String,
    required: true,
    enum: ['active', 'paused', 'ended', 'cancelled'],
    default: 'active'
  },
  
  // Attendance method
  attendanceMethod: {
    type: String,
    required: true,
    enum: ['gps', 'qr', 'manual', 'hybrid'],
    default: 'manual'
  },
  
  // QR Code information (if used)
  qrCode: {
    data: {
      type: String,
      required: false
    },
    expiresAt: {
      type: Date,
      required: false
    }
  },
  
  // Session statistics
  statistics: {
    totalStudents: {
      type: Number,
      default: 0
    },
    presentCount: {
      type: Number,
      default: 0
    },
    absentCount: {
      type: Number,
      default: 0
    },
    lateCount: {
      type: Number,
      default: 0
    },
    excusedCount: {
      type: Number,
      default: 0
    }
  },
  
  // Additional settings
  settings: {
    allowLateMarking: {
      type: Boolean,
      default: true
    },
    lateThresholdMinutes: {
      type: Number,
      default: 15
    },
    requireLocationVerification: {
      type: Boolean,
      default: false
    },
    allowManualOverride: {
      type: Boolean,
      default: true
    }
  },
  
  // Notes
  notes: {
    type: String,
    required: false,
    trim: true
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes for better query performance
AttendanceSessionSchema.index({ lecturerId: 1, sessionDate: -1 });
AttendanceSessionSchema.index({ courseCode: 1, sessionDate: -1 });
AttendanceSessionSchema.index({ status: 1, sessionDate: -1 });
AttendanceSessionSchema.index({ sessionId: 1 }, { unique: true });

// Update the updatedAt field before saving
AttendanceSessionSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Static method to create a new attendance session
AttendanceSessionSchema.statics.createSession = async function(sessionData) {
  const sessionId = `ATT_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  const session = new this({
    sessionId: sessionId,
    ...sessionData
  });
  
  return await session.save();
};

// Static method to get active sessions for a lecturer
AttendanceSessionSchema.statics.getActiveSessions = async function(lecturerId) {
  return await this.find({
    lecturerId: lecturerId,
    status: 'active'
  }).sort({ startTime: -1 });
};

// Static method to get sessions for a course
AttendanceSessionSchema.statics.getCourseSessions = async function(courseCode, lecturerId, limit = 20) {
  return await this.find({
    courseCode: courseCode,
    lecturerId: lecturerId
  })
  .sort({ sessionDate: -1 })
  .limit(limit);
};

// Static method to end a session
AttendanceSessionSchema.statics.endSession = async function(sessionId, lecturerId) {
  return await this.updateOne(
    { sessionId: sessionId, lecturerId: lecturerId, status: 'active' },
    { 
      status: 'ended',
      endTime: new Date()
    }
  );
};

// Instance method to update session statistics
AttendanceSessionSchema.methods.updateStatistics = async function() {
  const Attendance = mongoose.model('Attendance');
  
  const stats = await Attendance.aggregate([
    {
      $match: {
        sessionId: this.sessionId
      }
    },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);
  
  // Reset statistics
  this.statistics = {
    totalStudents: 0,
    presentCount: 0,
    absentCount: 0,
    lateCount: 0,
    excusedCount: 0
  };
  
  // Update statistics based on attendance records
  stats.forEach(stat => {
    this.statistics.totalStudents += stat.count;
    this.statistics[`${stat._id}Count`] = stat.count;
  });
  
  return await this.save();
};

// Instance method to get attendance records for this session
AttendanceSessionSchema.methods.getAttendanceRecords = async function() {
  const Attendance = mongoose.model('Attendance');
  
  return await Attendance.find({
    sessionId: this.sessionId
  }).sort({ markedAt: -1 });
};

// Instance method to check if session is still active
AttendanceSessionSchema.methods.isActive = function() {
  return this.status === 'active';
};

// Instance method to check if session allows late marking
AttendanceSessionSchema.methods.allowsLateMarking = function() {
  if (!this.settings.allowLateMarking) return false;
  
  const now = new Date();
  const lateThreshold = new Date(this.startTime.getTime() + (this.settings.lateThresholdMinutes * 60000));
  
  return now <= lateThreshold;
};

export default mongoose.model('AttendanceSession', AttendanceSessionSchema);
