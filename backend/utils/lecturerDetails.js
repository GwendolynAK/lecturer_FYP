import Lecturer from '../models/Lecturer.js';
import CourseCatalog from '../models/CourseCatalog.js';

export async function getLecturerProgramsAndCourses(lecturerId) {
  // Find the lecturer
  const lecturer = await Lecturer.findById(lecturerId);
  if (!lecturer) return { programs: [], totalCourses: 0 };

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
    // Debug log to verify level is present
    console.log('Backend course before push:', course);
    const program = course.program || 'Unassigned Program';
    if (!programsMap.has(program)) {
      programsMap.set(program, {
        name: program,
        courses: []
      });
    }
    const courseInfo = {
      code: course.COURSE_CODE,
      title: course.TITLE,
      credit: course.CREDIT || 'N/A',
      role: 'Examiner',
      program: course.program, // include program
      level: course.level     // always include level from course object
    };
    programsMap.get(program).courses.push(courseInfo);
  });

  const programs = Array.from(programsMap.values());
  return { programs, totalCourses: allCourses.length };
} 