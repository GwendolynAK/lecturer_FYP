import Lecturer from '../models/Lecturer.js';
import CourseCatalog from '../models/CourseCatalog.js';
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

export async function getLecturerProgramsAndCourses(lecturerId) {
  // Find the lecturer
  const lecturer = await Lecturer.findById(lecturerId);
  if (!lecturer) return { programs: [], totalCourses: 0 };

  try {
    // Connect to MongoDB to get semester info from courses collection
    const client = new MongoClient(process.env.MONGO_URI);
    await client.connect();
    const db = client.db(process.env.DB_NAME);

    // Get all courses with semester info
    const coursesWithSemester = await db.collection('courses').find({}).toArray();
    await client.close();

    // Create a map of courseCode + program + level to semester info
    const semesterMap = new Map();
    coursesWithSemester.forEach(course => {
      const key = `${course.courseCode}-${course.program}-${course.level}`;
      semesterMap.set(key, {
        semester: course.semester,
        academicYear: course.academicYear,
        credits: course.credits,
        description: course.description
      });
    });

    // Find all course documents and search through their programs
    const courseDocuments = await CourseCatalog.find({});
    const allCourses = [];

    courseDocuments.forEach(doc => {
      if (doc.programs) {
        Object.keys(doc.programs).forEach(programName => {
          const courses = doc.programs[programName];
          if (Array.isArray(courses)) {
            courses.forEach(course => {
              if (course.EXAMINER_IDS && course.EXAMINER_IDS.includes(lecturerId.toString())) {
                allCourses.push({
                  ...course,
                  program: programName,
                  level: doc.level
                });
              }
            });
          }
        });
      }
    });

    // Group courses by program
    const programsMap = new Map();
    allCourses.forEach(course => {
      const program = course.program || 'Unassigned Program';
      if (!programsMap.has(program)) {
        programsMap.set(program, {
          name: program,
          courses: []
        });
      }
      
      // Get semester info from courses collection
      const key = `${course.COURSE_CODE}-${program}-${course.level}`;
      const semesterInfo = semesterMap.get(key) || {};
      
      const courseInfo = {
        code: course.COURSE_CODE,
        title: course.TITLE,
        credit: course.CREDIT || semesterInfo.credits || 'N/A',
        role: 'Examiner',
        program: course.program,
        level: course.level,
        semester: semesterInfo.semester,
        academicYear: semesterInfo.academicYear,
        description: semesterInfo.description
      };
      
      programsMap.get(program).courses.push(courseInfo);
    });

    const programs = Array.from(programsMap.values());
    return { programs, totalCourses: allCourses.length };
    
  } catch (error) {
    console.error('Error fetching lecturer programs and courses:', error);
    return { programs: [], totalCourses: 0 };
  }
} 
