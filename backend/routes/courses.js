import express from 'express';

const router = express.Router();

// GET /api/courses/:courseCode/students - Get students by program (not enrollment)
router.get('/:courseCode/students', async (req, res) => {
  try {
    const { courseCode } = req.params;
    const { lecturerId, program, level } = req.query;

    if (!program) {
      return res.status(400).json({
        success: false,
        message: 'Program is required to fetch students'
      });
    }

    // Import MongoClient for direct database access
    const { MongoClient } = await import('mongodb');
    const client = new MongoClient(process.env.MONGO_URI);
    await client.connect();
    const db = client.db(process.env.DB_NAME);
    const studentCollection = db.collection('studentData');

    // Build query based on program and optionally level
    const query = { program: program };
    if (level) {
      query.level = level;
    }

    console.log('Querying studentData collection with:', query);
    const students = await studentCollection.find(query).toArray();
    console.log('Found students:', students.length);
    
    // Transform data to match expected format
    const transformedStudents = students.map(student => ({
      studentId: student.studentId,
      studentName: student.fullName,
      indexNumber: student.studentId,
      program: student.program,
      level: student.level,
      email: student.email || `${student.studentId}@student.gctu.edu.gh`,
      // Add mock attendance data for now
      attendancePercentage: Math.floor(Math.random() * 40) + 60, // 60-100%
      totalClasses: Math.floor(Math.random() * 20) + 10,
      attendedClasses: Math.floor(Math.random() * 15) + 5
    }));
    
    console.log('Sample student data:', transformedStudents[0]);

    await client.close();
    
    res.json({
      success: true,
      data: transformedStudents,
      count: transformedStudents.length,
      program: program,
      level: level || 'all'
    });
  } catch (error) {
    console.error('Error fetching students by program:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching students'
    });
  }
});

// GET /api/courses/:courseCode/attendance-stats - Get attendance statistics for a course
router.get('/:courseCode/attendance-stats', async (req, res) => {
  try {
    const { courseCode } = req.params;
    const { lecturerId, startDate, endDate } = req.query;

    if (!lecturerId) {
      return res.status(400).json({
        success: false,
        message: 'Lecturer ID is required'
      });
    }

    const stats = await CourseEnrollment.getCourseAttendanceStats(courseCode, lecturerId);
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching attendance stats:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching attendance statistics'
    });
  }
});

// GET /api/courses/:courseCode/todays-attendance - Get today's attendance for a course
router.get('/:courseCode/todays-attendance', async (req, res) => {
  try {
    const { courseCode } = req.params;
    const { lecturerId } = req.query;

    if (!lecturerId) {
      return res.status(400).json({
        success: false,
        message: 'Lecturer ID is required'
      });
    }

    const todaysAttendance = await Attendance.getTodaysAttendance(courseCode, lecturerId);
    
    res.json({
      success: true,
      data: todaysAttendance,
      count: todaysAttendance.length
    });
  } catch (error) {
    console.error('Error fetching today\'s attendance:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching today\'s attendance'
    });
  }
});

// GET /api/courses/:courseCode/top-performers - Get top performing students
router.get('/:courseCode/top-performers', async (req, res) => {
  try {
    const { courseCode } = req.params;
    const { lecturerId, limit = 5 } = req.query;

    if (!lecturerId) {
      return res.status(400).json({
        success: false,
        message: 'Lecturer ID is required'
      });
    }

    const topPerformers = await CourseEnrollment.find({
      courseCode: courseCode,
      lecturerId: lecturerId,
      status: 'active'
    })
    .sort({ attendancePercentage: -1 })
    .limit(parseInt(limit))
    .select('studentId studentName indexNumber attendancePercentage totalClasses attendedClasses');
    
    res.json({
      success: true,
      data: topPerformers
    });
  } catch (error) {
    console.error('Error fetching top performers:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching top performers'
    });
  }
});

