import express from 'express';
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

// Helper function to get database connection
async function getDatabase() {
  const client = new MongoClient(process.env.MONGO_URI);
  await client.connect();
  return { client, db: client.db(process.env.DB_NAME) };
}

// GET /api/attendance/courses - Get all courses with student counts
router.get('/courses', async (req, res) => {
  try {
    const { client, db } = await getDatabase();
    
    const pipeline = [
      {
        $lookup: {
          from: 'course_enrollments',
          localField: '_id',
          foreignField: 'courseId',
          as: 'enrollments'
        }
      },
      {
        $addFields: {
          studentCount: { $size: '$enrollments' }
        }
      },
      {
        $project: {
          courseCode: 1,
          title: 1,
          program: 1,
          level: 1,
          credits: 1,
          semester: 1,
          academicYear: 1,
          lecturerName: 1,
          studentCount: 1
        }
      }
    ];

    const courses = await db.collection('courses').aggregate(pipeline).toArray();
    await client.close();

    res.json({
      success: true,
      data: courses
    });

  } catch (error) {
    console.error('Error fetching courses:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching courses'
    });
  }
});

// GET /api/attendance/stats/:courseCode - Get attendance statistics for a course
router.get('/stats/:courseCode', async (req, res) => {
  try {
    const { courseCode } = req.params;
    const { academicYear = '2024/2025', semester = 1 } = req.query;

    const { client, db } = await getDatabase();

    // Get course information
    const course = await db.collection('courses').findOne({ courseCode });
    if (!course) {
      await client.close();
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Get course offering
    const courseOffering = await db.collection('course_enrollments').findOne({
      courseId: course._id,
      academicYear,
      semester: parseInt(semester)
    });

    if (!courseOffering) {
      await client.close();
      return res.status(404).json({
        success: false,
        message: 'Course offering not found for the specified academic year and semester'
      });
    }

    // Get attendance statistics
    const stats = await db.collection('attendance_records').aggregate([
      {
        $lookup: {
          from: 'courses',
          localField: 'courseId',
          foreignField: '_id',
          as: 'course'
        }
      },
      {
        $match: {
          'course.courseCode': courseCode
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]).toArray();

    // Get total students enrolled
    const totalStudents = await db.collection('course_enrollments').countDocuments({
      courseId: course._id,
      academicYear,
      semester: parseInt(semester)
    });

    // Calculate percentages
    const totalRecords = stats.reduce((sum, stat) => sum + stat.count, 0);
    const presentCount = stats.find(s => s._id === 'present')?.count || 0;
    const absentCount = stats.find(s => s._id === 'absent')?.count || 0;

    await client.close();

    res.json({
      success: true,
      data: {
        courseCode: course.courseCode,
        courseTitle: course.title,
        program: course.program,
        level: course.level,
        totalStudents: totalStudents,
        totalRecords: totalRecords,
        presentCount: presentCount,
        absentCount: absentCount,
        averageAttendance: totalRecords > 0 ? Math.round((presentCount / totalRecords) * 100) : 0
      }
    });

  } catch (error) {
    console.error('Error fetching attendance stats:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching attendance statistics'
    });
  }
});

// GET /api/attendance/top-performers/:courseCode - Get top performing students
router.get('/top-performers/:courseCode', async (req, res) => {
  try {
    const { courseCode } = req.params;
    const { academicYear = '2024/2025', semester = 1, limit = 5, program, level } = req.query;

    const { client, db } = await getDatabase();

    // Build course query with program and level if provided
    const courseQuery = { courseCode };
    if (program) courseQuery.program = program;
    if (level) courseQuery.level = level;
    
    console.log('🔍 Course query:', courseQuery);
    
    // Get course information
    const course = await db.collection('courses').findOne(courseQuery);
    console.log('📚 Found course:', course ? `${course.program} - ${course.courseCode}` : 'NONE');
    
    if (!course) {
      await client.close();
      return res.status(404).json({
        success: false,
        message: 'Course not found with the specified program and level'
      });
    }

    // Get students enrolled in the course
    console.log('🔍 Finding students enrolled in course:', courseCode);
    const students = await db.collection('course_enrollments').aggregate([
      {
        $match: {
          courseId: course._id,
          academicYear,
          semester: parseInt(semester)
        }
      },
      {
        $lookup: {
          from: 'studentsNormalized',
          localField: 'studentId',
          foreignField: 'studentId',
          as: 'student'
        }
      },
      {
        $addFields: {
          student: { $arrayElemAt: ['$student', 0] }
        }
      },
      {
        $project: {
          studentId: '$student.studentId',
          fullName: '$student.fullName',
          program: '$student.program',
          level: '$student.level'
        }
      }
    ]).toArray();
    
    console.log('📚 Found', students.length, 'enrolled students');
    
    if (students.length === 0) {
      await client.close();
      return res.json({
        success: true,
        data: []
      });
    }
    
    // Get student IDs for attendance lookup - use studentId field (string) not _id
    const studentIds = students.map(student => student.studentId);
    
    // Use the course we already found above
    
    console.log('📚 Course ObjectId:', course._id);
    
    // Get attendance records for these students and course
    const attendanceRecords = await db.collection('attendance_records').find({
      studentId: { $in: studentIds },
      courseId: course._id
    }).toArray();
    
    console.log('📊 Found', attendanceRecords.length, 'attendance records');
    
    // Group by student and calculate stats
    const studentStats = {};
    
    attendanceRecords.forEach(record => {
      const studentId = record.studentId.toString();
      if (!studentStats[studentId]) {
        studentStats[studentId] = {
          studentId: studentId,
          totalSessions: 0,
          presentCount: 0,
          absentCount: 0
        };
      }
      
      studentStats[studentId].totalSessions++;
      if (record.status === 'present') {
        studentStats[studentId].presentCount++;
      } else if (record.status === 'absent') {
        studentStats[studentId].absentCount++;
      }
    });
    
    // Calculate attendance percentages and add student names
    const topPerformers = Object.values(studentStats).map(stats => {
      const student = students.find(s => s.studentId === stats.studentId);
      const attendancePercentage = stats.totalSessions > 0 
        ? Math.round((stats.presentCount / stats.totalSessions) * 100)
        : 0;
      
      return {
        studentId: student.studentId,
        studentName: student.fullName,
        indexNumber: student.studentId,
        program: student.program,
        level: student.level,
        attendancePercentage: attendancePercentage,
        totalClasses: stats.totalSessions,
        attendedClasses: stats.presentCount,
        absentClasses: stats.absentCount
      };
    }).sort((a, b) => b.attendancePercentage - a.attendancePercentage).slice(0, parseInt(limit));

    console.log('📊 Aggregation result:', topPerformers.length, 'records');
    if (topPerformers.length > 0) {
      console.log('Sample result:', JSON.stringify(topPerformers[0], null, 2));
    }

    await client.close();

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

// GET /api/attendance/student-performance/:courseCode - Get all students performance data for a course
router.get('/student-performance/:courseCode', async (req, res) => {
  try {
    const { courseCode } = req.params;
    const { academicYear = '2024/2025', semester = 1, program, level } = req.query;

    const { client, db } = await getDatabase();

    // Build course query with program and level if provided
    const courseQuery = { courseCode };
    if (program) courseQuery.program = program;
    if (level) courseQuery.level = level;
    
    console.log('🔍 Course query:', courseQuery);
    
    // Get course information
    const course = await db.collection('courses').findOne(courseQuery);
    console.log('📚 Found course:', course ? `${course.program} - ${course.courseCode}` : 'NONE');
    
    if (!course) {
      await client.close();
      return res.status(404).json({
        success: false,
        message: 'Course not found with the specified program and level'
      });
    }

    // Get students for this program and level
    console.log('🔍 Finding students for program:', program, 'level:', level);
    const students = await db.collection('studentsNormalized').find({
      program: program,
      level: level
    }).toArray();
    
    console.log('📚 Found', students.length, 'students');
    
    if (students.length === 0) {
      await client.close();
      return res.json({
        success: true,
        data: []
      });
    }
    
    // Get student IDs for attendance lookup - use studentId field (string) not _id
    const studentIds = students.map(student => student.studentId);
    
    console.log('📚 Course ObjectId:', course._id);
    
    // Get attendance records for these students and course
    const attendanceRecords = await db.collection('attendance_records').find({
      studentId: { $in: studentIds },
      courseId: course._id
    }).toArray();
    
    console.log('📊 Found', attendanceRecords.length, 'attendance records');
    
    // Group by student and calculate stats
    const studentStats = {};
    
    attendanceRecords.forEach(record => {
      const studentId = record.studentId.toString();
      if (!studentStats[studentId]) {
        studentStats[studentId] = {
          studentId: studentId,
          presentCount: 0,
          absentCount: 0
        };
      }
      
      if (record.status === 'present') {
        studentStats[studentId].presentCount++;
      } else if (record.status === 'absent') {
        studentStats[studentId].absentCount++;
      }
    });
    
    // Calculate attendance percentages and add student names
    const allStudentsPerformance = Object.values(studentStats).map(stats => {
      const student = students.find(s => s.studentId === stats.studentId);
      const totalSessions = stats.presentCount + stats.absentCount;
      const attendancePercentage = totalSessions > 0 
        ? Math.round((stats.presentCount / totalSessions) * 100)
        : 0;
      
      return {
        studentId: student.studentId,
        studentName: student.fullName,
        indexNumber: student.studentId,
        attendancePercentage: attendancePercentage,
        totalClasses: stats.presentCount, // Only classes where student was present
        attendedClasses: stats.presentCount,
        absentClasses: stats.absentCount
      };
    }).sort((a, b) => b.attendancePercentage - a.attendancePercentage);

    console.log('📊 All students performance result:', allStudentsPerformance.length, 'records');

    await client.close();

    res.json({
      success: true,
      data: allStudentsPerformance
    });

  } catch (error) {
    console.error('Error fetching student performance:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching student performance data'
    });
  }
});

// GET /api/attendance/students/:courseCode - Get all students in a course
router.get('/students/:courseCode', async (req, res) => {
  try {
    const { courseCode } = req.params;
    const { program, level, academicYear = '2024/2025', semester = 1 } = req.query;

    const { client, db } = await getDatabase();

    // Get course information - use program and level to find the correct course
    const courseQuery = { courseCode };
    if (program) courseQuery.program = program;
    if (level) courseQuery.level = level;
    
    const course = await db.collection('courses').findOne(courseQuery);
    if (!course) {
      await client.close();
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Get students enrolled in the course
    const students = await db.collection('course_enrollments').aggregate([
      {
        $match: {
          courseId: course._id,
          academicYear,
          semester: parseInt(semester)
        }
      },
      {
        $lookup: {
          from: 'studentsNormalized',
          localField: 'studentId',
          foreignField: 'studentId',
          as: 'student'
        }
      },
      {
        $addFields: {
          student: { $arrayElemAt: ['$student', 0] }
        }
      },
      {
        $project: {
          studentId: '$student.studentId',
          studentName: '$student.fullName',
          email: '$student.email',
          program: '$student.program',
          level: '$student.level',
          enrollmentDate: '$enrollmentDate',
          status: '$status'
        }
      }
    ]).toArray();

    await client.close();

    res.json({
      success: true,
      data: students
    });

  } catch (error) {
    console.error('Error fetching course students:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching course students'
    });
  }
});

// GET /api/attendance/records/:courseCode - Get attendance records for a specific course
router.get('/records/:courseCode', async (req, res) => {
  try {
    const { courseCode } = req.params;
    const { academicYear = '2024/2025', semester = 1, program, level, date, status, month } = req.query;

    const { client, db } = await getDatabase();

    // Build course query with program and level if provided
    const courseQuery = { courseCode };
    if (program) courseQuery.program = program;
    if (level) courseQuery.level = level;
    
    console.log('🔍 Course query for records:', courseQuery);

    // Get course information
    const course = await db.collection('courses').findOne(courseQuery);
    console.log('📚 Found course for records:', course ? `${course.program} - ${course.courseCode}` : 'NONE');

    if (!course) {
      await client.close();
      return res.status(404).json({
        success: false,
        message: 'Course not found with the specified program and level'
      });
    }

    // Build attendance records query - use courseId like the Dashboard does
    const recordsQuery = { 
      courseId: course._id
    };
    
    // Add date filters - disabled for debugging
    if (date) {
      console.log('🔍 Date filter requested but disabled for debugging:', date);
      // Temporarily disable MongoDB date filtering
    }
    
    if (status) recordsQuery.status = status;
    
    console.log('🔍 Records query before date filtering:', recordsQuery);

    console.log('🔍 Records query:', recordsQuery);

    // Debug: Check what's actually in the collection
    const sampleRecords = await db.collection('attendance_records').find({}).limit(3).toArray();
    console.log('🔍 Sample attendance records structure:', sampleRecords.map(r => ({
      _id: r._id,
      studentId: r.studentId,
      studentName: r.studentName,
      courseCode: r.courseCode,
      program: r.program,
      level: r.level,
      academicYear: r.academicYear,
      semester: r.semester,
      status: r.status,
      attendanceDate: r.attendanceDate,
      // Show all available fields
      allFields: Object.keys(r)
    })));

    // Get the latest academic year and semester from the database
    const latestRecord = await db.collection('attendance_records')
      .find({})
      .sort({ attendanceDate: -1 })
      .limit(1)
      .toArray();
    
    let latestAcademicYear = '2024/2025';
    let latestSemester = 1;
    
    if (latestRecord.length > 0) {
      // Extract academic year from the date
      const latestDate = latestRecord[0].attendanceDate;
      if (latestDate) {
        const year = latestDate.getFullYear();
        const month = latestDate.getMonth() + 1; // 0-based month
        
        // Determine academic year based on month
        if (month >= 8) { // August onwards is new academic year
          latestAcademicYear = `${year}/${year + 1}`;
        } else { // January to July is previous academic year
          latestAcademicYear = `${year - 1}/${year}`;
        }
        
        // Determine semester based on month
        if (month >= 8 && month <= 12) {
          latestSemester = 1; // First semester: Aug-Dec
        } else if (month >= 1 && month <= 7) {
          latestSemester = 2; // Second semester: Jan-Jul
        }
      }
    }
    
    console.log('📅 Latest academic year from DB:', latestAcademicYear);
    console.log('📅 Latest semester from DB:', latestSemester);

    // Get attendance records
    const allRecords = await db.collection('attendance_records')
      .find(recordsQuery)
      .sort({ attendanceDate: -1 })
      .toArray();

    console.log('📊 Found', allRecords.length, 'attendance records');

    // Filter records by academic year, semester, and month
    let filteredRecords = allRecords;
    
    if (academicYear || semester || month) {
      // If a specific date is requested, skip all filtering to avoid conflicts
      if (date) {
        console.log('🔍 Date requested, skipping academic year/semester/month filtering');
        filteredRecords = allRecords;
      } else {
        filteredRecords = allRecords.filter(record => {
          if (!record.attendanceDate) return false;
          
          const recordDate = new Date(record.attendanceDate);
          const year = recordDate.getFullYear();
          const recordMonth = recordDate.getMonth() + 1; // 0-based to 1-based
          
          // Calculate academic year for this record
          let recordAcademicYear;
          if (recordMonth >= 8) { // August onwards is new academic year
            recordAcademicYear = `${year}/${year + 1}`;
          } else { // January to July is previous academic year
            recordAcademicYear = `${year - 1}/${year}`;
          }
          
          // Calculate semester for this record
          let recordSemester;
          if (recordMonth >= 8 && recordMonth <= 12) {
            recordSemester = 1; // First semester: Aug-Dec
          } else if (recordMonth >= 1 && recordMonth <= 7) {
            recordSemester = 2; // Second semester: Jan-Jul
          }
          
          // Get month name
          const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 
                             'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
          const recordMonthName = monthNames[recordMonth - 1];
          
          // Apply filters
          let matches = true;
          if (academicYear && recordAcademicYear !== academicYear) {
            matches = false;
          }
          if (semester && recordSemester !== parseInt(semester)) {
            matches = false;
          }
          if (month && recordMonthName !== month) {
            matches = false;
          }
          
          return matches;
        });
      }
      
      console.log('🔍 Filtered by academic year:', academicYear, 'semester:', semester, 'month:', month);
      console.log('📊 Records after filtering:', filteredRecords.length);
    }

    // If a specific date is requested, show only that date
    // Otherwise, show the most recent date among filtered records
    let records = [];
    if (filteredRecords.length > 0) {
      if (date) {
        // When a specific date is requested, filter by that date in application logic
        records = filteredRecords.filter(record => {
          if (!record.attendanceDate) return false;
          const recordDate = record.attendanceDate.toISOString().split('T')[0];
          return recordDate === date;
        });
        console.log('📅 Showing specific date:', date);
        console.log('📊 Records for specific date:', records.length);
      } else {
        // Show only the most recent date
        const mostRecentDate = filteredRecords[0].attendanceDate;
        records = filteredRecords.filter(record => 
          record.attendanceDate && 
          record.attendanceDate.toDateString() === mostRecentDate.toDateString()
        );
        console.log('📅 Most recent date:', mostRecentDate.toDateString());
        console.log('📊 Records for most recent date:', records.length);
      }
    }

    // Get student details for the records
    const studentIds = [...new Set(records.map(record => record.studentId))];
    const students = await db.collection('studentsNormalized').find({
      studentId: { $in: studentIds }
    }).toArray();

    console.log('📚 Found', students.length, 'students for records');
    
    // Debug: Check what fields are available in students
    if (students.length > 0) {
      console.log('🔍 Sample student structure:', {
        _id: students[0]._id,
        fullName: students[0].fullName,
        indexNumber: students[0].indexNumber,
        studentId: students[0].studentId,
        allFields: Object.keys(students[0])
      });
    }

    // Create a lookup map for students
    const studentLookup = {};
    students.forEach(student => {
      studentLookup[student.studentId] = student;
    });

    // Transform records for frontend
    const transformedRecords = records.map(record => {
      const student = studentLookup[record.studentId] || {};
      const studentName = student.fullName || record.studentName || 'Unknown Student';
      const nameParts = studentName.split(' ');
      
      return {
        studentId: record.studentId || '',
        studentName: studentName,
        firstName: nameParts[0] || 'Unknown',
        lastName: nameParts.slice(1).join(' ') || '',
        indexNumber: student.indexNumber || student.studentId || record.indexNumber || '',
        status: record.status || 'unknown',
        date: record.attendanceDate ? record.attendanceDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        time: record.attendanceDate ? record.attendanceDate.toTimeString().split(' ')[0].substring(0, 5) : '00:00',
        courseCode: course.courseCode,
        courseTitle: course.courseTitle,
        program: course.program,
        level: course.level,
        lecturerName: record.lecturerName || '',
        markedAt: record.markedAt || '',
        location: record.location || '',
        markingMethod: record.markingMethod || ''
      };
    });

    await client.close();

    res.json({
      success: true,
      data: transformedRecords,
      course: {
        courseCode: course.courseCode,
        courseTitle: course.courseTitle,
        program: course.program,
        level: course.level
      },
      totalRecords: transformedRecords.length
    });

  } catch (error) {
    console.error('Error fetching attendance records:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching attendance records',
      error: error.message
    });
  }
});

// GET /api/attendance/academic-info - Get latest academic year and semester
router.get('/academic-info', async (req, res) => {
  try {
    const { client, db } = await getDatabase();

    // Get the latest attendance record to determine current academic year and semester
    const latestRecord = await db.collection('attendance_records')
      .find({})
      .sort({ attendanceDate: -1 })
      .limit(1)
      .toArray();
    
    let latestAcademicYear = '2024/2025';
    let latestSemester = 1;
    
    if (latestRecord.length > 0) {
      // Extract academic year from the date
      const latestDate = latestRecord[0].attendanceDate;
      if (latestDate) {
        const year = latestDate.getFullYear();
        const month = latestDate.getMonth() + 1; // 0-based month
        
        // Determine academic year based on month
        if (month >= 8) { // August onwards is new academic year
          latestAcademicYear = `${year}/${year + 1}`;
        } else { // January to July is previous academic year
          latestAcademicYear = `${year - 1}/${year}`;
        }
        
        // Determine semester based on month
        if (month >= 8 && month <= 12) {
          latestSemester = 1; // First semester: Aug-Dec
        } else if (month >= 1 && month <= 7) {
          latestSemester = 2; // Second semester: Jan-Jul
        }
      }
    }

    await client.close();

    res.json({
      success: true,
      data: {
        academicYear: latestAcademicYear,
        semester: latestSemester
      }
    });

  } catch (error) {
    console.error('Error fetching academic info:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching academic info',
      error: error.message
    });
  }
});

// GET /api/attendance/available-months - Get all available months from attendance data
router.get('/available-months', async (req, res) => {
  try {
    const { client, db } = await getDatabase();

    // Get all unique months from attendance records
    const months = await db.collection('attendance_records')
      .aggregate([
        {
          $group: {
            _id: {
              year: { $year: '$attendanceDate' },
              month: { $month: '$attendanceDate' }
            },
            count: { $sum: 1 }
          }
        },
        {
          $sort: { '_id.year': 1, '_id.month': 1 }
        }
      ])
      .toArray();

    const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 
                       'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

    const availableMonths = months.map(item => ({
      value: monthNames[item._id.month - 1],
      label: monthNames[item._id.month - 1],
      year: item._id.year,
      month: item._id.month,
      count: item.count
    }));

    await client.close();
    res.json({
      success: true,
      data: availableMonths
    });
  } catch (error) {
    console.error('Error fetching available months:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching available months',
      error: error.message
    });
  }
});

// GET /api/attendance/monthly-attendance - Get monthly attendance data for a course
router.get('/monthly-attendance/:courseCode', async (req, res) => {
  const startTime = Date.now();
  try {
    const { courseCode } = req.params;
    const { program, level, academicYear = '2024/2025', semester = 1 } = req.query;
    console.log('🕐 Monthly attendance API started:', { courseCode, program, level });
    
    const { client, db } = await getDatabase();

    // First, find the course to get its ObjectId
    const courseMatchCriteria = { courseCode };
    if (program) courseMatchCriteria.program = program;
    if (level) courseMatchCriteria.level = level;

    const courseStartTime = Date.now();
    const course = await db.collection('courses').findOne(courseMatchCriteria);
    console.log('🕐 Course lookup took:', Date.now() - courseStartTime, 'ms');
    
    if (!course) {
      await client.close();
      return res.json({
        success: true,
        data: []
      });
    }

    // Get monthly attendance data using courseId
    const aggregationStartTime = Date.now();
    console.log('🕐 Starting aggregation for courseId:', course._id);
    
    // Add timeout to the aggregation
    const aggregationPromise = db.collection('attendance_records')
      .aggregate([
        {
          $match: { courseId: course._id }
        },
        {
          $group: {
            _id: {
              year: { $year: '$attendanceDate' },
              month: { $month: '$attendanceDate' }
            },
            totalRecords: { $sum: 1 },
            presentCount: {
              $sum: {
                $cond: [{ $eq: ['$status', 'present'] }, 1, 0]
              }
            },
            absentCount: {
              $sum: {
                $cond: [{ $eq: ['$status', 'absent'] }, 1, 0]
              }
            }
          }
        },
        {
          $sort: { '_id.year': 1, '_id.month': 1 }
        }
      ])
      .toArray();

    // Add 5-second timeout to aggregation
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Aggregation timeout')), 5000)
    );

    const monthlyData = await Promise.race([aggregationPromise, timeoutPromise]);
    
    console.log('🕐 Aggregation took:', Date.now() - aggregationStartTime, 'ms');
    console.log('🕐 Total API time:', Date.now() - startTime, 'ms');

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                       'July', 'August', 'September', 'October', 'November', 'December'];

    const monthlyAttendance = monthlyData.map(item => ({
      month: monthNames[item._id.month - 1],
      monthShort: monthNames[item._id.month - 1].substring(0, 3).toUpperCase(),
      year: item._id.year,
      monthNumber: item._id.month,
      totalRecords: item.totalRecords,
      presentCount: item.presentCount,
      absentCount: item.absentCount,
      attendanceRate: item.totalRecords > 0 ? Math.round((item.presentCount / item.totalRecords) * 100) : 0
    }));

    await client.close();
    res.json({
      success: true,
      data: monthlyAttendance
    });
  } catch (error) {
    console.error('Error fetching monthly attendance:', error);
    
    if (error.message.includes('timeout')) {
      console.warn('⏰ Monthly attendance aggregation timed out, returning empty data');
      await client.close();
      return res.json({
        success: true,
        data: []
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error fetching monthly attendance',
      error: error.message
    });
  }
});

