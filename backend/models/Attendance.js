import mongoose from 'mongoose';

const AttendanceSchema = new mongoose.Schema({
  // Student information
  studentId: {
    type: String,
    required: true,
    trim: true
  },
  studentName: {
    type: String,
    required: true,
    trim: true
  },
  studentEmail: {
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
  
  // Attendance details
  status: {
    type: String,
    required: true,
    enum: ['present', 'absent', 'late', 'excused'],
    default: 'present'
  },
  
  // Date and time
  attendanceDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  markedAt: {
    type: Date,
    required: true,
    default: Date.now
  },
  
  // Location information (for GPS-based attendance)
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
    }
  },
  
  // QR Code information (if used)
  qrCodeData: {
    type: String,
    required: false
  },
  
  // Method used to mark attendance
  markingMethod: {
    type: String,
    required: true,
    enum: ['gps', 'qr', 'manual', 'hybrid'],
    default: 'manual'
  },
  
  // Additional notes
  notes: {
    type: String,
    required: false,
    trim: true
  },
  
  // Verification status
  isVerified: {
    type: Boolean,
    default: true
  },
  
  // Session information (for grouping attendance sessions)
  sessionId: {
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
AttendanceSchema.index({ studentId: 1, courseCode: 1, attendanceDate: 1 });
AttendanceSchema.index({ courseCode: 1, attendanceDate: 1 });
AttendanceSchema.index({ lecturerId: 1, attendanceDate: 1 });
AttendanceSchema.index({ attendanceDate: 1 });
AttendanceSchema.index({ status: 1 });

// Update the updatedAt field before saving
AttendanceSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Static method to get attendance statistics for a course
AttendanceSchema.statics.getCourseStats = async function(courseCode, startDate, endDate) {
  const pipeline = [
    {
      $match: {
        courseCode: courseCode,
        attendanceDate: {
          $gte: startDate,
          $lte: endDate
        }
      }
    },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ];
  
  return await this.aggregate(pipeline);
};

// Static method to get student attendance history
AttendanceSchema.statics.getStudentHistory = async function(studentId, courseCode, limit = 50) {
  return await this.find({
    studentId: studentId,
    courseCode: courseCode
  })
  .sort({ attendanceDate: -1 })
  .limit(limit);
};

// Static method to get today's attendance for a course
AttendanceSchema.statics.getTodaysAttendance = async function(courseCode, lecturerId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  return await this.find({
    courseCode: courseCode,
    lecturerId: lecturerId,
    attendanceDate: {
      $gte: today,
      $lt: tomorrow
    }
  }).sort({ markedAt: -1 });
};

export default mongoose.model('Attendance', AttendanceSchema);
