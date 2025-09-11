import mongoose from 'mongoose';

const CourseEnrollmentSchema = new mongoose.Schema({
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
  indexNumber: {
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
  
  // Enrollment details
  enrollmentDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  
  // Academic year and semester
  academicYear: {
    type: String,
    required: true,
    trim: true
  },
  semester: {
    type: String,
    required: true,
    trim: true
  },
  
  // Enrollment status
  status: {
    type: String,
    required: true,
    enum: ['active', 'inactive', 'dropped', 'completed'],
    default: 'active'
  },
  
  // Attendance tracking
  totalClasses: {
    type: Number,
    default: 0
  },
  attendedClasses: {
    type: Number,
    default: 0
  },
  attendancePercentage: {
    type: Number,
    default: 0
  },
  
  // Last attendance date
  lastAttendanceDate: {
    type: Date,
    required: false
  },
  
  // Additional metadata
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
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

// Compound indexes for better query performance
CourseEnrollmentSchema.index({ studentId: 1, courseCode: 1 }, { unique: true });
CourseEnrollmentSchema.index({ courseCode: 1, status: 1 });
CourseEnrollmentSchema.index({ lecturerId: 1, status: 1 });
CourseEnrollmentSchema.index({ program: 1, level: 1, status: 1 });
CourseEnrollmentSchema.index({ academicYear: 1, semester: 1 });

// Update the updatedAt field before saving
CourseEnrollmentSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  
  // Calculate attendance percentage
  if (this.totalClasses > 0) {
    this.attendancePercentage = Math.round((this.attendedClasses / this.totalClasses) * 100);
  }
  
  next();
});

// Static method to get students enrolled in a course
CourseEnrollmentSchema.statics.getCourseStudents = async function(courseCode, lecturerId, status = 'active') {
  return await this.find({
    courseCode: courseCode,
    lecturerId: lecturerId,
    status: status
  }).sort({ studentName: 1 });
};

// Static method to get student's courses
CourseEnrollmentSchema.statics.getStudentCourses = async function(studentId, status = 'active') {
  return await this.find({
    studentId: studentId,
    status: status
  }).sort({ courseCode: 1 });
};

// Static method to get attendance statistics for a course
CourseEnrollmentSchema.statics.getCourseAttendanceStats = async function(courseCode, lecturerId) {
  const pipeline = [
    {
      $match: {
        courseCode: courseCode,
        lecturerId: lecturerId,
        status: 'active'
      }
    },
    {
      $group: {
        _id: null,
        totalStudents: { $sum: 1 },
        averageAttendance: { $avg: '$attendancePercentage' },
        highPerformers: {
          $sum: {
            $cond: [{ $gte: ['$attendancePercentage', 90] }, 1, 0]
          }
        },
        lowPerformers: {
          $sum: {
            $cond: [{ $lt: ['$attendancePercentage', 70] }, 1, 0]
          }
        }
      }
    }
  ];
  
  const result = await this.aggregate(pipeline);
  return result[0] || {
    totalStudents: 0,
    averageAttendance: 0,
    highPerformers: 0,
    lowPerformers: 0
  };
};

// Static method to update attendance counts
CourseEnrollmentSchema.statics.updateAttendanceCounts = async function(courseCode, lecturerId) {
  const Attendance = mongoose.model('Attendance');
  
  // Get all active enrollments for the course
  const enrollments = await this.find({
    courseCode: courseCode,
    lecturerId: lecturerId,
    status: 'active'
  });
  
  // Update attendance counts for each student
  for (const enrollment of enrollments) {
    const totalClasses = await Attendance.countDocuments({
      courseCode: courseCode,
      lecturerId: lecturerId
    });
    
    const attendedClasses = await Attendance.countDocuments({
      courseCode: courseCode,
      lecturerId: lecturerId,
      studentId: enrollment.studentId,
      status: { $in: ['present', 'late'] }
    });
    
    const lastAttendance = await Attendance.findOne({
      courseCode: courseCode,
      lecturerId: lecturerId,
      studentId: enrollment.studentId
    }).sort({ attendanceDate: -1 });
    
    await this.updateOne(
      { _id: enrollment._id },
      {
        totalClasses: totalClasses,
        attendedClasses: attendedClasses,
        lastAttendanceDate: lastAttendance ? lastAttendance.attendanceDate : null
      }
    );
  }
};

// Instance method to get student's attendance history for this course
CourseEnrollmentSchema.methods.getAttendanceHistory = async function(limit = 50) {
  const Attendance = mongoose.model('Attendance');
  
  return await Attendance.find({
    studentId: this.studentId,
    courseCode: this.courseCode,
    lecturerId: this.lecturerId
  })
  .sort({ attendanceDate: -1 })
  .limit(limit);
};

export default mongoose.model('CourseEnrollment', CourseEnrollmentSchema);