// GET /api/attendance/available-dates - Get all available dates for a specific month
router.get('/available-dates', async (req, res) => {
  try {
    const { month, academicYear, courseCode, program, level } = req.query;
    
    console.log('🔍 Available dates request:', { month, academicYear, courseCode, program, level });
    
    if (!month) {
      return res.status(400).json({
        success: false,
        message: 'Month parameter is required'
      });
    }

    const { client, db } = await getDatabase();

    // Get month number from month name
    const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 
                       'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const monthNumber = monthNames.indexOf(month) + 1;
    
    if (monthNumber === 0) {
      await client.close();
      return res.status(400).json({
        success: false,
        message: 'Invalid month name'
      });
    }

    // Get current year or use academic year
    const currentYear = new Date().getFullYear();
    const year = academicYear ? parseInt(academicYear.split('/')[0]) : currentYear;

    // Create date range for the month in UTC
    const startDate = new Date(Date.UTC(year, monthNumber - 1, 1));
    const endDate = new Date(Date.UTC(year, monthNumber, 0, 23, 59, 59, 999));
    
    console.log('🔍 Date range:', { startDate, endDate, year, monthNumber });

    // Build match query - filter by course if provided
    let matchQuery = {
      attendanceDate: {
        $gte: startDate,
        $lte: endDate
      }
    };

    // If course information is provided, filter by course
    if (courseCode && program && level) {
      const courseQuery = { courseCode, program, level };
      console.log('🔍 Course query for available dates:', courseQuery);
      
      const course = await db.collection('courses').findOne(courseQuery);
      console.log('📚 Found course for available dates:', course ? `${course.program} - ${course.courseCode}` : 'NONE');
      
      if (course) {
        matchQuery.courseId = course._id;
        console.log('🔍 Filtering by courseId:', course._id);
      }
    }

    // Get all unique dates for the specified month
    const dates = await db.collection('attendance_records')
      .aggregate([
        {
          $match: matchQuery
        },
        {
          $group: {
            _id: {
              year: { $year: '$attendanceDate' },
              month: { $month: '$attendanceDate' },
              day: { $dayOfMonth: '$attendanceDate' }
            },
            count: { $sum: 1 }
          }
        },
        {
          $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 }
        }
      ])
      .toArray();

    console.log('🔍 Found dates:', dates);

    const availableDates = dates.map(item => {
      const date = new Date(Date.UTC(item._id.year, item._id.month - 1, item._id.day));
      return {
        value: date.toISOString().split('T')[0], // YYYY-MM-DD format
        label: `${item._id.day}${getOrdinalSuffix(item._id.day)}`, // 3rd, 5th, etc.
        date: date,
        count: item.count
      };
    });

    await client.close();
    res.json({
      success: true,
      data: availableDates
    });
  } catch (error) {
    console.error('Error fetching available dates:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching available dates',
      error: error.message
    });
  }
});