// POST /api/courses/:courseCode/enroll-student - Enroll a student in a course
router.post('/:courseCode/enroll-student', async (req, res) => {
  try {
    const { courseCode } = req.params;
    const { 
      studentId, 
      lecturerId, 
      courseTitle, 
      program, 
      level, 
      academicYear, 
      semester 
    } = req.body;

    // Validate required fields
    if (!studentId || !lecturerId || !courseTitle || !program || !level || !academicYear || !semester) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    // Check if student exists
    const student = await User.findStudentById(studentId);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Check if already enrolled
    const existingEnrollment = await CourseEnrollment.findOne({
      studentId: studentId,
      courseCode: courseCode,
      lecturerId: lecturerId
    });

    if (existingEnrollment) {
      return res.status(409).json({
        success: false,
        message: 'Student is already enrolled in this course'
      });
    }

    // Create enrollment
    const enrollment = new CourseEnrollment({
      studentId: studentId,
      studentName: student.fullName,
      studentEmail: student.email,
      indexNumber: student.indexNumber,
      courseCode: courseCode,
      courseTitle: courseTitle,
      program: program,
      level: level,
      lecturerId: lecturerId,
      lecturerName: req.user?.name || 'Unknown Lecturer',
      academicYear: academicYear,
      semester: semester,
      status: 'active'
    });

    await enrollment.save();

    res.status(201).json({
      success: true,
      message: 'Student enrolled successfully',
      data: enrollment
    });
  } catch (error) {
    console.error('Error enrolling student:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while enrolling student'
    });
  }
});

// POST /api/courses/:courseCode/bulk-enroll - Enroll multiple students
router.post('/:courseCode/bulk-enroll', async (req, res) => {
  try {
    const { courseCode } = req.params;
    const { 
      students, 
      lecturerId, 
      courseTitle, 
      program, 
      level, 
      academicYear, 
      semester 
    } = req.body;

    if (!students || !Array.isArray(students) || students.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Students array is required'
      });
    }

    const enrollments = [];
    const errors = [];

    for (const studentData of students) {
      try {
        const { studentId } = studentData;
        
        // Check if student exists
        const student = await User.findStudentById(studentId);
        if (!student) {
          errors.push({ studentId, error: 'Student not found' });
          continue;
        }

        // Check if already enrolled
        const existingEnrollment = await CourseEnrollment.findOne({
          studentId: studentId,
          courseCode: courseCode,
          lecturerId: lecturerId
        });

        if (existingEnrollment) {
          errors.push({ studentId, error: 'Already enrolled' });
          continue;
        }

        // Create enrollment
        const enrollment = new CourseEnrollment({
          studentId: studentId,
          studentName: student.fullName,
          studentEmail: student.email,
          indexNumber: student.indexNumber,
          courseCode: courseCode,
          courseTitle: courseTitle,
          program: program,
          level: level,
          lecturerId: lecturerId,
          lecturerName: req.user?.name || 'Unknown Lecturer',
          academicYear: academicYear,
          semester: semester,
          status: 'active'
        });

        await enrollment.save();
        enrollments.push(enrollment);
      } catch (error) {
        errors.push({ studentId: studentData.studentId, error: error.message });
      }
    }

    res.json({
      success: true,
      message: `Enrolled ${enrollments.length} students successfully`,
      data: {
        enrollments,
        errors,
        summary: {
          total: students.length,
          successful: enrollments.length,
          failed: errors.length
        }
      }
    });
  } catch (error) {
    console.error('Error bulk enrolling students:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while bulk enrolling students'
    });
  }
});

// PUT /api/courses/:courseCode/update-attendance-counts - Update attendance counts for all students
router.put('/:courseCode/update-attendance-counts', async (req, res) => {
  try {
    const { courseCode } = req.params;
    const { lecturerId } = req.body;

    if (!lecturerId) {
      return res.status(400).json({
        success: false,
        message: 'Lecturer ID is required'
      });
    }

    await CourseEnrollment.updateAttendanceCounts(courseCode, lecturerId);

    res.json({
      success: true,
      message: 'Attendance counts updated successfully'
    });
  } catch (error) {
    console.error('Error updating attendance counts:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating attendance counts'
    });
  }
});

export default router;
