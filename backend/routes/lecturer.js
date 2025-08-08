import express from 'express';
import Lecturer from '../models/Lecturer.js';
import CourseCatalog from '../models/CourseCatalog.js';

const router = express.Router();

// GET /api/lecturer/test
router.get('/test', (req, res) => res.json({ message: 'Lecturer route works!' }));

// GET /api/lecturer/:id/details
router.get('/:id/details', async (req, res) => {
  const { id } = req.params;
  
  if (!id) {
    return res.status(400).json({ error: 'Lecturer ID is required.' });
  }
  
  try {
    console.log('Looking for lecturer with ID:', id);
    
    // Find the lecturer
    const lecturer = await Lecturer.findById(id);
    if (!lecturer) {
      return res.status(404).json({ error: 'Lecturer not found.' });
    }
    
    console.log('Found lecturer:', lecturer.name);
    
    // Find all course documents and search through their programs
    const courseDocuments = await CourseCatalog.find({});
    console.log('Found', courseDocuments.length, 'course documents');
    
    // Collect all courses where this lecturer is assigned as examiner
    const allCourses = [];
    
    courseDocuments.forEach(doc => {
      console.log('Processing document for level:', doc.level);
      if (doc.programs) {
        Object.keys(doc.programs).forEach(programName => {
          const courses = doc.programs[programName];
          if (Array.isArray(courses)) {
            courses.forEach(course => {
              console.log('Checking course:', course.COURSE_CODE, 'with examiner IDs:', course.EXAMINER_IDS);
              if (course.EXAMINER_IDS && course.EXAMINER_IDS.includes(id)) {
                console.log('Found matching course:', course.COURSE_CODE);
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
    
    console.log('Total matching courses found:', allCourses.length);
    
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
      
      const courseInfo = {
        code: course.COURSE_CODE,
        title: course.TITLE,
        credit: course.CREDIT || 'N/A',
        role: 'Examiner', // All courses in this structure are examiner roles
        level: course.level // Include the level field
      };
      
      programsMap.get(program).courses.push(courseInfo);
    });
    
    const programs = Array.from(programsMap.values());
    
    return res.json({
      lecturer: {
        id: lecturer._id,
        name: lecturer.name
      },
      programs,
      totalCourses: allCourses.length
    });
    
  } catch (err) {
    console.error('Error fetching lecturer details:', err);
    return res.status(500).json({ error: 'Server error.' });
  }
});

// POST /api/lecturer/validate
router.post('/validate', async (req, res) => {
  const { name, token } = req.body;
  if (!name || !token) {
    return res.status(400).json({ valid: false, error: 'Name and token are required.' });
  }
  try {
    // Find lecturer by token (case-insensitive)
    const lecturer = await Lecturer.findOne({ token: { $regex: `^${token.trim()}$`, $options: 'i' } });
    if (!lecturer) {
      return res.status(404).json({ valid: false, error: 'Lecturer not found or invalid token.' });
    }
    // Helper to normalize names (remove diacritics, hyphens, and other special characters)
    function normalizeName(str) {
      return str
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '') // Remove diacritics
        .replace(/[-_.,'"]/g, ' ') // Replace hyphens, underscores, periods, commas, quotes with spaces
        .replace(/\s+/g, ' ') // Replace multiple spaces with single space
        .trim();
    }
    
    // Check if all entered name words are present in the stored name (case-insensitive, out-of-order, diacritic-insensitive, hyphen-insensitive)
    const enteredWords = normalizeName(name.trim().toLowerCase()).split(/\s+/).filter(Boolean);
    const storedWords = normalizeName(lecturer.name.trim().toLowerCase()).split(/\s+/);
    const allWordsPresent = enteredWords.every(word => storedWords.includes(word));
    if (!allWordsPresent) {
      return res.status(401).json({ valid: false, error: 'Name does not match our records.' });
    }
    return res.json({ valid: true, lecturerId: lecturer._id.toString() });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ valid: false, error: 'Server error.' });
  }
});

export default router; 