// Helper function to get ordinal suffix (1st, 2nd, 3rd, 4th, etc.)
function getOrdinalSuffix(day) {
  if (day >= 11 && day <= 13) {
    return 'th';
  }
  switch (day % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
}

// ========================================
// STUDENT-FACING ATTENDANCE ENDPOINTS
// ========================================

// GET /api/attendance/student/:studentId - Get attendance data for a specific student
router.get('/student/:studentId', async (req, res) => {
  try {
    const { studentId } = req.params;
    const { academicYear = '2024/2025', semester = 1, program, level } = req.query;

    console.log('🔍 Student attendance request:', { studentId, academicYear, semester, program, level });

    const { client, db } = await getDatabase();

    // Get student information
    const student = await db.collection('studentsNormalized').findOne({ studentId });
    if (!student) {
      await client.close();
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    console.log('📚 Found student:', student.fullName);

    // Get student's courses based on program and level
    const courseQuery = {};
    if (program) courseQuery.program = program;
    if (level) courseQuery.level = level;

    const courses = await db.collection('courses').find(courseQuery).toArray();
    console.log('📚 Found', courses.length, 'courses for student');

    if (courses.length === 0) {
      await client.close();
      return res.json({
        success: true,
        data: {
          student: {
            studentId: student.studentId,
            fullName: student.fullName,
            program: student.program,
            level: student.level
          },
          courses: []
        }
      });
    }

    // Get course IDs for attendance lookup
    const courseIds = courses.map(course => course._id);

    // Get attendance records for this student across all their courses
    const attendanceRecords = await db.collection('attendance_records').find({
      studentId: studentId,
      courseId: { $in: courseIds }
    }).sort({ attendanceDate: -1 }).toArray();

    console.log('📊 Found', attendanceRecords.length, 'attendance records for student');

    // Group attendance by course
    const courseAttendance = {};
    
    courses.forEach(course => {
      courseAttendance[course.courseCode] = {
        courseCode: course.courseCode,
        courseTitle: course.courseTitle,
        program: course.program,
        level: course.level,
        present: 0,
        absent: 0,
        late: 0,
        excused: 0,
        totalSessions: 0,
        attendancePercentage: 0,
        recentRecords: []
      };
    });

    // Process attendance records
    attendanceRecords.forEach(record => {
      const courseCode = record.courseCode;
      if (courseAttendance[courseCode]) {
        courseAttendance[courseCode].totalSessions++;
        
        switch (record.status) {
          case 'present':
            courseAttendance[courseCode].present++;
            break;
          case 'absent':
            courseAttendance[courseCode].absent++;
            break;
          case 'late':
            courseAttendance[courseCode].late++;
            break;
          case 'excused':
            courseAttendance[courseCode].excused++;
            break;
        }

        // Add recent records (last 5 per course)
        if (courseAttendance[courseCode].recentRecords.length < 5) {
          courseAttendance[courseCode].recentRecords.push({
            date: record.attendanceDate,
            status: record.status,
            markedAt: record.markedAt,
            lecturerName: record.lecturerName
          });
        }
      }
    });

    // Calculate attendance percentages
    Object.values(courseAttendance).forEach(course => {
      if (course.totalSessions > 0) {
        const attendedSessions = course.present + course.late + course.excused;
        course.attendancePercentage = Math.round((attendedSessions / course.totalSessions) * 100);
      }
    });

    // Convert to array and sort by course code
    const coursesData = Object.values(courseAttendance).sort((a, b) => 
      a.courseCode.localeCompare(b.courseCode)
    );

    await client.close();

    res.json({
      success: true,
      data: {
        student: {
          studentId: student.studentId,
          fullName: student.fullName,
          program: student.program,
          level: student.level
        },
        courses: coursesData,
        summary: {
          totalCourses: coursesData.length,
          totalSessions: coursesData.reduce((sum, course) => sum + course.totalSessions, 0),
          averageAttendance: coursesData.length > 0 
            ? Math.round(coursesData.reduce((sum, course) => sum + course.attendancePercentage, 0) / coursesData.length)
            : 0
        }
      }
    });

  } catch (error) {
    console.error('Error fetching student attendance:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching student attendance data',
      error: error.message
    });
  }
});

// GET /api/attendance/student/:studentId/courses - Get student's courses with attendance summary
router.get('/student/:studentId/courses', async (req, res) => {
  try {
    const { studentId } = req.params;
    const { academicYear = '2024/2025', semester = 1 } = req.query;

    console.log('🔍 Student courses request:', { studentId, academicYear, semester });

    const { client, db } = await getDatabase();

    // Get student information
    const student = await db.collection('studentsNormalized').findOne({ studentId });
    if (!student) {
      await client.close();
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Get student's courses
    const courses = await db.collection('courses').find({
      program: student.program,
      level: student.level
    }).toArray();

    console.log('📚 Found', courses.length, 'courses for student');

    if (courses.length === 0) {
      await client.close();
      return res.json({
        success: true,
        data: []
      });
    }

    // Get course IDs for attendance lookup
    const courseIds = courses.map(course => course._id);

    // Get attendance records for this student
    const attendanceRecords = await db.collection('attendance_records').find({
      studentId: studentId,
      courseId: { $in: courseIds }
    }).toArray();

    console.log('📊 Found', attendanceRecords.length, 'attendance records');

    // Group attendance by course
    const courseAttendance = {};
    
    courses.forEach(course => {
      courseAttendance[course._id] = {
        courseCode: course.courseCode,
        courseTitle: course.title || course.courseTitle || course.courseCode,
        program: course.program,
        level: course.level,
        present: 0,
        absent: 0,
        totalSessions: 0,
        attendancePercentage: 0
      };
    });

    // Process attendance records
    attendanceRecords.forEach(record => {
      const courseId = record.courseId;
      if (courseAttendance[courseId]) {
        courseAttendance[courseId].totalSessions++;
        
        if (record.status === 'present') {
          courseAttendance[courseId].present++;
        } else if (record.status === 'absent') {
          courseAttendance[courseId].absent++;
        }
      }
    });

    // Calculate attendance percentages
    Object.values(courseAttendance).forEach(course => {
      if (course.totalSessions > 0) {
        course.attendancePercentage = Math.round((course.present / course.totalSessions) * 100);
      }
    });

    // Convert to array and sort by course code
    const coursesData = Object.values(courseAttendance).sort((a, b) => 
      a.courseCode.localeCompare(b.courseCode)
    );

    await client.close();

    res.json({
      success: true,
      data: coursesData
    });

  } catch (error) {
    console.error('Error fetching student courses:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching student courses',
      error: error.message
    });
  }
});

// GET /api/attendance/student/:studentId/history/:courseCode - Get attendance history for a specific course
router.get('/student/:studentId/history/:courseCode', async (req, res) => {
  try {
    const { studentId, courseCode } = req.params;
    const { academicYear = '2024/2025', semester = 1, limit = 50 } = req.query;

    console.log('🔍 Student course history request:', { studentId, courseCode, academicYear, semester });

    const { client, db } = await getDatabase();

    // Get course information
    const course = await db.collection('courses').findOne({ courseCode });
    if (!course) {
      await client.close();
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Get attendance records for this student and course
    const attendanceRecords = await db.collection('attendance_records')
      .find({
        studentId: studentId,
        courseId: course._id
      })
      .sort({ attendanceDate: -1 })
      .limit(parseInt(limit))
      .toArray();

    console.log('📊 Found', attendanceRecords.length, 'attendance records for course');

    // Transform records for frontend
    const history = attendanceRecords.map(record => ({
      date: record.attendanceDate,
      status: record.status,
      markedAt: record.markedAt,
      lecturerName: record.lecturerName,
      location: record.location,
      markingMethod: record.markingMethod,
      notes: record.notes
    }));

    await client.close();

    res.json({
      success: true,
      data: {
        course: {
          courseCode: course.courseCode,
          courseTitle: course.courseTitle,
          program: course.program,
          level: course.level
        },
        history: history,
        summary: {
          totalRecords: attendanceRecords.length,
          presentCount: attendanceRecords.filter(r => r.status === 'present').length,
          absentCount: attendanceRecords.filter(r => r.status === 'absent').length,
          lateCount: attendanceRecords.filter(r => r.status === 'late').length,
          excusedCount: attendanceRecords.filter(r => r.status === 'excused').length
        }
      }
    });

  } catch (error) {
    console.error('Error fetching student course history:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching student course history',
      error: error.message
    });
  }
});

// GET /api/attendance/student/:studentId/weekly - Get weekly attendance summary
router.get('/student/:studentId/weekly', async (req, res) => {
  try {
    const { studentId } = req.params;
    const { courseCode, weeks = 12 } = req.query; // Get last 12 weeks by default

    console.log('🔍 Weekly attendance request:', { studentId, courseCode, weeks });

    const { client, db } = await getDatabase();

    // Get student information
    const student = await db.collection('studentsNormalized').findOne({ studentId });
    if (!student) {
      await client.close();
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // First, find the actual date range in the database for this student
    const dateRange = await db.collection('attendance_records').aggregate([
      { $match: { studentId: studentId } },
      {
        $group: {
          _id: null,
          minDate: { $min: '$attendanceDate' },
          maxDate: { $max: '$attendanceDate' }
        }
      }
    ]).toArray();

    if (dateRange.length === 0) {
      return res.json({
        success: true,
        data: {
          student: student,
          weeklyData: [],
          summary: { totalWeeks: 0, averageAttendance: 0 }
        }
      });
    }

    const { minDate, maxDate } = dateRange[0];
    
    // Calculate date range for the last N weeks from the actual data range
    const endDate = new Date(maxDate);
    const startDate = new Date(maxDate);
    startDate.setDate(endDate.getDate() - (weeks * 7));

    // Build query using the actual date range
    const query = {
      studentId: studentId,
      attendanceDate: {
        $gte: startDate,
        $lte: endDate
      }
    };

    // Add course filter if specified
    if (courseCode) {
      const course = await db.collection('courses').findOne({ courseCode });
      if (course) {
        query.courseId = course._id;
      }
    }

    // Get attendance records
    const attendanceRecords = await db.collection('attendance_records')
      .find(query)
      .sort({ attendanceDate: -1 })
      .toArray();

    console.log('📊 Found', attendanceRecords.length, 'attendance records for weekly analysis');

    // Group by week
    const weeklyData = {};
    
    attendanceRecords.forEach(record => {
      const recordDate = new Date(record.attendanceDate);
      const weekStart = new Date(recordDate);
      weekStart.setDate(recordDate.getDate() - recordDate.getDay()); // Start of week (Sunday)
      weekStart.setHours(0, 0, 0, 0);
      
      const weekKey = weekStart.toISOString().split('T')[0];
      
      if (!weeklyData[weekKey]) {
        weeklyData[weekKey] = {
          weekStart: weekKey,
          weekEnd: new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          courses: {},
          totalPresent: 0,
          totalAbsent: 0,
          totalClasses: 0
        };
      }
      
      // Get course info
      const course = attendanceRecords.find(r => r.courseId && r.courseId.toString() === record.courseId.toString());
      const courseCode = course?.courseCode || 'Unknown';
      
      if (!weeklyData[weekKey].courses[courseCode]) {
        weeklyData[weekKey].courses[courseCode] = {
          courseCode,
          present: 0,
          absent: 0,
          total: 0
        };
      }
      
      weeklyData[weekKey].courses[courseCode].total++;
      weeklyData[weekKey].totalClasses++;
      
      if (record.status === 'present') {
        weeklyData[weekKey].courses[courseCode].present++;
        weeklyData[weekKey].totalPresent++;
      } else if (record.status === 'absent') {
        weeklyData[weekKey].courses[courseCode].absent++;
        weeklyData[weekKey].totalAbsent++;
      }
    });

    // Convert to array and sort by week
    const weeklyArray = Object.values(weeklyData)
      .sort((a, b) => new Date(a.weekStart) - new Date(b.weekStart));

    // Calculate attendance percentages
    weeklyArray.forEach(week => {
      week.attendancePercentage = week.totalClasses > 0 
        ? Math.round((week.totalPresent / week.totalClasses) * 100) 
        : 0;
      
      Object.values(week.courses).forEach(course => {
        course.attendancePercentage = course.total > 0 
          ? Math.round((course.present / course.total) * 100) 
          : 0;
      });
    });

    await client.close();

    res.json({
      success: true,
      data: {
        student: {
          studentId: student.studentId,
          fullName: student.fullName,
          program: student.program,
          level: student.level
        },
        weeklyData: weeklyArray,
        summary: {
          totalWeeks: weeklyArray.length,
          averageAttendance: weeklyArray.length > 0 
            ? Math.round(weeklyArray.reduce((sum, week) => sum + week.attendancePercentage, 0) / weeklyArray.length)
            : 0
        }
      }
    });

  } catch (error) {
    console.error('❌ Weekly attendance error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching weekly attendance data',
      error: error.message
    });
  }
});

// GET /api/attendance/student/:studentId/monthly - Get monthly attendance summary
router.get('/student/:studentId/monthly', async (req, res) => {
  try {
    const { studentId } = req.params;
    const { courseCode, months = 6 } = req.query; // Get last 6 months by default

    console.log('🔍 Monthly attendance request:', { studentId, courseCode, months });

    const { client, db } = await getDatabase();

    // Get student information
    const student = await db.collection('studentsNormalized').findOne({ studentId });
    if (!student) {
      await client.close();
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // First, find the actual date range in the database for this student
    const dateRange = await db.collection('attendance_records').aggregate([
      { $match: { studentId: studentId } },
      {
        $group: {
          _id: null,
          minDate: { $min: '$attendanceDate' },
          maxDate: { $max: '$attendanceDate' }
        }
      }
    ]).toArray();

    if (dateRange.length === 0) {
      return res.json({
        success: true,
        data: {
          student: student,
          monthlyData: [],
          summary: { totalMonths: 0, averageAttendance: 0 }
        }
      });
    }

    const { minDate, maxDate } = dateRange[0];
    
    // Calculate date range for the last N months from the actual data range
    const endDate = new Date(maxDate);
    const startDate = new Date(maxDate);
    startDate.setMonth(endDate.getMonth() - months);

    // Build query using the actual date range
    const query = {
      studentId: studentId,
      attendanceDate: {
        $gte: startDate,
        $lte: endDate
      }
    };

    // Add course filter if specified
    if (courseCode) {
      const course = await db.collection('courses').findOne({ courseCode });
      if (course) {
        query.courseId = course._id;
      }
    }

    // Get attendance records
    const attendanceRecords = await db.collection('attendance_records')
      .find(query)
      .sort({ attendanceDate: -1 })
      .toArray();

    console.log('📊 Found', attendanceRecords.length, 'attendance records for monthly analysis');

    // Group by month
    const monthlyData = {};
    
    attendanceRecords.forEach(record => {
      const recordDate = new Date(record.attendanceDate);
      const monthKey = `${recordDate.getFullYear()}-${String(recordDate.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = {
          month: monthKey,
          monthName: recordDate.toLocaleString('default', { month: 'long', year: 'numeric' }),
          courses: {},
          totalPresent: 0,
          totalAbsent: 0,
          totalClasses: 0
        };
      }
      
      // Get course info
      const course = attendanceRecords.find(r => r.courseId && r.courseId.toString() === record.courseId.toString());
      const courseCode = course?.courseCode || 'Unknown';
      
      if (!monthlyData[monthKey].courses[courseCode]) {
        monthlyData[monthKey].courses[courseCode] = {
          courseCode,
          present: 0,
          absent: 0,
          total: 0
        };
      }
      
      monthlyData[monthKey].courses[courseCode].total++;
      monthlyData[monthKey].totalClasses++;
      
      if (record.status === 'present') {
        monthlyData[monthKey].courses[courseCode].present++;
        monthlyData[monthKey].totalPresent++;
      } else if (record.status === 'absent') {
        monthlyData[monthKey].courses[courseCode].absent++;
        monthlyData[monthKey].totalAbsent++;
      }
    });

    // Convert to array and sort by month
    const monthlyArray = Object.values(monthlyData)
      .sort((a, b) => a.month.localeCompare(b.month));

    // Calculate attendance percentages
    monthlyArray.forEach(month => {
      month.attendancePercentage = month.totalClasses > 0 
        ? Math.round((month.totalPresent / month.totalClasses) * 100) 
        : 0;
      
      Object.values(month.courses).forEach(course => {
        course.attendancePercentage = course.total > 0 
          ? Math.round((course.present / course.total) * 100) 
          : 0;
      });
    });

    await client.close();

    res.json({
      success: true,
      data: {
        student: {
          studentId: student.studentId,
          fullName: student.fullName,
          program: student.program,
          level: student.level
        },
        monthlyData: monthlyArray,
        summary: {
          totalMonths: monthlyArray.length,
          averageAttendance: monthlyArray.length > 0 
            ? Math.round(monthlyArray.reduce((sum, month) => sum + month.attendancePercentage, 0) / monthlyArray.length)
            : 0
        }
      }
    });

  } catch (error) {
    console.error('❌ Monthly attendance error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching monthly attendance data',
      error: error.message
    });
  }
});

export default router;
